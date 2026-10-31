'use client';

import React, { useState } from 'react';
import { UtensilsCrossed, Hash, Edit2, Check } from 'lucide-react';
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Restaurant Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-sm shadow-amber-500/20">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-stone-900 tracking-tight">
              Cream Treat
            </h1>
            <p className="text-xs text-stone-500 font-medium">Digital Dine-In Menu</p>
          </div>
        </div>

        {/* Table Number Badge */}
        <div>
          {isEditingTable ? (
            <form onSubmit={handleSaveTable} className="flex items-center gap-1.5">
              <div className="relative">
                <Hash className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={tempTable}
                  onChange={(e) => setTempTable(e.target.value)}
                  placeholder="Table"
                  className="w-18 pl-6 pr-2 py-1 text-xs font-semibold bg-stone-100 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="p-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                title="Save table"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setTempTable(tableNumber ? tableNumber.toString() : '');
                setIsEditingTable(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
                tableNumber
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  : 'bg-stone-100 text-stone-700 border border-stone-300 hover:bg-stone-200'
              }`}
              title="Click to change table number"
            >
              <Hash className="w-3.5 h-3.5 text-amber-600" />
              <span>{tableNumber ? `Table ${tableNumber}` : 'Set Table'}</span>
              <Edit2 className="w-2.5 h-2.5 opacity-60 ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
