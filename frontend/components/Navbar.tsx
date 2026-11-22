'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Hash, Edit2, Check } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { validateCustomerTableNumber } from '@/lib/qr';

export function Navbar() {
  const { tableNumber, setTableNumber } = useCart();
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [tempTable, setTempTable] = useState(tableNumber ? tableNumber.toString() : '');

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateCustomerTableNumber(tempTable);
    if (res.isValid && res.value !== undefined) {
      setTableNumber(res.value);
      setIsEditingTable(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FBF7F2]/95 backdrop-blur-md border-b border-[#6A0019]/15 text-[#6A0019]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Restaurant Branding with Logo Medallion */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-[#6A0019]/30 p-0.5 bg-[#EFE6DC] shrink-0 shadow-xs">
            <Image
              src="/images/cream-treat-logo.jpg"
              alt="Cream Treat Logo"
              fill
              sizes="40px"
              className="object-cover rounded-full"
              priority
            />
          </div>
          <div>
            <span className="font-display font-extrabold text-base sm:text-lg tracking-wider uppercase block leading-tight text-[#6A0019]">
              Cream Treat
            </span>
            <span className="text-[10px] sm:text-[11px] tracking-[0.2em] uppercase font-semibold opacity-70 block font-body">
              Dine-In Menu
            </span>
          </div>
        </div>

        {/* Table Number Badge */}
        <div>
          {isEditingTable ? (
            <form onSubmit={handleSaveTable} className="flex items-center gap-1.5">
              <div className="relative">
                <Hash className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6A0019]/50" />
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={tempTable}
                  onChange={(e) => setTempTable(e.target.value)}
                  placeholder="Table #"
                  className="w-20 pl-7 pr-2 py-1 text-xs font-bold font-body text-[#6A0019] bg-white border border-[#6A0019]/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="p-1.5 bg-[#6A0019] text-[#EFE6DC] font-bold rounded-lg hover:bg-[#520013] transition-colors cursor-pointer"
                title="Save table"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setTempTable(tableNumber ? tableNumber.toString() : '');
                setIsEditingTable(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-body transition-all border border-[#6A0019]/25 bg-[#6A0019]/5 text-[#6A0019] hover:bg-[#6A0019]/10 cursor-pointer shadow-2xs"
              title="Click to change table number"
            >
              <Hash className="w-3 h-3 text-[#6A0019]" />
              <span>{tableNumber ? `Table ${tableNumber}` : 'Set Table'}</span>
              <Edit2 className="w-2.5 h-2.5 opacity-60 ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
