# Cream Treat — QR Food Ordering System

A dedicated, fast, mobile-first QR-based digital food ordering system for the Cream Treat restaurant.

---

## 🍽️ System Overview

Cream Treat QR Food Ordering provides a frictionless dine-in ordering workflow:
1. **Dine-In Customer**: Scans a table-specific QR code (e.g., `/order?table=5`), browses menu categories and food items, adds items to cart, and submits orders with automatic table assignment and order tracking.
2. **Restaurant Staff / Admin**: Real-time admin dashboard displaying incoming orders with live status updates (NEW → ACCEPTED → PREPARING → READY → COMPLETED), along with category/menu management and table QR generation.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
  - Customer mobile-first ordering interface
  - Restaurant admin management portal
- **Backend**: NestJS 12, TypeScript, REST API & WebSockets (Socket.IO)
- **Database**: MongoDB / MongoDB Atlas via Mongoose (`@nestjs/mongoose`)
- **Real-Time**: Socket.IO for instant kitchen/admin order notifications
- **Security & Validation**: Admin JWT, Bcrypt password hashing, global `ValidationPipe` (`whitelist`, `transform`, `forbidNonWhitelisted`), `ParseObjectIdPipe`, centralized `@nestjs/config` with strict validation

---

## 📁 Project Structure

```text
Cream Treat/
├── frontend/                     # Next.js Application (Customer & Admin)
│   ├── app/                      # Next.js App Router (pages & layouts)
│   ├── components/               # Reusable UI & menu components
│   ├── hooks/                    # Custom React hooks (cart, socket, order)
│   ├── lib/                      # Utilities, API client & socket client
│   ├── types/                    # Shared TypeScript interfaces & types
│   ├── public/                   # Static assets & icons
│   ├── .env.example              # Frontend environment template
│   ├── .env.local                # Local development environment
│   └── package.json
│
├── backend/                      # NestJS REST & Real-time API
│   ├── src/
│   │   ├── database/             # Mongoose connection & DatabaseModule
│   │   │   ├── database.module.ts# Mongoose connection & credential masking
│   │   │   └── seed.ts           # Development admin idempotent seed script
│   │   ├── auth/                 # Admin authentication module
│   │   │   ├── schemas/admin.schema.ts
│   │   │   └── auth.module.ts
│   │   ├── menu/                 # Categories & Food Items REST API
│   │   │   ├── dto/              # DTOs with class-validator rules
│   │   │   ├── schemas/          # Category & FoodItem Mongoose schemas
│   │   │   ├── categories.service.ts
│   │   │   ├── food-items.service.ts
│   │   │   ├── menu.controller.ts       # Public customer menu endpoints
│   │   │   ├── admin-menu.controller.ts # Admin menu management endpoints
│   │   │   └── menu.module.ts
│   │   ├── orders/               # Orders module & snapshot schemas
│   │   │   ├── schemas/order.schema.ts
│   │   │   ├── schemas/order-item.schema.ts
│   │   │   └── orders.module.ts
│   │   ├── admin/                # Admin endpoints & dashboard metrics
│   │   ├── qr/                   # Table QR code generation service
│   │   ├── common/               # Config validation, pipes, filters
│   │   │   └── pipes/parse-object-id.pipe.ts
│   │   ├── app.controller.ts     # Root info (/) and Health check (/health)
│   │   ├── app.service.ts        # Health check & system diagnostics
│   │   ├── app.module.ts         # Root NestJS module
│   │   └── main.ts               # Server bootstrap (CORS, ValidationPipe, Port 3001)
│   ├── test/                     # Vitest E2E test suites
│   ├── .env.example              # Backend environment template
│   ├── .env                      # Local development environment
│   └── package.json
│
├── .gitignore                    # Global repository gitignore
└── README.md                     # Project documentation
```

---

## ⚙️ Environment Configuration

