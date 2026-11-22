'use client';

import React, { useEffect, useState } from 'react';
import { MENU_SECTIONS } from '@/lib/menuData';

export interface CategoryNavSection {
  id: string;
  title: string;
  tagline: string;
}

interface CategoryNavProps {
  activeSection: string;
  onSelectSection: (id: string) => void;
  sections?: CategoryNavSection[];
}

export function CategoryNav({
  activeSection,
  onSelectSection,
  sections = MENU_SECTIONS,
}: CategoryNavProps) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Trigger sticky elevation shadow after passing initial hero
      setIsSticky(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      aria-label="Menu categories navigation"
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isSticky
          ? 'bg-[#FBF7F2]/95 backdrop-blur-md shadow-xs border-b border-[#6A0019]/15'
          : 'bg-[#FBF7F2] border-b border-[#6A0019]/10'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar py-3.5 gap-2 sm:gap-3">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => onSelectSection(section.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#6A0019] text-[#EFE6DC] shadow-xs'
                    : 'text-[#6A0019]/75 hover:text-[#6A0019] hover:bg-[#6A0019]/5'
                }`}
              >
                <span>{section.title}</span>
                <span className="hidden md:inline ml-1.5 opacity-60 text-[10px] uppercase tracking-widest">
                  · {section.tagline}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
