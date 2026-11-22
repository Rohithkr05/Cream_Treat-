# Cream Treat — Complete Project Audit & Technical Handover Report

**Audit Date:** 2026-11-11  
**Workspace Audited:** `d:\new cream treat\Cream_Treat-main`  
**Audit Scope:** Full static code inspection, configuration/dependency audit, read-only Git/timestamp inspection, and non-destructive lint/typecheck/unit-test verification against the current codebase on disk.  
**Important Scope Notice:** No live MongoDB instance, seed script, production build (`nest build` / `next build`), browser session, or physical phone camera test was executed during this audit. All live runtime behaviors outside mocked unit tests are documented from source inspection and explicitly flagged under **Unverified Areas**.

---

## 1. Project Overview and Architecture

### What Cream Treat Is & Problem It Solves
**Cream Treat** is a dine-in café QR code food ordering and kitchen/counter management web application designed for single-venue restaurant operations (specifically seeded for the Cream Treat dessert, beverage, and savoury café menu in INR). Instead of requiring printed paper menus or manual waiter order-taking at every table, physical QR code standees placed at tables encode table-specific URLs (`/order?table=<n>`). Customers scan the standee with a smartphone camera, browse the menu without creating an account, manage a local cart, submit orders directly to the backend, and track kitchen status updates on a confirmation page. Staff manage incoming orders, menu catalog availability/pricing, and table QR standees through an authenticated `/admin` portal.

### System Users
1. **Dine-In Customers (Unauthenticated):** Access [`Home`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/page.tsx) (`/`), [`OrderPage`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/order/page.tsx) (`/order?table=<n>`), [`CartPage`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/cart/page.tsx) (`/cart`), and [`OrderSuccessPage`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/order-success/page.tsx) (`/order-success?orderId=<id>`) with no login or customer accounts.
2. **Restaurant Admin / Counter Staff (Authenticated via JWT):** Log in at [`AdminLoginPage`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/login/page.tsx) (`/admin/login`) and operate `/admin`, `/admin/orders/[id]`, `/admin/menu`, and `/admin/qr`.