### Frontend (`frontend/.env.example`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Backend (`backend/.env.example`)
```env
PORT=3001
# Local option:
DATABASE_URL=mongodb://localhost:27017/cream-treat
# MongoDB Atlas option (Free M0 cluster):
# DATABASE_URL=mongodb+srv://<username>:<password>@<cluster-address>.mongodb.net/cream-treat?retryWrites=true&w=majority
JWT_SECRET=cream_treat_dev_secret_key_2026_qr_ordering
FRONTEND_URL=http://localhost:3000

# Development Seed Admin Account (Change in production!)
SEED_ADMIN_NAME=Cream Treat Admin
SEED_ADMIN_EMAIL=admin@creamtreat.local
SEED_ADMIN_PASSWORD=Admin@CreamTreat2026!
```

---

## 📋 Menu REST APIs (Phase 4)

### 1. Public Customer Endpoints (`/menu`)
These endpoints are public and accessed by customer mobile clients scanning table QR codes:

| Method | Endpoint | Query Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/menu/categories` | None | Returns active categories (`isActive: true`) sorted by `displayOrder: 1, name: 1`. |
| `GET` | `/menu/items` | `categoryId` *(optional)* | Returns available food items (`isAvailable: true`) populated with category information. |
| `GET` | `/menu/items/:id` | None | Returns a single available food item. Rejects invalid IDs (HTTP 400) or missing items (HTTP 404). |

### 2. Admin Management Endpoints (`/admin`)
These endpoints allow the restaurant manager to create, edit, reorder, or deactivate categories and food items:

#### Category Management:
| Method | Endpoint | Payload | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/categories` | None | Lists all categories (active and inactive) sorted by `displayOrder`. |
| `POST` | `/admin/categories` | `{ name, description?, displayOrder?, isActive? }` | Creates a new category. |
| `PATCH` | `/admin/categories/:id`| `{ name?, description?, displayOrder?, isActive? }` | Updates category details or display order. |
| `DELETE` | `/admin/categories/:id`| None | Deletes category if no food items exist; soft-deactivates if items are attached. |

#### Food Item Management:
| Method | Endpoint | Payload | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/items` | `categoryId` *(optional)* | Lists all food items (including unavailable) populated with category details. |
| `GET` | `/admin/items/:id` | None | Returns single food item details. |
| `POST` | `/admin/items` | `{ categoryId, name, description?, price, imageUrl?, isAvailable?, displayOrder? }` | Creates a food item. `price` is in **integer paise** (e.g. ₹120 = `12000`). Validates category existence. |
| `PATCH` | `/admin/items/:id` | `{ categoryId?, name?, description?, price?, imageUrl?, isAvailable?, displayOrder? }` | Updates food item details, price, or availability toggle. |
| `DELETE` | `/admin/items/:id` | None | Permanently removes the food item. |

### 3. Validation & Money Strategy
- **Integer Paise Representation**: All prices are validated as non-negative integers (`@IsInt()`, `@Min(0)`). For example, ₹150.00 is represented as `15000` paise.
- **ObjectId Validation**: Parameters in route paths are validated using `ParseObjectIdPipe`. Malformed IDs immediately return HTTP 400.
- **DTO Safety**: Global `ValidationPipe` strips non-whitelisted properties and enforces strict types.

---

## 🗄️ Database Models & Architecture

### 1. Data Models
- **`Admin`**: Administrator credentials for restaurant staff and management.
- **`Category`**: Food categories (e.g. Momos, Soup, Mains, Drinks, Desserts).
- **`FoodItem`**: Menu items referencing categories with price and availability.
- **`OrderItem`**: Embedded order snapshots preserving name and price at checkout time.
- **`Order`**: Dine-in customer orders with table numbers, totals, and lifecycle statuses.

### 2. Development Seed System
```bash
cd backend
npm run seed
```
- **Bcrypt Hashing**: Hashes passwords using bcrypt with salt rounds = 10.
- **Menu Integrity**: **No restaurant menu data is included in the seed because the actual menu will be entered from the restaurant's provided physical menu.**

---

## 🚀 Running the Project Locally

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **npm**: v9+ (tested on npm v11)

### 2. Backend (NestJS API on port 3001)
```bash
cd backend
npm install
npm run start:dev
```
- API root: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- Seed database: `npm run seed`
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`
- Build check: `npm run build`

