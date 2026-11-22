'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  AlertCircle,
  QrCode,
  X,
  Hash,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Category, FoodItem } from '@/types/menu';
import { fetchCategories, fetchFoodItems } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { Navbar } from '@/components/Navbar';
import { CategoryNav } from '@/components/CategoryNav';
import { FeaturedPhotoGrid } from '@/components/FeaturedPhotoGrid';
import { TypographicItemList } from '@/components/TypographicItemList';
import { CartBottomBar } from '@/components/CartBottomBar';
import { CartDrawer } from '@/components/CartDrawer';
import { CocoaPodWatermark } from '@/components/CocoaPodWatermark';
import { MenuSkeleton } from '@/components/MenuSkeleton';
import { parseTableUrlParam, validateCustomerTableNumber } from '@/lib/qr';
import { buildHydratedSections } from '@/lib/menuMapper';

function OrderMenuContent() {
  const searchParams = useSearchParams();
  const { setTableNumber, tableNumber } = useCart();

  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSection, setActiveSection] = useState<string>('sundae');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Table Parameter Handling & Modal
  const [isInvalidTableParam, setIsInvalidTableParam] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [manualTableInput, setManualTableInput] = useState('');
  const [manualTableError, setManualTableError] = useState<string | null>(null);

  // Cart Drawer State
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Automatically sync table number from query parameters (e.g. /order?table=5)
  useEffect(() => {
    const rawParam = searchParams.get('table');

    if (rawParam !== null) {
      const parsed = parseTableUrlParam(rawParam);
      if (parsed.status === 'VALID') {
        setTableNumber(parsed.tableNumber);
        setIsInvalidTableParam(false);
      } else {
        setIsInvalidTableParam(true);
        setTableNumber(null);
      }
    } else {
      setIsInvalidTableParam(false);
    }
  }, [searchParams, setTableNumber]);

  // Load menu data from backend API
  const loadMenu = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [categoriesData, itemsData] = await Promise.all([
        fetchCategories(),
        fetchFoodItems(),
      ]);

      setCategories(categoriesData);
      setFoodItems(itemsData);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to load the live menu right now. Please try again.';
      console.error('[Cream Treat Menu] Failed to fetch live menu:', err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // Hydrate the canonical editorial sections (only when live backend items exist)
  const hydratedSections = useMemo(() => {
    if (foodItems.length === 0) {
      return [];
    }
    return buildHydratedSections(foodItems, searchQuery, categories);
  }, [foodItems, searchQuery, categories]);

  const visibleSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return hydratedSections;
    }
    return hydratedSections.filter((section) => section.totalItemsCount > 0);
  }, [hydratedSections, searchQuery]);

  // Scrollspy to detect active section dynamically
  useEffect(() => {
    const sectionIds = visibleSections.map((s) => s.id);
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    });

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [visibleSections]);

  const handleScrollToSection = (id: string) => {
    setActiveSection(id);
    const target = document.getElementById(id);
    if (target) {
      const navOffset = 68;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  // Save manual table number from modal
  const handleSaveManualTable = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateCustomerTableNumber(manualTableInput);
    if (!res.isValid || res.value === undefined) {
      setManualTableError(res.error || 'Please enter a valid table number (1–999).');
      return;
    }

    setTableNumber(res.value);
    setIsInvalidTableParam(false);
    setManualTableError(null);
    setIsScanModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FBF7F2] text-[#6A0019] font-body selection:bg-[#6A0019] selection:text-[#EFE6DC]">
      {/* ─────────────────────────────────────────────────────────────
          1. RESTAURANT MASTHEAD & TABLE BADGE
          ───────────────────────────────────────────────────────────── */}
      <Navbar />

      {/* Invalid Table Number Banner */}
      {isInvalidTableParam && (
        <div
          id="invalid-table-banner"
          className="max-w-6xl mx-auto mx-4 sm:mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-start gap-3 shadow-2xs"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">Invalid table number.</p>
            <p className="text-xs text-rose-700 mt-0.5">
              The table parameter in your link was not recognized. Please scan the QR code on your dining table.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                id="scan-return-qr-invalid-button"
                onClick={() => {
                  setManualTableInput('');
                  setManualTableError(null);
                  setIsScanModalOpen(true);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan / Enter Table</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Table Notice: When opened at /order without a table number */}
      {!isInvalidTableParam && !tableNumber && (
        <div
          id="missing-table-banner"
          className="max-w-6xl mx-auto mx-4 sm:mx-6 mt-4 p-3.5 bg-[#EFE6DC] border border-[#6A0019]/20 rounded-2xl text-[#6A0019] text-xs flex items-start gap-3 shadow-2xs"
        >
          <QrCode className="w-5 h-5 text-[#6A0019] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">
              Please scan the QR code on your table to start your order.
            </p>
            <p className="text-xs text-[#6A0019]/80 mt-0.5 leading-relaxed font-body">
              Each dining table has a unique QR code so we deliver your fresh food directly to you.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                id="scan-return-qr-button"
                onClick={() => {
                  setManualTableInput('');
                  setManualTableError(null);
                  setIsScanModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-[#6A0019] hover:bg-[#520013] active:scale-95 text-[#EFE6DC] rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer font-display uppercase tracking-wider"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Set Table Number</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION (Editorial Patisserie Header)
          ───────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden pt-8 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b border-[#6A0019]/15">
        {/* Subtle Botanical Cocoa Pod Watermark */}
        <div className="absolute -top-12 -right-16 text-[#6A0019] pointer-events-none select-none z-0">
          <CocoaPodWatermark className="w-80 h-96 opacity-[0.05]" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-4 sm:space-y-6">
              <p className="font-display text-xs sm:text-sm uppercase tracking-[0.3em] font-semibold text-[#6A0019]/80">
                Editorial Patisserie & Café Menu
              </p>

              <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight text-[#6A0019] leading-[0.95]">
                Cream <br className="hidden sm:inline" />
                Treat.
              </h1>

              <p className="text-sm sm:text-base text-[#6A0019]/85 max-w-lg leading-relaxed font-normal">
                Indulgent sundaes, chilled bubble milk, and warm savoury comfort
                prepared with boutique craftsmanship. Select any item to add to
                your dine-in order.
              </p>

              {/* Search Bar within reach */}
              <div className="pt-2 max-w-md">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#6A0019]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sundaes, shakes, burgers, maggi..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white text-sm text-[#6A0019] placeholder:text-[#6A0019]/40 rounded-full border border-[#6A0019]/30 focus:outline-none focus:ring-2 focus:ring-[#6A0019] shadow-2xs font-body"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6A0019]/50 hover:text-[#6A0019] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Featured Hero Dessert Showcase */}
            <div className="lg:col-span-5">
              <figure className="relative rounded-2xl overflow-hidden border border-[#6A0019]/20 bg-[#EFE6DC]/40 p-3 shadow-xs">
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-black/5">
                  <Image
                    src="/images/chocolava-cake-sundae.jpg"
                    alt="Featured Chocolava cake sundae at Cream Treat"
                    fill
                    sizes="(max-width: 1024px) 100vw, 480px"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute top-3 left-3 bg-[#6A0019] text-[#EFE6DC] text-[10px] uppercase font-bold tracking-[0.2em] px-2.5 py-1 rounded-sm shadow-xs">
                    Signature
                  </div>
                </div>
                <figcaption className="mt-3 px-1 flex items-baseline justify-between text-[#6A0019]">
                  <div>
                    <span className="font-display font-semibold text-sm sm:text-base tracking-tight block">
                      Chocolava cake sundae
                    </span>
                    <span className="text-xs opacity-75 font-body">
                      Sweet Tooth Collection
                    </span>
                  </div>
                  <span className="font-body text-base font-bold tabular-nums">
                    ₹160
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. STICKY CATEGORY NAVIGATION (Scrollspy)
          ───────────────────────────────────────────────────────────── */}
      {!isLoading && visibleSections.length > 0 && (
        <CategoryNav
          activeSection={activeSection}
          onSelectSection={handleScrollToSection}
          sections={visibleSections}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MENU SECTIONS (Strict Order with Alternating Themes & Asymmetry)
          ───────────────────────────────────────────────────────────── */}
      <main className="divide-y-0 pb-32">
        {isLoading && (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <MenuSkeleton />
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-4">
            <div
              role="alert"
              className="p-5 sm:p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-display font-bold text-base text-rose-950">
                    Live Menu Currently Unavailable
                  </p>
                  <p className="text-xs sm:text-sm text-rose-800 mt-1 leading-relaxed font-body">
                    {errorMessage} Items cannot be added to your cart until the kitchen menu reconnects.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadMenu}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 active:scale-95 text-white rounded-xl text-xs font-display uppercase tracking-wider font-bold transition shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Menu
              </button>
            </div>
          </div>
        )}

        {!isLoading && !errorMessage && foodItems.length === 0 && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-4">
            <div className="p-6 bg-white border border-[#6A0019]/15 rounded-2xl text-center space-y-3 shadow-xs">
              <p className="font-display font-bold text-lg text-[#6A0019]">
                Menu Currently Updating
              </p>
              <p className="text-sm text-[#6A0019]/75 font-body max-w-md mx-auto">
                No dishes are active on the live kitchen menu yet. Please check back in a moment.
              </p>
              <button
                type="button"
                onClick={loadMenu}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] rounded-xl text-xs font-display uppercase tracking-wider font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Menu
              </button>
            </div>
          </div>
        )}

        {!isLoading &&
          !errorMessage &&
          foodItems.length > 0 &&
          searchQuery.trim() &&
          visibleSections.length === 0 && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-4">
              <div className="p-6 bg-white border border-[#6A0019]/15 rounded-2xl text-center space-y-3 shadow-xs">
                <p className="font-display font-bold text-lg text-[#6A0019]">
                  No Dishes Found
                </p>
                <p className="text-sm text-[#6A0019]/75 font-body">
                  No menu items matched &ldquo;{searchQuery.trim()}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] rounded-xl text-xs font-display uppercase tracking-wider font-bold transition cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            </div>
          )}

        {!isLoading &&
          visibleSections.map((section) => {
            const isLight = section.theme === 'light';
            const sectionBg = isLight ? 'bg-[#FBF7F2]' : 'bg-[#6A0019]';
            const textColor = isLight ? 'text-[#6A0019]' : 'text-[#EFE6DC]';
            const ruleColor = isLight ? 'border-[#6A0019]' : 'border-[#EFE6DC]';
            const subtitleColor = isLight
              ? 'text-[#6A0019]/70'
              : 'text-[#EFE6DC]/75';
            const isPhotoLeft = section.imagePlacement === 'left';

            return (
              <section
                key={section.id}
                id={section.id}
                className={`relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 ${sectionBg} ${textColor} transition-colors duration-500`}
              >
                {/* Botanical Watermark on select sections */}
                {(section.id === 'mains' || section.id === 'mojito') && (
                  <div
                    className={`absolute ${
                      section.id === 'mains'
                        ? 'bottom-8 right-6 text-[#6A0019]'
                        : 'top-8 left-6 text-[#EFE6DC]'
                    } pointer-events-none select-none z-0`}
                  >
                    <CocoaPodWatermark className="w-96 h-96 opacity-[0.05]" />
                  </div>
                )}

                <div className="max-w-6xl mx-auto relative z-10">
                  {/* Section Header */}
                  <div className="mb-10 sm:mb-14">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3">
                      <div>
                        <p
                          className={`text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] ${subtitleColor}`}
                        >
                          {section.tagline}
                        </p>
                        <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
                          {section.title}
                        </h2>
                      </div>

                      <span
                        className={`text-xs uppercase tracking-widest font-mono opacity-60 ${textColor}`}
                      >
                        Cream Treat Menu
                      </span>
                    </div>

                    {/* Thin Rule Echoing the Printed Menu */}
                    <div
                      className={`w-full border-b ${ruleColor} opacity-90`}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Asymmetric 2-Column Content Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
                    {/* Featured Photo Highlights Column */}
                    {section.featuredDishes.length > 0 && (
                      <div
                        className={`lg:col-span-6 ${
                          isPhotoLeft ? 'lg:order-1' : 'lg:order-2'
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-1">
                            <span
                              className={`text-xs uppercase tracking-[0.2em] font-semibold opacity-75 ${textColor}`}
                            >
                              Featured Highlights
                            </span>
                            <span
                              className={`text-[11px] font-mono opacity-50 ${textColor}`}
                            >
                              {section.featuredDishes.length} captured
                            </span>
                          </div>

                          <FeaturedPhotoGrid
                            dishes={section.featuredDishes}
                            theme={section.theme}
                            sectionId={section.id}
                          />
                        </div>
                      </div>
                    )}

                    {/* Typographic Item List Column */}
                    <div
                      className={`${
                        section.featuredDishes.length > 0
                          ? 'lg:col-span-6'
                          : 'lg:col-span-12'
                      } ${isPhotoLeft ? 'lg:order-2' : 'lg:order-1'}`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-1">
                          <span
                            className={`text-xs uppercase tracking-[0.2em] font-semibold opacity-75 ${textColor}`}
                          >
                            Full Selection
                          </span>
                          <span
                            className={`text-[11px] font-mono opacity-50 ${textColor}`}
                          >
                            Tabular Prices (INR)
                          </span>
                        </div>

                        <TypographicItemList
                          items={section.items}
                          subgroups={section.subgroups}
                          theme={section.theme}
                        />

                        {/* Seasonal note in Mojito */}
                        {section.note && (
                          <div
                            className={`mt-8 p-4 rounded-xl border ${
                              isLight
                                ? 'border-[#6A0019]/20 bg-[#6A0019]/5'
                                : 'border-[#EFE6DC]/25 bg-[#EFE6DC]/10'
                            }`}
                          >
                            <p className="font-display italic text-sm tracking-wide text-center">
                              ✦ {section.note}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          5. FOOTER (Details, Seasonal Callout & Placeholders)
          ───────────────────────────────────────────────────────────── */}
      <footer
        id="footer-info"
        className="bg-[#520013] text-[#EFE6DC] pt-16 pb-28 px-4 sm:px-6 lg:px-8 border-t border-[#EFE6DC]/20 relative overflow-hidden"
      >
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="mb-14 py-4 px-6 rounded-2xl border border-[#EFE6DC]/25 bg-[#6A0019] text-center">
            <p className="font-display text-sm sm:text-base tracking-wide font-medium">
              ✦ Note: Fresh fruit juice available as per season.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12 pb-14 border-b border-[#EFE6DC]/15">
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#EFE6DC]/30 p-0.5 bg-[#EFE6DC] shrink-0">
                  <Image
                    src="/images/cream-treat-logo.jpg"
                    alt="Cream Treat Logo"
                    fill
                    sizes="40px"
                    className="object-cover rounded-full"
                  />
                </div>
                <span className="font-display font-bold text-xl tracking-wider text-[#EFE6DC] uppercase">
                  Cream Treat
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#EFE6DC]/80 leading-relaxed max-w-sm">
                A modern boutique dessert and snack café. From handcrafted
                faloodas and layered sundaes to toasted sandwiches and cheesy
                comfort snacks.
              </p>
              <div className="pt-2">
                <a
                  href="https://wa.me/918904922648"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#EFE6DC] text-[#6A0019] font-display text-xs uppercase tracking-[0.18em] font-bold hover:bg-white transition-colors shadow-xs"
                >
                  <span>Order on WhatsApp</span>
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>

            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="space-y-2">
                <h4 className="font-display text-xs uppercase tracking-[0.2em] font-bold text-[#EFE6DC]">
                  Address
                </h4>
                <div className="text-xs text-[#EFE6DC]/80 leading-relaxed font-sans space-y-0.5">
                  <p className="font-semibold text-[#EFE6DC]">No. 1424, Ground Floor,</p>
                  <p>14th Main Road, 1st Stage,</p>
                  <p>Kumaraswamy Layout,</p>
                  <p>Jayanagar, B.B.M.P South,</p>
                  <p>Bangalore, Karnataka – 560111</p>
                </div>
                <p className="text-[11px] text-[#EFE6DC]/60 pt-1 font-sans">
                  Prop. Kokila Gayathri B K
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-display text-xs uppercase tracking-[0.2em] font-bold text-[#EFE6DC]">
                  Opening Hours
                </h4>
                <div className="text-xs text-[#EFE6DC]/80 leading-relaxed font-sans space-y-1">
                  <p className="font-medium text-[#EFE6DC]">Monday – Sunday</p>
                  <p className="font-mono text-sm text-[#EFE6DC] font-semibold">11:30 AM – 11:00 PM</p>
                  <p className="text-[11px] text-[#EFE6DC]/60 pt-0.5">Dine-in & Takeaway</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-display text-xs uppercase tracking-[0.2em] font-bold text-[#EFE6DC]">
                  Connect
                </h4>
                <div className="space-y-1.5 text-xs text-[#EFE6DC]/80 font-sans">
                  <p>
                    <span className="opacity-60">Phone: </span>
                    <a
                      href="tel:+918904922648"
                      className="font-mono font-medium hover:underline text-[#EFE6DC]"
                    >
                      +91 89049 22648
                    </a>
                  </p>
                  <p>
                    <span className="opacity-60">WhatsApp: </span>
                    <a
                      href="https://wa.me/918904922648"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-medium hover:underline text-[#EFE6DC]"
                    >
                      8904922648
                    </a>
                  </p>
                  <p>
                    <span className="opacity-60">Social: </span>
                    <span className="text-[#EFE6DC] font-medium">@creamtreats</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-[#EFE6DC]/60">
            <span>© 2026 Cream Treat (@CREAM TREATS / Kokila Gayathri B K). All rights reserved.</span>
            <span>Editorial Patisserie & Snack Menu</span>
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          6. STICKY BOTTOM CART BAR & CART DRAWER
          ───────────────────────────────────────────────────────────── */}
      <CartBottomBar onOpenCart={() => setIsCartDrawerOpen(true)} />

      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
      />

      {/* Interactive Scan / Return to QR Guide Modal */}
      {isScanModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#FBF7F2] rounded-3xl max-w-sm w-full p-6 shadow-xl border border-[#6A0019]/25 text-center relative text-[#6A0019]">
            <button
              type="button"
              onClick={() => setIsScanModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-[#6A0019]/50 hover:text-[#6A0019] rounded-lg hover:bg-[#6A0019]/10 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-[#EFE6DC] text-[#6A0019] border border-[#6A0019]/25 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
              <QrCode className="w-7 h-7" />
            </div>

            <h3 className="text-base font-display font-bold tracking-tight">
              Table QR Code
            </h3>
            <p className="text-xs text-[#6A0019]/75 mt-1 leading-relaxed font-body">
              Point your phone camera at the QR code stand placed on your table.
            </p>

            {/* Fallback Table Entry Option */}
            <div className="mt-5 pt-4 border-t border-[#6A0019]/15 text-left">
              <label
                htmlFor="modalTableInput"
                className="block text-[11px] font-bold text-[#6A0019] uppercase tracking-wider mb-1.5 flex items-center gap-1 font-display"
              >
                <Hash className="w-3 h-3 text-[#6A0019]" />
                <span>Or Enter Table Number:</span>
              </label>

              <form onSubmit={handleSaveManualTable} className="flex gap-2">
                <input
                  id="modalTableInput"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={manualTableInput}
                  onChange={(e) => {
                    setManualTableInput(e.target.value);
                    if (manualTableError) setManualTableError(null);
                  }}
                  placeholder="e.g. 5"
                  className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#6A0019]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer font-display"
                >
                  <Check className="w-3 h-3" />
                  <span>Set</span>
                </button>
              </form>

              {manualTableError && (
                <p className="mt-1.5 text-[11px] text-rose-600 font-medium">
                  {manualTableError}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsScanModalOpen(false)}
              className="mt-4 w-full py-2 bg-[#EFE6DC] hover:bg-[#EFE6DC]/80 text-[#6A0019] text-xs font-semibold rounded-xl transition cursor-pointer font-display uppercase tracking-wider"
            >
              Continue Browsing Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF7F2] p-4">
          <MenuSkeleton />
        </div>
      }
    >
      <OrderMenuContent />
    </Suspense>
  );
}