### Complete Customer Workflow (As Currently Implemented)
1. **QR Scan / Entry:** Customer scans a table standee (`<BASE_URL>/order?table=5`) or visits `/`. Both `/` and `/order` render `OrderPage`. [`parseTableUrlParam`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/qr.ts#L98-L130) validates whole integers `1–999` and persists the table number via [`CartProvider`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/context/CartContext.tsx#L32-L206) (`localStorage`). Customers can also edit the table number in [`Navbar`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/Navbar.tsx) or at checkout.
2. **Menu Browsing:** On mount, `/order` fetches `GET /menu/categories` and `GET /menu/items`, then passes `foodItems` into [`buildHydratedSections`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuMapper.ts#L35-L122). Crucially, `buildHydratedSections` iterates strictly over the static 6-section / 59-item [`MENU_SECTIONS`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuData.ts#L36) catalog, matching backend items by normalized name and falling back to synthetic `_id: "client_<key>"` items if the API fails, is still loading, or does not match an item name.
3. **Cart & Checkout:** Customers add/adjust quantities via [`AddControl`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/AddControl.tsx) and open either [`CartDrawer`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CartDrawer.tsx) (triggered by [`CartBottomBar`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CartBottomBar.tsx) on `/order`) or `/cart`. On submission, the frontend calls `POST /orders` with `{ tableNumber, items: [{ foodItemId, quantity }] }`. Note that orders containing synthetic `client_*` IDs fail DTO validation (`400 Bad Request`).
4. **Order Persistence & Confirmation:** [`OrdersService.create`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.ts#L139-L227) recalculates item totals strictly from MongoDB `FoodItem` prices, assigns an atomic `Asia/Kolkata` daily order number (`#001`, `#002`, ...), saves the order as `NEW`, emits `order.created` to Socket.IO room `admin-orders`, and returns the serialized order. The frontend saves `cream_treat_last_order` in `sessionStorage`, clears the cart (keeping `tableNumber`), and navigates to `/order-success?orderId=<id>`.
5. **Order Tracking:** `/order-success` fetches `GET /orders/:id` directly by URL `orderId`, subscribes to Socket.IO room `order:<id>` via `subscribe_order` (no JWT), listens for `order.status.updated`, and also polls `GET /orders/:id` every 5 seconds until `COMPLETED` or `CANCELLED`. Its visual timeline currently displays only **2 stages** (`NEW` and `ACCEPTED`, collapsing `ACCEPTED`/`PREPARING`/`READY`/`COMPLETED` into step index `1`).

### Complete Admin Workflow (As Currently Implemented)
1. **Authentication:** Staff sign in at `/admin/login` (`POST /auth/admin/login`). The frontend stores the JWT and profile in `sessionStorage` (`ct_admin_access_token`, `ct_admin_user`) and verifies sessions on protected pages with `GET /auth/admin/me`.
2. **Live Orders Dashboard (`/admin`):** [`AdminDashboardPage`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/page.tsx) fetches `GET /admin/orders?page=1&limit=50` (and optional `status` filter), polls every 10 seconds, and connects to Socket.IO via `createOrderSocket()` **without passing the admin JWT token**, leaving real-time `admin-orders` room notifications broken on `/admin` and making the dashboard reliant on polling. Status filters only expose `ALL`, `NEW`, `ACCEPTED`, and `CANCELLED`; order cards only expose **Accept Order** (`NEW -> ACCEPTED`) and **Cancel** (`NEW | ACCEPTED -> CANCELLED`).
3. **Order Detail (`/admin/orders/[id]`):** [`AdminOrderDetailsPage`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/orders/%5Bid%5D/page.tsx) connects Socket.IO **with** the admin JWT token (`createOrderSocket(token)`), updates `order.status.updated` in real time, and lets staff **Accept Order** (`NEW -> ACCEPTED`) or **Cancel Order** (`NEW | ACCEPTED -> CANCELLED`). Although the backend supports `PREPARING`, `READY`, and `COMPLETED`, neither `/admin` nor `/admin/orders/[id]` exposes UI buttons for those transitions.
4. **Menu Management (`/admin/menu`):** [`AdminMenuPage`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/menu/page.tsx) manages categories (`GET/POST/PATCH/DELETE /admin/categories`) and food items (`GET/POST/PATCH/DELETE /admin/items`, availability toggles, search/category filters). Prices are displayed/edited rounded to whole rupees rather than fractional paise, and the create/edit item modal has no image preview.
5. **QR Standees (`/admin/qr`):** [`AdminQRPage`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/qr/page.tsx) renders printable and downloadable (`800x1100` PNG via Canvas + `qrcode`) standee cards for tables `1..N` (validated `1–100`) purely client-side, with no database table collection.

### High-Level Architecture
Cream Treat is a two-tier decoupled monorepo (`frontend/` + `backend/`) backed by MongoDB:

```text
+-----------------------------------+        REST (HTTP JSON, port 3001)        +------------------------------------+
| Next.js 16 App Router (port 3000) | <---------------------------------------> | NestJS 12 REST API (0.0.0.0:3001)  |
| - Customer: /, /order, /cart,     |                                           | - AuthModule (/auth/admin/*)       |
|   /order-success                  |        Socket.IO 4.8.4 (port 3001)        | - MenuModule (/menu/*, /admin/*)   |
| - Admin: /admin/*                 | <=======================================> | - OrdersModule (/orders,           |
| - State: CartContext (localStor.) |   ws/polling; rooms: admin-orders,        |   /admin/orders, OrdersGateway)    |
|   Admin JWT (sessionStorage)      |   order:<orderId>                         | - AppModule (/ , /health)          |
+-----------------------------------+                                           +-----------------+------------------+
                                                                                                  | Mongoose 9.11.2
                                                                                                  v
                                                                                +------------------------------------+
                                                                                | MongoDB (Database: cream-treat)    |
                                                                                | admins, categories, fooditems,     |
                                                                                | orders, ordercounters              |
                                                                                +------------------------------------+
```

---

## 2. Complete Folder and File Structure

Excluding generated dependency/build directories (`node_modules/`, `backend/dist/`, `frontend/.next/`), the repository contains **186 files** (plus `backend/dist/` containing **126 compiled JS/d.ts/map files** across 18 top-level build entries; `frontend/.next/` is not present).

### Root Directory (`d:\new cream treat\Cream_Treat-main`)
- [`.gitignore`](file:///d:/new%20cream%20treat/Cream_Treat-main/.gitignore) — Ignores `node_modules/`, `dist/`, `.next/`, `out/`, `.env*` (preserving `*.env.example`), logs, OS/IDE files, `coverage/`, `*.tsbuildinfo`, and root `/menu/`.
- [`CREAM_TREAT_COMPLETE_PROJECT_REPORT.md`](file:///d:/new%20cream%20treat/Cream_Treat-main/CREAM_TREAT_COMPLETE_PROJECT_REPORT.md) — Target comprehensive engineering audit report (this file).
- [`README.md`](file:///d:/new%20cream%20treat/Cream_Treat-main/README.md) — Project documentation and historical Phase 1–18 checklist (`14,336 B`).
- [`start.bat`](file:///d:/new%20cream%20treat/Cream_Treat-main/start.bat) — Windows Batch launcher: ensures `MongoDB` Windows service is running, starts `node dist\main.js` (backend) and `npm run dev` (frontend). Modified `2026-11-07T13:21:29Z`.
- [`start.ps1`](file:///d:/new%20cream%20treat/Cream_Treat-main/start.ps1) — PowerShell launcher with equivalent startup flow (`2026-11-06T13:43:28Z`).

### Backend Structure (`backend/`)
- Config & Build Files:
  - [`backend/package.json`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/package.json), [`backend/package-lock.json`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/package-lock.json)
  - [`backend/tsconfig.json`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/tsconfig.json), [`backend/tsconfig.build.json`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/tsconfig.build.json), `backend/tsconfig.build.tsbuildinfo`
  - [`backend/nest-cli.json`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/nest-cli.json), [`backend/oxlint.json`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/oxlint.json), `backend/.prettierrc`, [`backend/.gitignore`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/.gitignore), [`backend/README.md`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/README.md)
  - [`backend/vitest.config.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/vitest.config.ts), [`backend/vitest.config.e2e.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/vitest.config.e2e.ts)
  - [`backend/.env.example`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/.env.example), [`backend/.env`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/.env) *(untracked runtime env; contains credentials — values redacted)*
  - `backend/out.txt`, `backend/err.txt` *(0-byte log artifacts from `2026-11-07T13:18:39Z`)*
- Core Bootstrap (`backend/src/`):
  - [`main.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/main.ts) — NestJS bootstrap, `ValidationPipe`, CORS origin policy, binds `0.0.0.0:3001`.
  - [`app.module.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/app.module.ts) — Root module importing `ConfigModule`, `DatabaseModule`, `AuthModule`, `MenuModule`, `OrdersModule`.
  - [`app.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/app.controller.ts), [`app.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/app.service.ts), [`app.controller.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/app.controller.spec.ts) — Root `/` banner and `/health` MongoDB readiness check (`200` / `503`).
  - `backend/src/admin/.gitkeep` *(empty placeholder directory)*
- Auth Module (`backend/src/auth/`):
  - `.gitkeep`, [`auth.module.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.module.ts), [`auth.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.controller.ts), [`auth.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.service.ts)
  - [`auth.controller.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.controller.spec.ts), [`auth.service.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.service.spec.ts)
  - `dto/`: [`login-admin.dto.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/dto/login-admin.dto.ts)
  - `guards/`: [`jwt-auth.guard.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/guards/jwt-auth.guard.ts)
  - `interfaces/`: [`jwt-payload.interface.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/interfaces/jwt-payload.interface.ts)
  - `schemas/`: [`admin.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/schemas/admin.schema.ts)
  - `strategies/`: [`jwt.strategy.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/strategies/jwt.strategy.ts)
- Common (`backend/src/common/`):
  - `.gitkeep`, [`config/env.validation.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/common/config/env.validation.ts), [`pipes/parse-object-id.pipe.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/common/pipes/parse-object-id.pipe.ts)
- Database & Seed Scripts (`backend/src/database/`):
  - [`database.module.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/database/database.module.ts) — `MongooseModule.forRootAsync`, `sanitizeMongoUri`, `lazyConnection: true`.
  - [`schemas.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/database/schemas.spec.ts) — Schema index/validation unit tests.
  - [`seed.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/database/seed.ts) — Idempotent admin account seed CLI (`npm run seed`).
  - [`seed-menu.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/database/seed-menu.ts) — Menu seed CLI (`npm run seed:menu`, 6 categories / 59 items).
- Menu Module (`backend/src/menu/`):
  - `.gitkeep`, [`menu.module.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/menu.module.ts), [`menu.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/menu.controller.ts), [`admin-menu.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/admin-menu.controller.ts)
  - [`categories.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/categories.service.ts), [`food-items.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/food-items.service.ts)
  - [`menu.controller.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/menu.controller.spec.ts), [`menu.service.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/menu.service.spec.ts), [`menu-management.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/menu-management.spec.ts)
  - `dto/`: [`create-category.dto.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/dto/create-category.dto.ts), [`update-category.dto.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/dto/update-category.dto.ts), [`create-food-item.dto.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/dto/create-food-item.dto.ts), [`update-food-item.dto.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/dto/update-food-item.dto.ts), [`query-food-items.dto.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/dto/query-food-items.dto.ts)
  - `schemas/`: [`category.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/schemas/category.schema.ts), [`food-item.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/schemas/food-item.schema.ts)
- Orders Module (`backend/src/orders/`):
  - `.gitkeep`, [`orders.module.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.module.ts), [`orders.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.controller.ts), [`admin-orders.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/admin-orders.controller.ts)
  - [`orders.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.ts), [`orders.gateway.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.gateway.ts)
  - [`orders.controller.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.controller.spec.ts), [`admin-orders.controller.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/admin-orders.controller.spec.ts), [`orders.service.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.spec.ts), [`orders.gateway.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.gateway.spec.ts)
  - `dto/`: [`create-order.dto.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/dto/create-order.dto.ts), [`create-order-item.dto.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/dto/create-order-item.dto.ts), [`update-order-status.dto.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/dto/update-order-status.dto.ts), [`admin-order-query.dto.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/dto/admin-order-query.dto.ts)
  - `schemas/`: [`order.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/schemas/order.schema.ts), [`order-item.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/schemas/order-item.schema.ts), [`order-counter.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/schemas/order-counter.schema.ts)
- QR Helper (`backend/src/qr/`):
  - `.gitkeep`, [`qr.helper.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/qr/qr.helper.ts), [`qr.helper.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/qr/qr.helper.spec.ts)
- Backend E2E Tests (`backend/test/`):
  - [`app.e2e-spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/test/app.e2e-spec.ts), [`menu-management.e2e-spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/test/menu-management.e2e-spec.ts)

### Frontend Structure (`frontend/`)
- Config & Meta:
  - [`frontend/package.json`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/package.json), [`frontend/package-lock.json`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/package-lock.json)
  - [`frontend/next.config.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/next.config.ts), [`frontend/tsconfig.json`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/tsconfig.json), [`frontend/eslint.config.mjs`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/eslint.config.mjs)
  - [`frontend/.gitignore`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/.gitignore), [`frontend/AGENTS.md`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/AGENTS.md), [`frontend/README.md`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/README.md)
  - [`frontend/.env.example`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/.env.example), [`frontend/.env`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/.env), [`frontend/.env.local`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/.env.local)
- App Router Pages (`frontend/app/`):
  - [`layout.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/layout.tsx), [`globals.css`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/globals.css), [`page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/page.tsx), `favicon.ico`
  - [`order/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/order/page.tsx)
  - [`cart/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/cart/page.tsx)
  - [`order-success/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/order-success/page.tsx)
  - [`admin/login/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/login/page.tsx)
  - [`admin/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/page.tsx)
  - [`admin/orders/[id]/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/orders/%5Bid%5D/page.tsx)
  - [`admin/menu/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/menu/page.tsx)
  - [`admin/qr/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/qr/page.tsx)
- Components (`frontend/components/`, plus `.gitkeep`):
  - Active Customer UI: [`AddControl.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/AddControl.tsx), [`CartBottomBar.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CartBottomBar.tsx), [`CartDrawer.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CartDrawer.tsx), [`CartItem.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CartItem.tsx), [`CategoryNav.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CategoryNav.tsx), [`CocoaPodWatermark.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CocoaPodWatermark.tsx), [`FeaturedPhotoGrid.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/FeaturedPhotoGrid.tsx), [`MenuSkeleton.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/MenuSkeleton.tsx), [`Navbar.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/Navbar.tsx), [`TypographicItemList.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/TypographicItemList.tsx)
  - Active Admin UI: [`AdminLayout.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/AdminLayout.tsx), [`TableQRCard.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/TableQRCard.tsx), [`TableQRCode.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/TableQRCode.tsx)
  - Legacy / Unused Components: [`CategoryBar.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CategoryBar.tsx), [`FoodCard.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/FoodCard.tsx) *(verified unimported anywhere in `frontend/`)*
- Context, Hooks, Lib, Types:
  - [`frontend/context/CartContext.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/context/CartContext.tsx)
  - [`frontend/hooks/.gitkeep`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/hooks/.gitkeep), [`frontend/hooks/useCart.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/hooks/useCart.ts)
  - [`frontend/lib/.gitkeep`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/.gitkeep), [`api.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/api.ts), [`menuData.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuData.ts), [`menuMapper.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuMapper.ts), [`qr.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/qr.ts), [`qr.test.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/qr.test.ts), [`socket.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/socket.ts)
  - [`frontend/types/.gitkeep`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/types/.gitkeep), [`admin.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/types/admin.ts), [`menu.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/types/menu.ts)
- Static Assets (`frontend/public/`):
  - `frontend/public/menu/` — `22` `.jpg` food photos (`banana-split.jpg` through `veg-grilled-sandwich.jpg`)
  - `frontend/public/images/` — `23` `.jpg` files (`cream-treat-logo.jpg` + exact SHA-256 duplicates of all `22` food photos)
  - `frontend/public/logo.jpg` — SHA-256 identical copy of `cream-treat-logo.jpg` (`15,907 B`)
  - Unused Next starter SVGs: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`

---

## 3. Technology Stack with Versions

All versions below are verified from [`backend/package.json`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/package.json), `backend/package-lock.json`, [`frontend/package.json`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/package.json), and `frontend/package-lock.json`.

| Layer | Technology / Library | Resolved Version (Lockfile) | Package Declaration (`package.json`) | Notes |
| --- | --- | --- | --- | --- |
| **Backend Runtime / Lang** | Node.js / TypeScript | TS `6.0.3` (`v24.16.0` Node observed) | `"typescript": "^6.0.3"` | ESM (`"type": "module"`, `nodenext`) |
| **Backend Framework** | NestJS (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) | `12.1.3` | `^12.0.0` | Express v5 (`@types/express` `5.0.6`) |
| **Database / ODM** | MongoDB / Mongoose / `@nestjs/mongoose` | Mongoose `9.11.2`, Nest Mongoose `12.0.0` | `^9.11.2` / `^12.0.0` | Local Windows `MongoDB` service assumed |
| **Backend Config & Validation** | `@nestjs/config`, `class-validator`, `class-transformer` | `12.0.1` / `0.15.1` / `0.5.1` | `^12.0.1` / `^0.15.1` / `^0.5.1` | Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) |
| **Authentication & Security** | `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt` | `12.0.3`, `12.0.0`, `0.7.0`, `4.0.1`, `6.0.0` | `^12.0.3`, `^12.0.0`, `^0.7.0`, `^4.0.1`, `^6.0.0` | Password hashing cost factor `10` |
| **Backend Real-Time** | `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` | `12.1.3`, `12.1.3`, `4.8.4` | `^12.0.0`, `^12.0.0`, `^4.8.4` | Runs on API HTTP server port `3001` |
| **Backend Testing & Lint** | `vitest`, `@vitest/coverage-v8`, `supertest`, `@nestjs/testing`, `oxlint`, `prettier` | `4.1.11`, `4.1.11`, `7.3.1`, `12.1.3`, `1.88.0`, `3.9.10` | `^4.1.11` etc. | `@types/supertest` `7.2.1` (`supertest/types` causes `TS2307`) |
| **Frontend Framework / Lang** | Next.js / React / React DOM / TypeScript | Next `16.4.0`, React `19.3.0`, TS `5.9.3` | `16.4.0`, `19.3.0`, `^5` | Next App Router (`frontend/.env` + `next.config.ts`) |
| **Frontend Styling & Icons** | Tailwind CSS + `@tailwindcss/turbopack`, `lucide-react` | `4.3.3` / `1.56.0` | `^4`, `^1.56.0` | Google Fonts (`Syne` + `DM Sans`) loaded in `layout.tsx` |
| **Frontend Real-Time & HTTP** | Native `fetch` API / `socket.io-client` | `4.8.4` | `^4.8.4` | Centralized in `frontend/lib/api.ts` & `socket.io-client` |
| **QR Generation** | `qrcode` (`@types/qrcode`) | `1.5.4` (`1.5.6`) | `^1.5.4` (`^1.5.6`) | Client-side Canvas & PNG DataURL standee export |
| **Image Handling** | `next/image` (`<Image>`), HTML5 `<canvas>` | Next `16.4.0` built-in | Built-in | Static `/public/images/*` & `/public/menu/*`; no file upload backend |
| **Frontend Test & Lint** | `node --test` (`lib/qr.test.ts`), ESLint + `eslint-config-next` | ESLint `9.39.5`, config `16.4.0` | `^9`, `16.4.0` | `frontend/test` runs 12 pure unit tests on `qr.ts` |
| **Deployment Tooling** | `@nestjs/cli` (`12.0.8`), `@nestjs/mau` (`0.2.8`), `start.bat`, `start.ps1` | — | DevDep `@nestjs/mau` | No Dockerfile, CI/CD, PM2, or reverse proxy config present |

---

## 4. Complete Customer Feature Documentation

### Status Summary Table

| Feature | Classification | Key Implementation Files |
| --- | --- | --- |
| Table QR URL Detection (`?table=`) | **IMPLEMENTED AND VERIFIED** (logic unit-tested; live browser unverified) | [`qr.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/qr.ts), [`CartContext.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/context/CartContext.tsx), [`order/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/order/page.tsx) |
| Manual Table Editing Badge | **IMPLEMENTED BUT NOT VERIFIED** | [`Navbar.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/Navbar.tsx), [`CartDrawer.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CartDrawer.tsx), [`cart/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/cart/page.tsx) |
| Digital Menu & Category Navigation | **PARTIALLY IMPLEMENTED** (driven by static `MENU_SECTIONS`; ignores custom DB categories/items; ESLint error) | [`order/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/order/page.tsx), [`menuMapper.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuMapper.ts), [`menuData.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuData.ts), [`CategoryNav.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CategoryNav.tsx) |
| Search Filtering | **IMPLEMENTED BUT NOT VERIFIED** (client-side string filter across hydrated sections; hero dish stays visible) | [`order/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/order/page.tsx), [`menuMapper.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuMapper.ts) |
| Food Photographs & Grid | **IMPLEMENTED BUT NOT VERIFIED** (static `/images/*.jpg` rather than dynamic DB `imageUrl`) | [`FeaturedPhotoGrid.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/FeaturedPhotoGrid.tsx), [`menuData.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuData.ts) |
| Cart (Add, Stepper, Remove, Clear) | **IMPLEMENTED BUT NOT VERIFIED** (uses `localStorage`; ESLint `set-state-in-effect` errors) | [`CartContext.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/context/CartContext.tsx), [`AddControl.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/AddControl.tsx), [`CartItem.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CartItem.tsx), [`CartBottomBar.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CartBottomBar.tsx) |
| Checkout & Order Creation | **PARTIALLY IMPLEMENTED** (works with valid MongoDB IDs, but synthetic `client_*` fallback IDs fail `POST /orders` with `400`; hardcoded hero/footer copy) | [`CartDrawer.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CartDrawer.tsx), [`cart/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/cart/page.tsx), [`orders.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.controller.ts), [`orders.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.ts) |
| Order Success & Live Order Tracking | **PARTIALLY IMPLEMENTED** (Socket.IO + 5s polling implemented, but timeline stops at 2 stages `NEW`/`ACCEPTED`, omitting `PREPARING`/`READY`/`COMPLETED`) | [`order-success/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/order-success/page.tsx), [`orders.gateway.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.gateway.ts) |
| Mobile Responsiveness | **IMPLEMENTED BUT NOT VERIFIED** (Tailwind responsive grids, bottom sheet drawer, `min-h-[44px]` buttons; no live device test run) | [`order/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/order/page.tsx), [`AddControl.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/AddControl.tsx), [`CartDrawer.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CartDrawer.tsx) |

### Detailed Customer Feature Breakdown

1. **QR Scanning & Table Number Detection (`VALID` / `INVALID` / `MISSING`)**
   - **What it does & how it works:** [`OrderPage`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/order/page.tsx) reads `?table=` via Next `useSearchParams()` and passes it to [`parseTableUrlParam`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/qr.ts#L98-L130). Valid integers (`1–999`) update [`CartContext`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/context/CartContext.tsx) (`cream_treat_table_v1` in `localStorage`). Invalid values trigger a dismissible amber banner while preserving any previously stored table number. Customers can change the table at any time from [`Navbar`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/Navbar.tsx) or enter it inline during checkout if missing.
   - **Files / API / DB:** Frontend-only until `POST /orders` (`tableNumber: 1..999`); no backend `tables` collection exists.
   - **Limitations:** Does not verify against a list of restaurant table numbers (table `999` is valid even if only 10 standees exist).

2. **Customer Editorial Menu, Categories, Search & Photographs**
   - **What it does & how it works:** Renders an alternating burgundy (`#6A0019`) / off-white (`#FBF7F2`) magazine-style single-page menu. Sticky [`CategoryNav`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CategoryNav.tsx) scrolls smoothly between sections using `MENU_SECTIONS`. Each section shows a heading, tagline, subtle [`CocoaPodWatermark`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CocoaPodWatermark.tsx), `2x2` [`FeaturedPhotoGrid`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/FeaturedPhotoGrid.tsx) cards, and [`TypographicItemList`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/TypographicItemList.tsx) dotted-leader rows. An inline search bar filters hydrated items by `name` and `description`.
   - **API & Database Integration:** Calls `GET /menu/categories` and `GET /menu/items` in parallel via [`fetchCategories`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/api.ts#L76) and [`fetchFoodItems`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/api.ts#L105). However, `categories` state and `errorMessage` state in `order/page.tsx` are never rendered (`@typescript-eslint/no-unused-vars`), and `buildHydratedSections` only iterates static `MENU_SECTIONS`, substituting `_id: "client_<key>"` for unlinked items.
   - **Known Limitations:**
     - **Static structure locks out admin edits:** New categories (e.g., a 7th category), renamed items not covered by [`normalizeName`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuMapper.ts#L23-L30), or admin-added `imageUrl` values on typographic-only items do not render on `/order`.
     - **Offline/unlinked checkout failure:** Synthetic `client_*` items are addable to the cart and fail `POST /orders` validation (`400 Bad Request`) because `@IsMongoId` rejects `"client_..."`.
     - **Hardcoded hero & unfinished footer:** Hero featured card (`order/page.tsx` ~L280–303) hardcodes *"Chocolava cake sundae"* (`₹160`), and the footer (~L507–550) contains literal placeholder text (`[WHATSAPP LINK]`, `[ADDRESS]`, `[OPENING HOURS]`, `[PHONE/WHATSAPP]`, `[INSTAGRAM]`).
     - **Unused legacy components:** `CategoryBar.tsx` and `FoodCard.tsx` remain unreferenced on disk.

3. **Cart State, Checkout, Order Creation & Order Tracking**
   - **What it does & how it works:** [`CartContext`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/context/CartContext.tsx) manages `items` and `tableNumber` in `localStorage` (`cream_treat_cart_v1`, `cream_treat_table_v1`), calculating `totalItemCount` and `totalAmountPaise`. [`CartDrawer`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CartDrawer.tsx) and [`CartPage`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/cart/page.tsx) both submit `createOrder({ tableNumber, items })`, save `cream_treat_last_order` in `sessionStorage`, clear `items` (retaining `tableNumber`), and route to `/order-success?orderId=<id>`.
   - **Database & API:** `POST /orders` -> `OrdersService.create` -> `OrderCounter` atomic `$inc` + `Order` save -> `OrdersGateway.emitOrderCreated`. Then `/order-success` calls `GET /orders/:id`, emits `subscribe_order`, and polls every 5s.
   - **Known Limitations:**
     - `/cart` validates item totals locally in rupees (`Math.round(price / 100)`) via `CartItem` / `CartDrawer`, while backend sums integer paise (`priceSnapshot * quantity`).
     - `cream_treat_last_order` in `sessionStorage` is written on checkout but never read by `/order-success` (which always fetches from `GET /orders/:id`).
     - `/order-success` `ORDER_TIMELINE` only defines 2 visible steps (`NEW`: *"Order Placed"*, `ACCEPTED`: *"Order Accepted"*), and `STATUS_ORDER` maps `ACCEPTED`, `PREPARING`, `READY`, and `COMPLETED` all to index `1`, masking later kitchen progress if triggered via API.
     - React 19 ESLint rule `react-hooks/set-state-in-effect` fails on `CartContext.tsx`, `order/page.tsx`, `cart/page.tsx`, and `order-success/page.tsx`.

---

## 5. Complete Admin Feature Documentation

### Status Summary Table

| Feature | Classification | Key Implementation Files |
| --- | --- | --- |
| Admin Login (`/admin/login`) | **IMPLEMENTED AND VERIFIED** (backend unit tests pass; live UI unverified) | [`login/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/login/page.tsx), [`auth.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.controller.ts), [`auth.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.service.ts) |
| Auth Guard & Session Verification | **PARTIALLY IMPLEMENTED** (`JwtAuthGuard` works, but JWT fallback secret exists & logout does not revoke tokens) | [`jwt-auth.guard.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/guards/jwt-auth.guard.ts), [`jwt.strategy.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/strategies/jwt.strategy.ts), [`api.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/api.ts) |
| Admin Layout & Navigation | **IMPLEMENTED BUT NOT VERIFIED** (responsive desktop sidebar + mobile bottom bar) | [`AdminLayout.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/AdminLayout.tsx) |
| Live Orders Dashboard (`/admin`) | **PARTIALLY IMPLEMENTED** (Socket.IO connects **without token** so real-time room fails; missing `PREPARING`/`READY`/`COMPLETED` filters & actions; counts capped at page 1 limit `50`) | [`admin/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/page.tsx), [`admin-orders.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/admin-orders.controller.ts) |
| Order Detail Page (`/admin/orders/[id]`) | **PARTIALLY IMPLEMENTED** (Socket.IO passes token correctly, but UI only allows `Accept` & `Cancel`; `COMPLETED` modal is unreachable dead code) | [`admin/orders/[id]/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/orders/%5Bid%5D/page.tsx), [`orders.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.ts) |
| Accept Order (`NEW -> ACCEPTED`) | **IMPLEMENTED BUT NOT VERIFIED** (backend verified via mocked unit tests; UI wired) | [`admin/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/page.tsx), [`admin/orders/[id]/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/orders/%5Bid%5D/page.tsx) |
| Start Preparing (`ACCEPTED -> PREPARING`) | **PARTIALLY IMPLEMENTED** (backend state machine & API ready; **NOT IMPLEMENTED** in Admin UI) | [`orders.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.ts) |
| Mark Ready (`PREPARING -> READY`) | **PARTIALLY IMPLEMENTED** (backend state machine & API ready; **NOT IMPLEMENTED** in Admin UI) | [`orders.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.ts) |
| Complete Order (`READY -> COMPLETED`) | **PARTIALLY IMPLEMENTED** (backend ready; **BROKEN / UNREACHABLE** in UI — `confirmModal` case exists in `orders/[id]/page.tsx` with no trigger) | [`orders.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.ts), [`admin/orders/[id]/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/orders/%5Bid%5D/page.tsx) |
| Cancel Order (`NEW\|ACCEPTED -> CANCELLED`) | **PARTIALLY IMPLEMENTED** (`NEW\|ACCEPTED` wired in UI; backend also allows `PREPARING -> CANCELLED`, unreachable in UI) | [`admin/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/page.tsx), [`admin/orders/[id]/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/orders/%5Bid%5D/page.tsx) |
| Category & Food Item Management (`/admin/menu`) | **PARTIALLY IMPLEMENTED** (CRUD works against backend, but paise/rupees rounding loses sub-rupee precision, delete modal copy contradicts backend soft-deactivation, no image preview in modals) | [`admin/menu/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/menu/page.tsx), [`admin-menu.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/admin-menu.controller.ts) |
| Image Previews (`/admin/menu`) | **PARTIALLY IMPLEMENTED** (table thumbnail renders raw `<Image>` without `onError` fallback; create/edit item form has **no preview**) | [`admin/menu/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/menu/page.tsx) |
| QR Generation, Print & PNG Download (`/admin/qr`) | **IMPLEMENTED BUT NOT VERIFIED** (`1–100` tables, Canvas standee PNG download, `window.print()`, LAN tip UI; browser download/print unverified) | [`admin/qr/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/qr/page.tsx), [`TableQRCard.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/TableQRCard.tsx), [`TableQRCode.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/TableQRCode.tsx) |

### Detailed Admin Feature Notes
- **Authentication Flow:** All admin pages call [`getAdminToken()`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/api.ts#L265) + [`adminGetProfile()`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/api.ts#L344) on mount and redirect to `/admin/login` on error (`401`/`403` clears `sessionStorage`). Note `admin/menu/page.tsx` calls `adminLogout()` synchronously without `await` inside `handleLogout`.
- **Dashboard & Status Workflow Discrepancy:** While [`ALLOWED_STATUS_TRANSITIONS`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.ts#L77-L84) defines a 6-state machine (`NEW -> ACCEPTED -> PREPARING -> READY -> COMPLETED`, plus `CANCELLED` from `NEW`, `ACCEPTED`, or `PREPARING`), the frontend dashboard simplifies orders into **two interactive outcomes**: Accept (`ACCEPTED`) or Cancel (`CANCELLED`). Notice also `/admin` queries only page `1` with `limit: 50` and computes the `NEW` / `ACCEPTED` / `CANCELLED` summary pills strictly from that `50`-row slice rather than server-side totals across all pages.
- **Menu Admin Modal Precision & Messaging Bugs:** In [`admin/menu/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/menu/page.tsx), prices convert via `Math.round(Number(priceRupees) * 100)` with `<input step="1">` and display `(item.price / 100).toFixed(0)`. Also, the category delete confirmation copy warns *"Items inside this category will become unassigned"*, whereas [`CategoriesService.remove`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/categories.service.ts#L93-L118) actually **soft-deactivates** (`isActive: false`) any category with `itemCount > 0` instead of unassigning or deleting it.

---

## 6. Database Schemas and Relationships

MongoDB is accessed exclusively through Mongoose 9.11.2 (`@nestjs/mongoose`). No migrations framework is used; Mongoose manages schemas and indexes in code.

### Entity-Relationship Summary
- `Category` `1 <--- *` `FoodItem` (`FoodItem.categoryId` references `Category._id`, `ObjectId`)
- `FoodItem` `1 <--- *` `OrderItem` (embedded inside `Order.items[]` via `foodItemId: ObjectId`, plus immutable `nameSnapshot` and `priceSnapshot`)
- `OrderCounter` (`key: "ORDER-YYYY-MM-DD"`) generates monotonic daily sequences stamped into `Order.orderNumber` alongside `Order.orderDate`
- `Admin` is standalone (no foreign keys to orders or menu items)

### 1. `Admin` Schema ([`admin.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/schemas/admin.schema.ts))
Collection: `admins` (`timestamps: true` -> `createdAt`, `updatedAt`)

| Field | Mongoose Type | Constraints / Options | Index |
| --- | --- | --- | --- |
| `name` | `String` | `required: true`, `trim: true` | — |
| `email` | `String` | `required: true`, `unique: true`, `trim: true`, `lowercase: true` | `index: true`, `unique: true` |
| `passwordHash` | `String` | `required: true`, `select: false` (excluded from default queries) | — |

### 2. `Category` Schema ([`category.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/schemas/category.schema.ts))
Collection: `categories` (`timestamps: true`)

| Field | Mongoose Type | Constraints / Options | Index |
| --- | --- | --- | --- |
| `name` | `String` | `required: true`, `trim: true` *(Note: no `unique` constraint in schema)* | — |
| `description` | `String` | `trim: true`, `default: ''` | — |
| `displayOrder` | `Number` | `default: 0` | `index: true` |
| `isActive` | `Boolean` | `default: true` | `index: true` |

- **Compound Index:** `{ isActive: 1, displayOrder: 1 }`.
- **Business Rule:** Deleting a category with `>= 1` linked `FoodItem` documents soft-deactivates it (`isActive = false`, returning `{ deleted: false }`); empty categories are hard-deleted (`{ deleted: true }`).

### 3. `FoodItem` Schema ([`food-item.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/schemas/food-item.schema.ts))
Collection: `fooditems` (`timestamps: true`)

| Field | Mongoose Type | Constraints / Options | Index |
| --- | --- | --- | --- |
| `categoryId` | `SchemaTypes.ObjectId` | `ref: 'Category'`, `required: true` | `index: true` |
| `name` | `String` | `required: true`, `trim: true` | — |
| `description` | `String` | `trim: true`, `default: ''` | — |
| `price` | `Number` | `required: true`, `min: 0` (integer **paise**, e.g., `16000` = ₹160) | — |
| `imageUrl` | `String` | `trim: true`, `default: ''` | — |
| `isAvailable` | `Boolean` | `default: true` | `index: true` |
| `displayOrder` | `Number` | `default: 0` | `index: true` |

- **Compound Index:** `{ categoryId: 1, isAvailable: 1, displayOrder: 1 }`.
- **Pricing Rule:** All prices, line totals, subtotals, and totals are stored strictly in integer **paise** (`100` paise = `₹1`) on the backend to avoid IEEE-754 floating-point errors.

### 4. `OrderItem` Subdocument Schema ([`order-item.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/schemas/order-item.schema.ts))
Embedded inside `Order.items` with `{ _id: false }`:

| Field | Mongoose Type | Constraints / Options |
| --- | --- | --- |
| `foodItemId` | `SchemaTypes.ObjectId` | `ref: 'FoodItem'`, `required: true` |
| `nameSnapshot` | `String` | `required: true`, `trim: true` (frozen at order time) |
| `priceSnapshot` | `Number` | `required: true`, `min: 0` (paise frozen at order time) |
| `quantity` | `Number` | `required: true`, `min: 1`, `validate: Number.isInteger` |
| `itemTotal` | `Number` | `required: true`, `min: 0` (`priceSnapshot * quantity`) |

### 5. `Order` Schema ([`order.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/schemas/order.schema.ts))
Collection: `orders` (`timestamps: true`)

| Field | Mongoose Type | Constraints / Options | Index |
| --- | --- | --- | --- |
| `orderNumber` | `String` | `required: true`, `trim: true` (format `"#001"`, `"#1000"`) | Part of unique `{ orderDate: 1, orderNumber: 1 }` |
| `orderDate` | `String` | `required: true`, `trim: true` (`YYYY-MM-DD`, `Asia/Kolkata`) | `index: true` + unique compound |
| `tableNumber` | `Number` | `required: true`, `min: 1`, `validate: Number.isInteger` | `index: true` |
| `items` | `[OrderItemSchema]` | `required: true`, custom validator (`items.length > 0`) | — |
| `subtotal` | `Number` | `required: true`, `min: 0` (paise) | — |
| `total` | `Number` | `required: true`, `min: 0` (`total = subtotal`, no tax/discounts) | — |
| `status` | `String` | Enum: `NEW`, `ACCEPTED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`; default `NEW` | `index: true` |

- **Indexes:** `{ orderDate: 1, orderNumber: 1 }` (`unique: true`), `{ status: 1, createdAt: -1 }`, `{ tableNumber: 1, createdAt: -1 }`.
- **Order Lifecycle (`ALLOWED_STATUS_TRANSITIONS`):**
  - `NEW` -> `ACCEPTED` | `CANCELLED`
  - `ACCEPTED` -> `PREPARING` | `CANCELLED`
  - `PREPARING` -> `READY` | `CANCELLED`
  - `READY` -> `COMPLETED`
  - `COMPLETED` -> `[]` (terminal)
  - `CANCELLED` -> `[]` (terminal)

### 6. `OrderCounter` Schema ([`order-counter.schema.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/schemas/order-counter.schema.ts))
Collection: `ordercounters` (`timestamps: true`)

| Field | Mongoose Type | Constraints / Options | Index |
| --- | --- | --- | --- |
| `key` | `String` | `required: true`, `unique: true`, `trim: true` (e.g. `ORDER-2026-11-11`) | `index: true`, `unique: true` |
| `sequence` | `Number` | `required: true`, `default: 0`, `min: 0` | — |

- **Daily Order Counter Implementation:** [`OrdersService.getRestaurantLocalDate`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.ts#L103-L114) formats `new Date()` in `Asia/Kolkata` (`Intl.DateTimeFormat('en-CA')` -> `YYYY-MM-DD`). [`getNextOrderNumber`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.ts#L121-L133) runs atomic `findOneAndUpdate({ key }, { $inc: { sequence: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true })` and formats `seq < 1000` as `#001`..`#999`, or `#1000`+.

### Seed Scripts & Catalog Verification Status
- **Admin Seed (`npm run seed` -> [`seed.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/database/seed.ts)):** Compiles TS and executes `dist/database/seed.js`. Connects directly via `mongoose.createConnection`, hashes `SEED_ADMIN_PASSWORD` (default fallback in code) with bcrypt rounds `10`, and upserts the admin by lowercase `SEED_ADMIN_EMAIL`. Safe to rerun (updates existing admin password/name).
- **Menu Seed (`npm run seed:menu` -> [`seed-menu.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/database/seed-menu.ts)):** Contains static `REAL_CREAM_TREAT_MENU` with **6 categories and 59 food items (22 items with `/menu/*.jpg`, 37 with empty `imageUrl`)**. **Warning on reruns:** lines 588–595 query `CategoryModel.find({ name: { $nin: activeCategoryNames } })` and **permanently delete all custom admin-created categories and their items** before upserting the 6 seeded categories/items.
- **Live MongoDB Count Verification:** **NOT VERIFIED** during this audit because no live MongoDB connection was established.

---

## 7. Complete REST API Documentation

Global settings from [`main.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/main.ts): no global URI prefix; global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`; unknown request properties are rejected with `400 Bad Request`. No rate limiting or Swagger/OpenAPI spec exists.

### System & Health Endpoints ([`app.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/app.controller.ts))

| Method & Route | Auth | Purpose & Responses |
| --- | --- | --- |
| `GET /` | Public | Returns `{ "message": "Cream Treat QR Ordering API", "status": "running" }` (`200`). |
| `GET /health` | Public | Checks `connection.readyState === 1`. Returns `200` with `{ status: 'ok', service: 'cream-treat-backend', database: 'connected', timestamp }` or `503 Service Unavailable` with `status: 'error', database: 'disconnected'`. |

### Authentication Endpoints ([`auth.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.controller.ts))

| Method & Route | Auth / Role | Request DTO / Validation | Response (`200`) & Error Conditions |
| --- | --- | --- | --- |
| `POST /auth/admin/login` | Public | Body `LoginAdminDto`: `email` (`@IsNotEmpty`, `@IsEmail`, normalized lowercase), `password` (`@IsNotEmpty`, `@IsString`, `@MaxLength(128)`) | **200:** `{ accessToken, admin: { id, name, email } }` *(note: `role` omitted here)*. **400:** validation error. **401:** `"Invalid email or password."`. |
| `GET /auth/admin/me` | Protected (`JwtAuthGuard`, `ADMIN`) | `Authorization: Bearer <jwt>` header | **200:** `{ id, name, email, role: 'ADMIN' }`. **401:** missing/invalid/expired JWT. **403:** non-ADMIN role. **404:** admin missing in DB. |
| `POST /auth/admin/logout` | **Public** (no guard) | None | **200:** `{ message: 'Logged out successfully' }`. Stateless stub; does NOT revoke JWT server-side. |

### Public Menu Endpoints ([`menu.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/menu.controller.ts))

| Method & Route | Auth | Params / Query | Response & Error Conditions |
| --- | --- | --- | --- |
| `GET /menu/categories` | Public | None | **200:** `Category[]` where `isActive: true`, sorted `{ displayOrder: 1, name: 1 }`. |
| `GET /menu/items` | Public | Query `QueryFoodItemsDto`: optional `categoryId` (`@IsMongoId`) | **200:** `FoodItem[]` where `isAvailable: true` (populated `categoryId: { _id, name, displayOrder, isActive }`), sorted `{ displayOrder: 1, name: 1 }`. **Caveat:** Does **not** filter out items whose parent category has `isActive: false`. **400:** invalid `categoryId`. |
| `GET /menu/items/:id` | Public | Param `:id` (`ParseObjectIdPipe`) | **200:** Single `FoodItem` where `_id` matches and `isAvailable: true` (populated `categoryId`). **Caveat:** Does **not** check category `isActive`. **400:** invalid ObjectId. **404:** unavailable/not found. |

### Admin Menu Management Endpoints ([`admin-menu.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/admin-menu.controller.ts))
All routes below require `@UseGuards(JwtAuthGuard)` (`role: 'ADMIN'`). Returns `401` on invalid/missing token, `403` on non-`ADMIN` role.

| Method & Route | Request Params / Body | Response & Status Codes |
| --- | --- | --- |
| `GET /admin/categories` | None | **200:** All `Category[]` (active + inactive) sorted `{ displayOrder: 1, name: 1 }`. |
| `POST /admin/categories` | Body `CreateCategoryDto`: `name` (`@IsString @IsNotEmpty @MaxLength(100)`), `description?` (`<=500`), `displayOrder?` (`int >=0`), `isActive?` (`boolean`) | **201:** Created `Category`. **400:** validation failure. |
| `PATCH /admin/categories/:id` | Param `:id` (`ParseObjectIdPipe`); Body `UpdateCategoryDto` (all fields optional) | **200:** Updated `Category`. **400:** bad ObjectId/body. **404:** category not found. |
| `DELETE /admin/categories/:id` | Param `:id` (`ParseObjectIdPipe`) | **200:** `{ message, deleted: false, category }` if `foodItemModel.countDocuments({ categoryId }) > 0` (sets `isActive: false`); else `{ message, deleted: true, category }` (hard-deleted). **400 / 404**. |
| `GET /admin/items` | Query `QueryFoodItemsDto`: optional `categoryId` (`@IsMongoId`) | **200:** All `FoodItem[]` (including `isAvailable: false`, populated `categoryId`) sorted `{ displayOrder: 1, name: 1 }`. **400** if `categoryId` invalid. |
| `GET /admin/items/:id` | Param `:id` (`ParseObjectIdPipe`) | **200:** Populated `FoodItem`. **400 / 404**. |
| `POST /admin/items` | Body `CreateFoodItemDto`: `categoryId` (`@IsMongoId`), `name` (`<=120`), `description?` (`<=1000`), `price` (`@IsInt @Min(0)` paise), `imageUrl?` (`<=2048`), `isAvailable?`, `displayOrder?` (`int >=0`) | **201:** Populated created `FoodItem`. **400:** invalid DTO or referenced `categoryId` not found in DB. |
| `PATCH /admin/items/:id` | Param `:id` (`ParseObjectIdPipe`); Body `UpdateFoodItemDto` (all fields optional) | **200:** Updated populated `FoodItem`. **400:** invalid DTO/ObjectId/non-existent `categoryId`. **404:** item not found. |
| `DELETE /admin/items/:id` | Param `:id` (`ParseObjectIdPipe`) | **200:** `{ message, id }` (hard delete). **400 / 404**. |

### Customer Order Endpoints ([`orders.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.controller.ts))

| Method & Route | Auth | Request Validation | Response & Errors |
| --- | --- | --- | --- |
| `POST /orders` | Public | Body `CreateOrderDto`: `tableNumber` (`@IsInt @Min(1) @Max(999)`), `items` (`@IsArray @ArrayMinSize(1)`, nested `CreateOrderItemDto`: `foodItemId` `@IsMongoId`, `quantity` `@IsInt 1..99`) | **201:** `FormattedOrderResponse`: `{ id, orderNumber, displayOrderNumber, orderDate, tableNumber, status: 'NEW', items: [{ foodItemId, name, quantity, unitPrice, itemTotal }], subtotal, total, createdAt, updatedAt }`. **400:** validation error or item `isAvailable === false`. **404:** `foodItemId` not in DB. *Note: duplicate `foodItemId` rows are summed; category `isActive` is NOT checked.* |
| `GET /orders/:id` | Public | Param `:id` (`ParseObjectIdPipe`) | **200:** `FormattedOrderResponse` (same schema above). **400:** invalid ObjectId. **404:** order not found. *Caveat: unauthenticated IDOR exposure for anyone possessing an order's ObjectId.* |

### Admin Order Endpoints ([`admin-orders.controller.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/admin-orders.controller.ts))
All routes protected by `@UseGuards(JwtAuthGuard)` (`401` / `403`).

| Method & Route | Request Params / Query / Body | Response & Errors |
| --- | --- | --- |
| `GET /admin/orders` | Query `AdminOrderQueryDto`: `page?` (`int >=1`, default `1`), `limit?` (`int 1..50`, default `20`), `status?` (`OrderStatus` enum), `date?` (`YYYY-MM-DD`) | **200:** `{ data: AdminOrderDetails[], pagination: { page, limit, total, totalPages } }` sorted `{ createdAt: -1, orderDate: -1, orderNumber: -1 }`. (`AdminOrderDetails`: `{ id, orderNumber, orderDate, tableNumber, items: [{ name, quantity, unitPrice, itemTotal, foodItemId? }], subtotal, total, status, createdAt, updatedAt }`). **400:** invalid query params (e.g. `limit=51`). |
| `GET /admin/orders/:id` | Param `:id` (`ParseObjectIdPipe`) | **200:** `AdminOrderDetails`. **400 / 404**. |
| `PATCH /admin/orders/:id/status` | Param `:id` (`ParseObjectIdPipe`); Body `UpdateOrderStatusDto`: `status` (`OrderStatus` enum) | **200:** Updated `AdminOrderDetails` + emits `order.status.updated`. **400:** bad ObjectId/status. **404:** not found. **409 Conflict:** same status (`Order is already ...`), disallowed state transition, or atomic concurrent update race. |

---

## 8. Authentication and Security

### Admin Authentication & JWT Implementation
- **Credential Verification ([`AuthService.login`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.service.ts#L43-L81)):** Normalizes email (`trim().toLowerCase()`), explicitly queries `.select('+passwordHash')` (because `AdminSchema` sets `select: false`), and compares with `bcrypt.compare(password, admin.passwordHash)`. Missing email and wrong password both return the same generic `401 Unauthorized` (`"Invalid email or password."`) to reduce enumeration risk.
- **JWT Issuance & Strategy ([`auth.module.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.module.ts), [`jwt.strategy.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/strategies/jwt.strategy.ts)):** Signs payload `{ sub, email, role: 'ADMIN' }` with `JWT_EXPIRES_IN` (default `'1d'`). `JwtStrategy` extracts Bearer tokens from `Authorization` headers, validates `payload.sub` + `payload.email`, throws `ForbiddenException` (`403`) if `payload.role !== 'ADMIN'`, and returns `{ id: payload.sub, email: payload.email, role: 'ADMIN' }`.
- **Guard ([`jwt-auth.guard.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/guards/jwt-auth.guard.ts)):** Extends `AuthGuard('jwt')`, converts missing/invalid auth errors to `UnauthorizedException`, and re-checks `user.role === 'ADMIN'`, throwing `ForbiddenException` otherwise.
- **Frontend Token Storage ([`api.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/api.ts#L259-L299)):** Stores JWT and cached admin user in browser `sessionStorage` (`ct_admin_access_token`, `ct_admin_user`). Tabs do not share sessions across browser restarts, and `sessionStorage` reduces casual multi-tab exposure relative to `localStorage`, though it remains readable to JavaScript in an XSS event.

### CORS, Input Validation, and Sensitive Data Protection
- **CORS ([`main.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/main.ts#L17-L44), [`orders.gateway.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.gateway.ts#L67-L95)):** Both Express REST and Socket.IO gateways enable `credentials: true` and allow: requests with no `Origin`, `FRONTEND_URL` exact match or comma-separated origins, and when `NODE_ENV !== 'production'`, private LAN IPv4/localhost regexes (`localhost`, `127.0.0.1`, `192.168.*.*`, `10.*.*.*`, `172.16–31.*.*`).
- **DTO & Param Validation:** Global `ValidationPipe` strips unknown fields (`whitelist: true`), rejects extra fields (`forbidNonWhitelisted: true`), transforms types, and `ParseObjectIdPipe` guards `:id` path params (`Types.ObjectId.isValid`).
- **Log Sanitization:** [`sanitizeMongoUri`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/database/database.module.ts#L5-L12) masks MongoDB credentials (`//***:***@`), and `OrdersGateway.extractToken` never logs raw JWT strings.
- **Pricing Integrity:** `POST /orders` never trusts client prices; it looks up `FoodItem.price` from MongoDB and snapshots name/price at order creation.

### Identified Security Weaknesses
1. **Hardcoded JWT Fallback Secret in 3 Backend Modules (+ E2E test):** [`auth.module.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.module.ts#L20-L22), [`jwt.strategy.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/strategies/jwt.strategy.ts#L17-L19), and [`orders.gateway.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.gateway.ts#L125-L127) all fall back to a shared hardcoded string (`[REDACTED_DEV_FALLBACK_JWT_SECRET]`) if `JWT_SECRET` is falsy/empty — allowing token forgery if deployed misconfigured.
2. **Weak Env Validation ([`env.validation.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/common/config/env.validation.ts#L25-L34)):** `JWT_SECRET` and `DATABASE_URL` only check `@IsString()`, with **no `@IsNotEmpty()`** and no minimum secret length; `JWT_SECRET=""` passes startup validation and triggers the fallback secret! (`FRONTEND_URL` also lacks `@IsOptional()`, requiring it to exist even though code gives a default.)
3. **Unauthenticated Stateless Logout:** `POST /auth/admin/logout` has no `@UseGuards(JwtAuthGuard)` and no token denylist/revocation store; compromised or logged-out tokens remain valid until `exp`. (`JwtStrategy` also does not re-verify the admin account still exists in MongoDB on every request.)
4. **Inactive Category Ordering Bypass:** [`FoodItemsService.findAvailable`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/food-items.service.ts#L25-L45), `findByIdPublic`, and `OrdersService.create` never inspect `category.isActive`, allowing deactivated categories' available items to still be queried and ordered via API.
5. **Unauthenticated `GET /orders/:id` & Socket `subscribe_order`:** Anyone with a 24-hex ObjectId can view order contents/table number via `GET /orders/:id` or join room `order:<id>` (no order token/secret), though MongoDB ObjectIds provide 96 bits of entropy/counter space.
6. **Arbitrary `imageUrl` String:** `CreateFoodItemDto.imageUrl` accepts any string up to `2048` chars without URL/path whitelist validation (not `@IsUrl`).
7. **Default Seed Admin Credentials & No Rate Limiting:** `seed.ts` includes a hardcoded fallback development password (`[REDACTED_DEV_SEED_PASSWORD]`), and `/auth/admin/login` and `/orders` have no brute-force throttling or Helmet security headers.

---

## 9. Socket.IO and Real-Time Order System

### Gateway Configuration ([`orders.gateway.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.gateway.ts))
- Shares HTTP port `3001` via `@nestjs/platform-socket.io` + `socket.io` `4.8.4`. Uses identical CORS rules to Express (`FRONTEND_URL` + development LAN regex + `credentials: true`).
- Transport config on client ([`socket.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/socket.ts#L82-L97)): `transports: ['websocket', 'polling']`, `reconnection: true`, `reconnectionAttempts: Infinity`, `reconnectionDelay: 1000..5000`, `timeout: 10000`, sends `auth: { token: "Bearer <jwt>" }` when `token` is provided.

### Authentication & Rooms (`handleConnection`, `handleDisconnect`)
- **Token Extraction (`extractToken`):** Checks `handshake.auth.token`, `handshake.headers.authorization`, then `handshake.query.token`, stripping leading `"Bearer "`.
- **Admin Path:** If a token is present, verifies via `jwtService.verifyAsync(token, { secret })` (using `JWT_SECRET` or fallback). If `payload.role !== 'ADMIN'`, emits `auth_error` (`{ message: 'Forbidden: Admin role required' }`) and calls `client.disconnect(true)`. If valid, assigns `client.data.admin = payload` and joins room `'admin-orders'`.
- **Missing/Invalid Token Path:** If token verification fails, emits `auth_error` (`Unauthorized: Invalid or expired token`) and disconnects. If no token is supplied **and** `handshake.auth?.role` or `query?.role` equals `'ADMIN'`, emits `auth_error` (`Unauthorized: Missing admin token`) and disconnects. Otherwise connects as an anonymous customer without joining `admin-orders`.

### Events & Payloads

| Direction | Event Name | Target Room / Handler | Payload Schema |
| --- | --- | --- | --- |
| Server -> Admin | `order.created` | `admin-orders` | `{ id, orderNumber, orderDate, tableNumber, status, subtotal, total, items: [{ name, quantity, unitPrice, itemTotal, foodItemId? }], createdAt, updatedAt }` |
| Server -> Admin | `order.status.updated` | `admin-orders` | Same full `AdminOrderDetails` shape above |
| Server -> Customer | `order.status.updated` | `order:<orderId>` | Sanitized `{ id, orderNumber, status, updatedAt }` (strips tableNumber, items, prices) |
| Server -> Socket | `auth_error` | Calling socket | `{ message: string }` immediately before `disconnect(true)` |
| Customer -> Server | `subscribe_order` | `handleSubscribeOrder` | `{ orderId }` -> validates ObjectId & `orderModel.exists`; joins `order:<orderId>`, returns `{ success, room? \| message? }` |
| Customer -> Server | `unsubscribe_order` | `handleUnsubscribeOrder` | `{ orderId }` -> leaves `order:<orderId>`, returns `{ success, room? \| message? }` |

### Frontend Integration & Polling Fallbacks (Critical Finding)
1. **Customer Order Tracking (`/order-success`) — INTEGRATED:** Connects `createOrderSocket()` with no token, emits `subscribe_order` with `{ orderId }` on `connect`, updates order status state on `order.status.updated`, tracks `socketStatus` (`connected` / `reconnecting` / `polling-fallback`), unsubscribes/disconnects on cleanup, and runs a `5000ms` polling `setInterval` calling `GET /orders/:id` until status is `COMPLETED` or `CANCELLED`.
2. **Admin Order Detail (`/admin/orders/[id]`) — INTEGRATED:** Passes `token` into `createOrderSocket(token)` (line 191), joins `admin-orders`, updates local order state cleanly on `order.status.updated` matching `orderId`, and displays gateway status in [`AdminLayout`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/AdminLayout.tsx). Has no `setInterval` polling loop on the detail view (relying on manual refresh or socket updates).
3. **Admin Dashboard (`/admin`) — BROKEN REAL-TIME AUTHENTICATION:** [`app/admin/page.tsx` line 332](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/page.tsx#L332) invokes `createOrderSocket()` **with NO `token` argument** (`auth: {}`, no `role: 'ADMIN'`). Consequently, the gateway treats the dashboard socket as an anonymous **customer** client, logs `Customer client connected`, NEVER adds it to `admin-orders`, and never delivers `order.created` or `order.status.updated` events! The UI falsely displays `"Live Gateway Active"` (since `connect` fires cleanly) while silently depending solely on its `10000ms` REST polling loop (`lines 292–294`).

---

## 10. QR Generation and Table Ordering

- **How QR Table Ordering Works:** Physical table QRs encode `<APP_URL>/order?table=<tableNumber>`. When opened on any phone/browser, `/order` extracts `table` via `useSearchParams()`, validates integer `1–999` with [`parseTableUrlParam`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/qr.ts#L98-L130), stores it in `CartContext` (`localStorage`), shows a confirmation badge in `Navbar`, and attaches `tableNumber` to `POST /orders`.
- **Database Storage:** There is **no** `Table` collection or backend QR endpoint. [`backend/src/qr/qr.helper.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/qr/qr.helper.ts) only contains pure helper functions (`MIN_QR_TABLE = 1`, `MAX_QR_TABLE = 100`, `MIN_ORDER_TABLE = 1`, `MAX_ORDER_TABLE = 999`, `getAppBaseUrl`, `generateTableOrderUrl`, `validateQRTable`, `validateOrderTable`) and is tested by `qr.helper.spec.ts` (27 specs) without being wired to any NestJS module or controller.
- **Dynamic Client QR Generation (`/admin/qr`):** [`AdminQRPage`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/qr/page.tsx) defaults to `10` tables and allows generating `1–100` cards (`validateQRTableCount`). Each [`TableQRCard`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/TableQRCard.tsx) renders:
  - Live HTML5 `<canvas>` preview via [`TableQRCode`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/TableQRCode.tsx) (`QRCode.toCanvas`, `170px`, error correction `'M'`).
  - **Target URL copy / open-in-new-tab** preview.
  - **Download Standee (PNG):** Draws an `800x1100` branded Cream Treat card on an offscreen canvas with logo (`/images/cream-treat-logo.jpg`), `TABLE <N>` badge, `440px` burgundy QR (`QRCode.toDataURL`, error correction `'H'`), CTA, and target URL, downloading `cream-treat-table-<n>-qr.png`. *(Note: ES lint flags two `as any` casts on `window.Image` here.)*
  - **Print All Standees:** Calls `window.print()` with Tailwind `print:` rules hiding generator controls/chrome and laying out cards in a 2-column grid.
- **URL Resolution & Localhost / Hardcoded LAN IP Findings:**
  - [`getFrontendAppUrl`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/qr.ts#L169-L196) picks in order: custom form override -> non-localhost `NEXT_PUBLIC_APP_URL` -> `window.location.origin` (allows auto-adapting to whatever LAN IP the admin opened in Chrome) -> `NEXT_PUBLIC_APP_URL` -> `'http://localhost:3000'`.
  - When `baseUrlInput` contains `localhost` or `127.0.0.1`, `/admin/qr` displays a *"Phone Testing Tip"* warning (`localhost` fails on mobile cameras), with placeholder IP `http://192.168.70.110:3000`.
  - [`frontend/next.config.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/next.config.ts#L3-L19) hardcodes `"192.168.70.111"` in `allowedDevOrigins` (plus `"localhost"`, `"127.0.0.1"`, `"*.local"`, and `NEXT_PUBLIC_APP_URL` host), meaning changing Wi-Fi LAN IPs in dev requires updating `.env.local` (`NEXT_PUBLIC_APP_URL`) or accessing via matching hostname so Next dev requests aren't blocked.
  - Both [`getApiBaseUrl()`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/api.ts#L28) and [`getSocketServerUrl()`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/socket.ts#L52) dynamically derive `${window.location.protocol}//${window.location.hostname}:3001` whenever accessed over a LAN IP instead of localhost.

---

## 11. Menu, Categories, Food Items and Image Mapping

### Seed Menu vs. Static Frontend Menu Comparison
Direct evaluation of [`REAL_CREAM_TREAT_MENU`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/database/seed-menu.ts) and [`MENU_SECTIONS`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuData.ts) confirms exact parity in item counts and INR prices across **6 active categories and 59 items**:

| # (`displayOrder`) | Seed Category (`description`) | Frontend Section (`tagline` / `theme`) | Item Count | Price Range (INR) | Seed Photos (`imageUrl`) | Frontend Featured Photos |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | `Sundae` (*Sweet Tooth*) | `sundae` / *Sweet Tooth* (`light`) | `9` | `₹160–₹245` (`16000–24500`) | `4` (`/menu/*.jpg`) | `4` (`/images/*.jpg`) |
| `2` | `Milkshake` (*Madness*) | `milkshake` / *Madness* (`dark`) | `15` *(Shakes 8, Cold Coffee 3, Bubble Milk 4)* | `₹85–₹190` (`8500–19000`) | `4` (`/menu/*.jpg`) | `4` (`/images/*.jpg`) |
| `3` | `Mains` (*Mustly Mains*) | `mains` / *Mustly* (`light`) | `9` *(Sandwiches 6, Burgers 3)* | `₹75–₹150` (`7500–15000`) | `3` (`/menu/*.jpg`) | `3` (`/images/*.jpg`) |
| `4` | `Cheat Meal` (*Feel-Good*) | `cheat-meal` / *Feel-good* (`dark`) | `9` *(Maggi 6, French Fries 3)* | `₹55–₹140` (`5500–14000`) | `4` (`/menu/*.jpg`) | `4` (`/images/*.jpg`) |
| `5` | `Sides` (*Situationship*) | `sides` / *Situationship* (`light`) | `8` | `₹95–₹130` (`9500–13000`) | `4` (`/menu/*.jpg`) | `4` (`/images/*.jpg`) |
| `6` | `Mojito` (*Magic*) | `mojito` / *Magic* (`dark`) | `9` *(Mojitos 5, Lassi 4)* | `₹70–₹110` (`7000–11000`) | `3` (`/menu/*.jpg`) | `3` (`/images/*.jpg`) |
| **Total** | **6 active categories** | **6 sections** | **59 items** | **`₹55–₹245`** | **22 photos (`37` empty `''`)** | **22 photos** |

### Image Asset Audit & Path Mapping Discrepancies
- **Asset Count & Duplication:**
  - `frontend/public/menu/` contains **22** `.jpg` photographs (`banana-split.jpg` ... `veg-grilled-sandwich.jpg`).
  - `frontend/public/images/` contains **23** `.jpg` files: `cream-treat-logo.jpg` plus **22** `.jpg` food photos verified via SHA-256 checksum to be byte-for-byte identical duplicates of `frontend/public/menu/*.jpg`.
  - `frontend/public/logo.jpg` is also a byte-for-byte duplicate (`0c85546d307f...`) of `frontend/public/images/cream-treat-logo.jpg`.
- **Two Separate Image Paths:** `seed-menu.ts` assigns `/menu/<slug>.jpg` (`22` items, `37` empty `''`) which is displayed inside `/admin/menu`, whereas `frontend/lib/menuData.ts` assigns `/images/<slug>.jpg` (`22` featured dishes), ignoring the backend `imageUrl` completely in [`buildHydratedSections`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuMapper.ts#L76-L81) except when creating offline fallback objects. All `22` files exist in both `/menu/` and `/images/` on disk.
- **Spelling Differences & Fragile Mapping:** All 59 items differ in casing/spelling between `seed-menu.ts` (Title Case + `Maggie`, `Gadbud`, `Falafels`) and `menuData.ts` (Sentence case + `maggi`, `Gadbad`, `falafel`). [`normalizeName`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuMapper.ts#L23-L30) papers over these 3 spelling variants; any new item or rename outside `MENU_SECTIONS` is silently dropped from `/order`.
- **Admin Menu Preview Issues:** `/admin/menu` renders `22` photos in table rows (`<Image unoptimized src={item.imageUrl} ...>` without `onError` handler, failing silently to broken image on bad external URLs) and placeholder icons (`Utensils`) for the `37` un-photographed items, with no live preview inside the Create/Edit modal.
- **Historical 8/65 vs. 6/59 Drift:** [`menu-management.spec.ts` L521–522](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/menu-management.spec.ts#L521-L522) still asserts an older `8` categories / `65` items menu (`Momos, Soup, Mains, Sundae, Mojito / Lassi, Milkshakes & Cold Coffee, Cheat Meal, Sides`), causing the single failing backend unit test.

---

## 12. Git History and Collaboration Changes

### Repository Status (Verified Read-Only)
- **Git Metadata Presence:** `.git/` directory does **NOT** exist (`git status`, `git log`, `git branch -a`, `git remote -v` fail with `fatal: not a git repository`).
- **Branch, Commits, Remotes, Authorship:** Cannot be determined from Git; there is no commit history, remote URL, diff log, or developer attribution. **Per audit constraints, developer authorship is NOT guessed.**

### Available Evidence on Code Evolution & Concurrent Changes (From Timestamps & Source Code)
While Git history is absent, filesystem modification timestamps (`mtime`) and internal code artifacts reveal two distinct change layers:
1. **File Modification Timestamp Clusters:**
   - **Baseline Archive (`2026-11-06T13:43:28–31Z`):** `176` source, asset, config, and test files share identical extraction/copy timestamps.
   - **Local Environment Setup (`2026-11-06T13:52–58Z`):** `backend/package-lock.json` (`13:52Z`), `backend/.env`, `frontend/.env`, `frontend/.env.local` (`13:53Z`), `backend/tsconfig.build.tsbuildinfo` (`13:56Z`), and `frontend/package-lock.json` (`13:58Z`).
   - **Post-Setup Execution (`2026-11-07T13:18–21Z`):** Empty `backend/out.txt` & `backend/err.txt` (`13:18:39Z`) and updated [`start.bat`](file:///d:/new%20cream%20treat/Cream_Treat-main/start.bat) (`13:21:29Z`), modified after [`start.ps1`](file:///d:/new%20cream%20treat/Cream_Treat-main/start.ps1).
2. **Codebase Artifacts Indicating Multiple Iterations / Divergent Edits:**
   - **UI Pivot (Card UI -> Editorial UI):** `frontend/components/FoodCard.tsx` and `CategoryBar.tsx` use the older maroon/gold (`#4A0E1A`/`#D4AF37`) card UI design and were left orphaned when `/order` switched to the burgundy/cream (`#6A0019`/`#FBF7F2`) magazine layout (`CategoryNav`, `FeaturedPhotoGrid`, `TypographicItemList`, `menuData.ts`, `menuMapper.ts`).
   - **Menu Data Evolution (8/65 -> 6/59):** `seed-menu.ts`, `menuData.ts`, and `CategoryBar.tsx` reflect the 6-category (`59`-item) PDF menu with duplicate `/menu/` and `/images/` image folders, while `menu-management.spec.ts` retains assertions for an `8`-category / `65`-item catalog.
   - **Socket Integration Split:** Backend `OrdersGateway` and `/admin/orders/[id]` implement full admin JWT Socket.IO authentication, whereas `/admin` (`app/admin/page.tsx`) calls `createOrderSocket()` without a token.
   - **Status Lifecycle Divergence:** Backend `OrdersService` and `AdminOrderDetails` / `/order` DTOs implement the full 6-status pipeline (`NEW -> ACCEPTED -> PREPARING -> READY -> COMPLETED | CANCELLED`), whereas `/admin`, `/admin/orders/[id]`, and `/order-success` only wire a 2-step flow (`NEW -> ACCEPTED` or `CANCELLED`).

---

## 13. Testing Results and Build Status

All safe, non-destructive verification commands below were executed directly during this session against the current files on disk.

### Summary Table

| Check | Exact Command Executed | Result | Details |
| --- | --- | --- | --- |
| **Backend Unit Tests** | `npm --prefix backend test -- --reporter=verbose` | **FAIL (Exit 1)** | `11 passed \| 1 failed` test files (`193 passed \| 1 failed`, `194` total, `11.51s`, Vitest `4.1.11`, **mocked** DB models) |
| **Backend Lint** | `npm --prefix backend run lint` | **PASS (Exit 0)** | `0 errors, 6 warnings` (`oxlint src/ test/`, `35ms`, `56 files`, `96 rules`) |
| **Backend Build TS Check** | `node backend/node_modules/typescript/bin/tsc -p backend/tsconfig.build.json --noEmit --incremental false` | **PASS (Exit 0)** | `0` type errors across `backend/src` (excludes `test/` & `*.spec.ts`) |
| **Backend Full TS Check** | `node backend/node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit --incremental false` | **FAIL (Exit 1)** | `2` errors (`TS2307: Cannot find module 'supertest/types'`) in both E2E specs |
| **Backend E2E Tests** | `npm --prefix backend run test:e2e` & `vitest --root backend --config ./vitest.config.e2e.ts test/menu-management.e2e-spec.ts` | **FAIL / BLOCKED** | Sandbox: `menu-management.e2e-spec.ts` **0/3 passed (3 failed)** on MongoDB `EACCES ::1:27017 / 127.0.0.1:27017` (`5076ms`); `app.e2e-spec.ts` hung in 5s Mongoose retry loop (`[Nest] 31064`) until killed. Direct root invocation failed on missing `DATABASE_URL`/`JWT_SECRET` cwd env (`3 skipped`, `1 error` + `afterAll` undefined `app.close()`) |
| **Frontend Unit Tests** | `npm --prefix frontend test` | **PASS (Exit 0)** | `12/12` passed (`node --test lib/qr.test.ts`, `229.82ms`, `MODULE_TYPELESS_PACKAGE_JSON` warning) |
| **Frontend TS Check** | `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit --incremental false` | **PASS (Exit 0)** | `0` type errors across `frontend/` |
| **Frontend ESLint** | `npm --prefix frontend run lint` | **FAIL (Exit 1)** | `34 problems (17 errors, 17 warnings)` across `10` files |

### Detailed Verification Output Breakdown
1. **Backend Unit Tests (`193/194` passed — ALL use mocked services/models):**
   - Passing (`11/11` files): `app.controller.spec.ts` (`7/7`), `auth.controller.spec.ts` (`6/6`), `auth.service.spec.ts` (`12/12`), `schemas.spec.ts` (`21/21`), `menu.controller.spec.ts` (`11/11`), `menu.service.spec.ts` (`12/12`), `admin-orders.controller.spec.ts` (`12/12`), `orders.controller.spec.ts` (`5/5`), `orders.gateway.spec.ts` (`12/12`), `orders.service.spec.ts` (`47/47`), `qr.helper.spec.ts` (`27/27`).
   - Failing (`1/12` files): [`menu-management.spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/menu-management.spec.ts#L521-L522) (`21/22` passed; test #22 failed with `AssertionError: expected 6 to be 8` expecting `8` categories and `65` items instead of `6` / `59`).
2. **Backend E2E Tests Root Cause:** Both [`app.e2e-spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/test/app.e2e-spec.ts) and [`menu-management.e2e-spec.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/test/menu-management.e2e-spec.ts) mock application services with in-memory arrays, yet still import `AppModule` (which pulls in `DatabaseModule` / `MongooseModule.forRootAsync`), causing Mongoose to attempt connecting to MongoDB port `27017` (failing in sandboxed/headless environments without running MongoDB). Both files also fail `tsc -p backend/tsconfig.json` with `TS2307` on `import { App } from 'supertest/types';`.
3. **Backend `oxlint` (`6` warnings, `0` errors):** All 6 are `no-unused-vars`: `env.validation.ts:7` (`IsUrl`), `qr.helper.spec.ts:9–10` (`MIN_ORDER_TABLE`, `MAX_ORDER_TABLE`), `menu-management.spec.ts:13,15,19` (`UpdateCategoryDto`, `UpdateFoodItemDto`, `OrderStatus`).
4. **Frontend ESLint (`17` errors, `17` warnings across `10` files):**
   - `12` `react-hooks/set-state-in-effect` errors: `CartContext.tsx`, `order/page.tsx` (x2), `cart/page.tsx` (x2), `order-success/page.tsx`, `admin/login/page.tsx`, `admin/page.tsx` (x2), `admin/orders/[id]/page.tsx`, `admin/menu/page.tsx`, `admin/qr/page.tsx`.
   - `3` `@typescript-eslint/no-explicit-any` errors: `TableQRCard.tsx:53,117`, `api.ts:565`.
   - `2` `react/no-unescaped-entities` errors: `admin/page.tsx:460`, `admin/qr/page.tsx:232`.
   - `16` `@typescript-eslint/no-unused-vars` warnings (including unused `categories` & `errorMessage` on `/order`, unused `Socket` / handlers) + `1` `@next/next/no-page-custom-font` warning in `app/layout.tsx:29`.

### Unverified Areas (Not Executed During This Audit)
- Live MongoDB database connection, schema index creation on MongoDB, and atomic `OrderCounter` concurrency under load.
- Execution of `npm --prefix backend run seed` and `npm --prefix backend run seed:menu`.
- Production builds: `npm --prefix backend run build` (`nest build`, though pre-existing `backend/dist/` was present on disk) and `npm --prefix frontend run build` (`next build`, `frontend/.next/` does not exist).
- End-to-end HTTP + Socket.IO integration against running NestJS + Next.js servers (`start.bat` / `start.ps1`).
- Live browser visual rendering, mobile responsiveness, interactive checkout, Canvas PNG standee download, `window.print()`, and physical phone camera QR scanning over Wi-Fi LAN.

---

## 14. Installation and Environment Setup

### Prerequisites
- Node.js (v20/v24+ compatible; lockfiles built cleanly; `v24.16.0` present in current host environment) + npm.
- MongoDB Server running locally on port `27017` (or MongoDB Atlas URI; [`start.bat`](file:///d:/new%20cream%20treat/Cream_Treat-main/start.bat) expects Windows service named `MongoDB`).

### Environment Variables (Keys Only — Secrets Redacted)
**Backend ([`backend/.env.example`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/.env.example) & active `backend/.env`):**
- `PORT` — HTTP + Socket.IO listen port (default `3001`, bound to `0.0.0.0`).
- `DATABASE_URL` — MongoDB connection URI (required string by `env.validation.ts`).
- `JWT_SECRET` — HMAC secret for admin JWTs (required string by `env.validation.ts`; lacks non-empty guard).
- `JWT_EXPIRES_IN` — JWT expiry duration (optional, default `'1d'`).
- `FRONTEND_URL` — Allowed CORS origin(s), comma-separated (default `'http://localhost:3000'`).
- `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` — Admin credentials used only by [`seed.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/database/seed.ts).

**Frontend ([`frontend/.env.example`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/.env.example), `frontend/.env`, `frontend/.env.local`):**
- `NEXT_PUBLIC_API_URL` — Backend REST base URL (default `http://localhost:3001`; dynamically uses window LAN hostname on non-localhost).
- `NEXT_PUBLIC_SOCKET_URL` — Backend Socket.IO URL (default `http://localhost:3001`).
- `NEXT_PUBLIC_APP_URL` — Base URL used for table QR codes (e.g. `http://localhost:3000` or LAN URL).

### Local Setup Sequence (Not Executed Here)
```powershell
# 1. Install dependencies (already installed in node_modules/)
cd backend && npm install
cd ..\frontend && npm install

# 2. Configure env files from .env.example (already present locally; do NOT commit .env)
# 3. Ensure MongoDB service is running
# 4. Seed Admin user & 6-category PDF menu
npm --prefix backend run seed
npm --prefix backend run seed:menu

# 5. Run dev servers manually OR use .\start.bat / .\start.ps1
npm --prefix backend run start:dev
npm --prefix frontend run dev
```

---

## 15. Deployment Readiness

**Assessment: NOT PRODUCTION READY.** Key blockers found in code inspection and verification checks:

1. **Missing Auth & Gateway Hardening:** Hardcoded JWT fallback secrets exist in [`auth.module.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.module.ts), [`jwt.strategy.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/strategies/jwt.strategy.ts), and [`orders.gateway.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.gateway.ts); `env.validation.ts` allows empty `JWT_SECRET` and `DATABASE_URL`; `POST /auth/admin/logout` is unguarded and does not revoke JWTs; no rate limiting or Helmet middleware is configured.
2. **Functional Gaps:**
   - `/admin` dashboard Socket.IO omits the admin JWT (`createOrderSocket()`), breaking instant real-time notifications for new orders on the main counter screen.
   - Staff have **no UI buttons** for `PREPARING`, `READY`, or `COMPLETED`, making the kitchen workflow stop at `ACCEPTED`.
   - Customer menu `/order` renders static `MENU_SECTIONS` instead of dynamic DB categories/items and generates un-orderable `client_*` fallback IDs.
   - Public menu & `POST /orders` allow ordering from deactivated categories.
   - Footer on `/order` contains placeholder copy (`[ADDRESS]`, `[WHATSAPP LINK]`, `[OPENING HOURS]`).
3. **Build / CI Blockers:**
   - `npm --prefix backend test` fails (`menu-management.spec.ts` #22).
   - `tsc -p backend/tsconfig.json` fails on `supertest/types` (`TS2307`).
   - `npm --prefix backend run test:e2e` fails without MongoDB on port `27017`.
   - `npm --prefix frontend run lint` fails with `17` ESLint errors and `17` warnings.
   - Frontend production build (`next build`) has not been run (`frontend/.next` absent).
4. **Operational Gaps:** No Dockerfile/Compose, CI pipeline, production reverse proxy/TLS termination docs, image upload storage service, error monitoring, or backup runbook. Also note `start.bat`/`start.ps1` launch the **backend built `dist/main.js`** (`start:prod`) paired with **frontend `npm run dev`** (`next dev`).

---

## 16. Bugs, Risks and Pending Work

### Explicit Re-Verification of the 12 Historical Audit Findings

| # | Historical Audit Finding | Current Status | Verified Evidence |
| --- | --- | --- | --- |
| 1 | Admin Socket.IO authentication | **PARTIALLY FIXED / INCONSISTENT** | [`OrdersGateway`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.gateway.ts#L120-L176) and [`/admin/orders/[id]`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/orders/%5Bid%5D/page.tsx#L191) authenticate via JWT (`createOrderSocket(token)`), **but [`/admin`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/page.tsx#L332) still calls `createOrderSocket()` with NO token**, never joins `admin-orders`, and falls back to 10s polling. |
| 2 | Missing admin order status controls | **STILL PRESENT** | [`admin/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/page.tsx) and [`admin/orders/[id]/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/admin/orders/%5Bid%5D/page.tsx) only provide controls for `Accept` (`NEW -> ACCEPTED`) and `Cancel` (`NEW \| ACCEPTED -> CANCELLED`). `PREPARING`, `READY`, and `COMPLETED` buttons do not exist (`COMPLETED` confirm modal is dead code). `/order-success` timeline also stops at `ACCEPTED`. |
| 3 | Customer menu using static data instead of backend menu data | **STILL PRESENT** | [`order/page.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/app/order/page.tsx) fetches `/menu/categories` and `/menu/items`, ignores `categories`, and renders strictly from static `MENU_SECTIONS` via [`buildHydratedSections`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuMapper.ts#L74). |
| 4 | Synthetic `client_*` food item IDs | **STILL PRESENT** | [`menuMapper.ts:57`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/lib/menuMapper.ts#L57) emits `_id: "client_${key}"` when a static item isn't found in API items, causing `POST /orders` to reject with HTTP `400` (`@IsMongoId`). |
| 5 | JWT fallback secret | **STILL PRESENT** | Shared fallback secret literal exists in [`auth.module.ts:22`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.module.ts#L22), [`jwt.strategy.ts:19`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/strategies/jwt.strategy.ts#L19), [`orders.gateway.ts:127`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.gateway.ts#L127), and [`menu-management.e2e-spec.ts:235`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/test/menu-management.e2e-spec.ts#L235). |
| 6 | Empty `JWT_SECRET` validation | **STILL PRESENT** | [`env.validation.ts:29-30`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/common/config/env.validation.ts#L29-L30) uses only `@IsString()` (missing `@IsNotEmpty()` and `@MinLength()`). Same for `DATABASE_URL`. |
| 7 | Logout token revocation | **STILL NOT IMPLEMENTED** | [`auth.controller.ts:47-51`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/auth/auth.controller.ts#L47-L51) `POST /auth/admin/logout` has no guard and returns a stateless `{ message }` with no denylist/blocklist. |
| 8 | Inactive category ordering restrictions | **STILL MISSING** | [`food-items.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/food-items.service.ts) (`findAvailable`, `findByIdPublic`) and [`orders.service.ts`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/orders/orders.service.ts) (`create`) never check parent category `isActive === true`. |
| 9 | Menu seed script potentially deleting custom categories | **STILL PRESENT** | [`seed-menu.ts:588-595`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/database/seed-menu.ts#L588-L595) deletes all categories (and their food items) whose `name` is not in the 6 hardcoded seed categories. |
| 10 | Backend unit test mismatch between 6/59 and 8/65 menu data | **STILL PRESENT** | [`menu-management.spec.ts:521-522`](file:///d:/new%20cream%20treat/Cream_Treat-main/backend/src/menu/menu-management.spec.ts#L521-L522) fails (`AssertionError: expected 6 to be 8`) against the 6-category / 59-item `REAL_CREAM_TREAT_MENU`. |
| 11 | Frontend ESLint errors | **STILL PRESENT** | `npm --prefix frontend run lint` exits `1` with `34 problems (17 errors, 17 warnings)`. |
| 12 | Backend E2E MongoDB connection issue (+ E2E TS error) | **STILL PRESENT** | E2E specs import `AppModule`, causing Mongoose connection attempts/retry loops on `27017`; `tsc -p backend/tsconfig.json` also fails with `TS2307` on `supertest/types`. |

### Additional Bugs & Technical Debt Observed
1. **`GET /admin/orders` Dashboard Metric Under-Counting:** `/admin` requests `limit: 50` page `1` and tallies status counts solely from those 50 rows rather than `pagination.total` or status-count aggregation, misreporting counts once total orders exceed 50.
2. **Duplicate Asset Directories (`/menu/` & `/images/` + `logo.jpg`):** `22` identical `.jpg` photos (`807,465 B` / `788.5 KiB` duplicated) plus duplicated `logo.jpg` (`15,907 B`); legacy [`FoodCard.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/FoodCard.tsx), [`CategoryBar.tsx`](file:///d:/new%20cream%20treat/Cream_Treat-main/frontend/components/CategoryBar.tsx), and Next starter SVGs remain unreferenced.
3. **Admin Menu UI Bugs (`admin/menu/page.tsx`):** Whole-rupee rounding on paise (`toFixed(0)`, `step="1"`), missing modal image preview, missing `onError` on row `<Image>`, misleading *"Items inside this category will become unassigned"* copy in category delete modal, and unawaited `adminLogout()` in `handleLogout`.
4. **Placeholder Brand Details (`order/page.tsx`):** Hardcoded hero dish (`Chocolava cake sundae`, `₹160`), hardcoded `[ADDRESS]`, `[OPENING HOURS]`, `[PHONE/WHATSAPP]`, `[INSTAGRAM]`, `[WHATSAPP LINK]`, and unused `categories` / `errorMessage` states.
5. **Minor Auth Type Mismatch:** `AuthService.login()` returns `admin: { id, name, email }` without `role`, while `AdminLoginResponse` in `frontend/types/admin.ts` types `admin` as `AdminUser` (requiring `role: 'ADMIN'`).
6. **Cart vs. Backend Rounding Inconsistency:** `CartContext` sums exact paise (`foodItem.price * quantity`), whereas `CartItem` / `CartBottomBar` / `CartDrawer` display `Math.round(price / 100)`, which can differ by ₹1 if paise-level prices exist.

---

## 17. Completion Assessment and Development Roadmap

### Completion Assessment
- **README Phase Claims vs. Actual Reality:** Root `README.md` marks Phases 1–13 `[x]` Completed and Phases 14–18 `[ ]` Pending. Actual inspection shows Phases 1–3, 6–8, and 13 are largely implemented (with minor gaps/errors), whereas **Phases 4, 5, 9, 10, 11, and 12 are functionally partial**: core backend CRUD/Socket.IO infrastructure works, **but** frontend integration gaps (`createOrderSocket()` missing token on `/admin`, missing `PREPARING`/`READY`/`COMPLETED` controls & customer timeline stages, static `MENU_SECTIONS` masking custom DB menu edits, and ESLint/test failures) block production sign-off.
- **Estimated Readiness:** Backend core APIs & schemas are mature (~80–85% complete, pending security hardening, inactive-category enforcement, and E2E/unit test fixes). Frontend customer & admin flows are ~70–75% complete due to the dashboard socket/workflow gaps, static menu coupling, placeholder footer, and React 19 lint errors.

### Recommended Priority Roadmap
1. **P0 — Fix Critical Real-Time, Workflow & Data Integrity Bugs:**
   - Pass `token` into `createOrderSocket(token)` on `/admin` (`app/admin/page.tsx:332`) and fix logout/error handling.
   - Add UI controls and filters for `PREPARING`, `READY`, and `COMPLETED` in `/admin` and `/admin/orders/[id]`, and expand `/order-success` `ORDER_TIMELINE` to reflect all non-cancelled stages.
   - Refactor `/order` (`buildHydratedSections` / `OrderPage`) to render live backend categories and items dynamically (preserving editorial theme/photos via metadata or mapping without inventing un-orderable `client_*` IDs).
   - Enforce parent `Category.isActive === true` checks in `FoodItemsService.findAvailable`, `findByIdPublic`, and `OrdersService.create`.
2. **P0 — Harden Security & Config:**
   - Remove hardcoded JWT fallback secrets in `auth.module.ts`, `jwt.strategy.ts`, `orders.gateway.ts`; enforce `@IsNotEmpty()` + `@MinLength(32)` on `JWT_SECRET` and `@IsNotEmpty()` on `DATABASE_URL` in `env.validation.ts`.
   - Protect `POST /auth/admin/logout` (implement short-lived token blacklist/JTI revocation if stateless JWTs must be invalidated immediately) and add request rate limiting (`@nestjs/throttler`) + Helmet.
   - Update `seed-menu.ts` with a safe flag or stop deleting custom admin categories unexpectedly on rerun.
3. **P1 — Fix Tests, Typechecks & ESLint Failures:**
   - Reconcile `menu-management.spec.ts` lines `521–522` with the current 6-category / 59-item catalog (or align tests cleanly with seeded data).
   - Fix `supertest/types` `TS2307` in `backend/test/*.e2e-spec.ts` and either override `DatabaseModule` cleanly in E2E unit simulations or separate true MongoDB integration E2E tests.
   - Resolve all `17` frontend ESLint errors (`set-state-in-effect`, `no-explicit-any`, `no-unescaped-entities`) and `17` warnings; verify `npm --prefix frontend run build` and `npm --prefix backend run build`.
4. **P2 — Polish, Asset Cleanup & Real-Device Testing:**
   - Replace hero card hardcoding and `[ADDRESS]`/`[WHATSAPP]` footer placeholders in `order/page.tsx`; deduplicate `/images/` vs `/menu/` assets and remove orphaned `FoodCard.tsx` / `CategoryBar.tsx`; add image preview & accurate soft-delete wording in `/admin/menu`.
   - Initialize Git (`.git`), document backup/MongoDB seeding runbook, and execute live LAN mobile QR + Socket.IO E2E acceptance testing.

---

## 18. Final Technical Handover Summary

- **What Works Today (Verified):**
  - Clean modular NestJS 12 backend with Mongoose 9 schemas, integer paise accounting, atomic `Asia/Kolkata` daily `OrderCounter`, immutable `OrderItem` snapshots, bcrypt password hashing, JWT guard/strategy (`401`/`403` role enforcement), `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`), and Socket.IO gateway authentication & rooms (`admin-orders`, `order:<id>`).
  - Backend `oxlint` (`0` errors), backend `tsconfig.build.json` (`0` errors), frontend `tsc --noEmit` (`0` errors), frontend `qr.ts` unit suite (`12/12` pass), and `193/194` mocked backend unit tests pass.
  - Client-side QR generator (`/admin/qr`) renders and exports branded PNG standees for tables `1–100` cleanly.
- **Immediate Gotchas for the Next Developer:**
  1. **Not a Git repo:** Back up or `git init` before refactoring.
  2. **`/admin` Socket.IO silently drops into customer mode** because `createOrderSocket()` lacks `token`; `/admin/orders/[id]` passes `token` and works.
  3. **Only `NEW -> ACCEPTED` and `CANCELLED` work in the UI**, even though the backend supports `PREPARING -> READY -> COMPLETED`.
  4. **`/order` renders static `MENU_SECTIONS`** (`menuData.ts`) and turns offline/unmatched items into un-orderable `client_*` IDs; custom categories created in `/admin/menu` will NOT appear on `/order`.
  5. **Running `npm --prefix backend run seed:menu` wipes custom non-seed categories** (`seed-menu.ts:588–595`).
  6. **1 failing test (`menu-management.spec.ts` `6` vs `8`), `2` backend E2E TS/MongoDB issues, and `34` frontend ESLint problems (`17` errors, `17` warnings)** must be cleared before CI/production deployment.
  7. **Secrets & Environment:** Never commit `backend/.env` or `frontend/.env*`, and immediately rotate/remove hardcoded fallback JWT secrets before production.