### 3. Frontend (Next.js on port 3000)
```bash
cd frontend
npm install
npm run dev
```
- Web application: `http://localhost:3000`
- Build check: `npm run build`

---

## 📱 Customer Digital Menu (Phase 5)

The mobile-first digital ordering experience is available at `/order` and `/order?table=<number>`:
- **Automatic Table Detection**: Scanning a table QR code (e.g. `/order?table=5`) detects Table 5, stores it in state & `localStorage`, and displays an editable table badge.
- **Category Navigation**: Horizontal scrolling category pill bar (`CategoryBar`) for instant category switching.
- **Search Filtering**: Real-time dish and drink search bar.
- **Restaurant Food Cards (`FoodCard`)**:
  - Dish name, description, and price (converted from integer paise to INR `₹`).
  - Dish image or clean stylized restaurant placeholder.
  - Interactive stepper: initial `[ ADD ]` button transforms into `[-] 2 [+]` quantity controls.
- **Floating Bottom Cart Preview (`CartBottomBar`)**:
  - Automatically appears when items are selected (e.g. `2 items • ₹240`).
  - Provides a 1-tap navigation button directly into `/cart?table=...`.
- **Loading & Error States**: `MenuSkeleton` prevents blank screens, and friendly error banners provide an instant retry button if the backend is waking up or offline.

---

## 🛒 Customer Cart & Order Review (Phase 6)

The dedicated customer cart and order review interface is available at `/cart` and `/cart?table=<number>`:
- **Item Breakdown (`CartItem`)**: Displays dish name, unit price (`₹X each`), quantity stepper controls `[-] 2 [+]`, item total, and instant removal (`Trash2` button).
- **Quantity Controls**: Tapping `[-]` decrements quantity and auto-removes the item when reaching 0; tapping `[+]` increments quantity.
- **Table Number Validation**:
  - Automatically preserves detected table number from `/order?table=5`.
  - If table number is missing or opened directly at `/cart`, an interactive table entry card prompts the customer with validation (positive whole number 1–999).
- **Add More Items Navigation**: A prominent `+ Add More Items` button routes back to `/order?table=...` without clearing the cart.
- **Order Summary**: Displays exact Subtotal and Total in integer paise currency format. Total equals Subtotal with zero hidden taxes, convenience fees, or service charges.
- **Empty Cart State**: Shows a clean empty state with a direct `[ Browse Menu ]` action button.
- **Place Order Validation**: Validates that the cart has at least 1 item and a valid table number is set before permitting order review confirmation (actual database order creation is reserved for Phase 7).

---

## 📋 Implementation Roadmap

- [x] **Phase 1: Project setup and architecture** *(Completed)*
- [x] **Phase 2: MongoDB + NestJS backend setup** *(Completed)*
- [x] **Phase 3: Database models + seed system** *(Completed)*
- [x] **Phase 4: Menu APIs** *(Completed)*
- [x] **Phase 5: Customer digital menu** *(Completed)*
- [x] **Phase 6: Cart system** *(Completed)*
- [ ] **Phase 7: Order creation + order number**
- [ ] **Phase 8: Admin authentication**
- [ ] **Phase 9: Admin dashboard**
- [ ] **Phase 10: Real-time order notifications**
- [ ] **Phase 11: Customer order tracking**
- [ ] **Phase 12: Admin menu management**
- [ ] **Phase 13: QR / Table management**
- [ ] **Phase 14: UI polish + responsive design**
- [ ] **Phase 15: Testing + bug fixing**
- [ ] **Phase 16: Production preparation**
- [ ] **Phase 17: Deployment**
- [ ] **Phase 18: Real restaurant testing**


