'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Save, ShieldCheck } from 'lucide-react';
import { GstSettings, UpdateGstSettingsInput, fetchGstSettings, updateGstSettings } from '@/lib/api';

interface GstSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: GstSettings) => void;
}

export function GstSettingsModal({ isOpen, onClose, onSaved }: GstSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<UpdateGstSettingsInput>({
    shopName: 'Cream Treat',
    legalName: 'Kokila Gayathri B K',
    gstin: '',
    pan: '',
    phone: '8904922648',
    email: '',
    address: {
      line1: 'No. 1424, Ground Floor, 14th Main Road, 1st Stage, Kumaraswamy Layout',
      line2: 'Jayanagar, B.B.M.P South',
      city: 'Bangalore',
      state: 'Karnataka',
      stateCode: '29',
      pincode: '560111',
    },
    defaultHsnSac: '996331',
    gstRate: 5,
    isTaxInclusive: true,
    invoicePrefix: 'CT',
  });

  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    fetchGstSettings()
      .then((settings) => {
        setFormData({
          shopName: settings.shopName || 'Cream Treat',
          legalName: settings.legalName || '',
          gstin: settings.gstin || '',
          pan: settings.pan || '',
          phone: settings.phone || '',
          email: settings.email || '',
          address: {
            line1: settings.address?.line1 || '',
            line2: settings.address?.line2 || '',
            city: settings.address?.city || '',
            state: settings.address?.state || '',
            stateCode: settings.address?.stateCode || '',
            pincode: settings.address?.pincode || '',
          },
          defaultHsnSac: settings.defaultHsnSac || '',
          gstRate: settings.gstRate || 0,
          isTaxInclusive: settings.isTaxInclusive ?? true,
          invoicePrefix: settings.invoicePrefix || 'CT',
          financialYear: settings.financialYear,
          termsAndConditions: settings.termsAndConditions,
        });
        setIsConfigured(settings.isConfigured);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load GST settings');
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('address.')) {
      const sub = field.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [sub]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateGstSettings(formData);
      setIsConfigured(updated.isConfigured);
      setSuccess('GST Settings updated successfully!');
      if (onSaved) onSaved(updated);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save GST settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-[#E8DFD8] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FBF7F2] border-b border-[#E8DFD8]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#6A0019]" />
            <div>
              <h2 className="font-display font-bold text-sm tracking-wide uppercase text-[#6A0019]">
                GST & Business Details Configuration
              </h2>
              <p className="text-[11px] text-[#2C1810]/70">
                Configure your official GSTIN, state code, SAC, and tax rates for compliant tax invoices.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#2C1810]/60 hover:text-[#2C1810] hover:bg-[#2C1810]/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pill */}
        <div className="px-6 py-3 border-b border-[#E8DFD8]">
          {isConfigured ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>GST Compliance Active: Tax invoice generation is enabled.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">GST Configuration Incomplete</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Tax invoice generation is disabled until valid GSTIN, 2-digit state code, SAC code, and GST rate are configured.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 text-xs font-body text-[#2C1810]">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs">
              {success}
            </div>
          )}

          {/* Shop & Legal Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#6A0019]">
                Shop Trade Name *
              </label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => handleChange('shopName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none"
                placeholder="Cream Treat"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#2C1810]/70">
                Legal Entity Name
              </label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => handleChange('legalName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none"
                placeholder="e.g. Cream Treat Enterprises LLP"
              />
            </div>
          </div>

          {/* GSTIN & PAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#6A0019]">
                GSTIN (15 Digits) *
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={formData.gstin}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none font-mono tracking-wider uppercase"
                placeholder="e.g. 29AAAAA0000A1Z5"
              />
              <span className="text-[10px] text-[#2C1810]/60">State Code (first 2 digits) + 10-char PAN + Entity Code</span>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#2C1810]/70">
                PAN (Permanent Account Number)
              </label>
              <input
                type="text"
                maxLength={10}
                value={formData.pan}
                onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none font-mono tracking-wider uppercase"
                placeholder="e.g. AAAAA0000A"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#2C1810]/70">
                Business Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none"
                placeholder="e.g. +91 9876543210"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#2C1810]/70">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none"
                placeholder="contact@creamtreat.local"
              />
            </div>
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#2C1810]/70">
              Address (Line 1) *
            </label>
            <input
              type="text"
              required
              value={formData.address.line1}
              onChange={(e) => handleChange('address.line1', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none"
              placeholder="Shop No. 4, Sweet Street, Dessert Complex"
            />
          </div>

          {/* City, State, State Code, Pincode */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#2C1810]/70">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.address.city}
                onChange={(e) => handleChange('address.city', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none"
                placeholder="Bengaluru"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#2C1810]/70">
                State *
              </label>
              <input
                type="text"
                required
                value={formData.address.state}
                onChange={(e) => handleChange('address.state', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none"
                placeholder="Karnataka"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#6A0019]">
                State Code *
              </label>
              <input
                type="text"
                required
                maxLength={2}
                value={formData.address.stateCode}
                onChange={(e) => handleChange('address.stateCode', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none font-mono text-center"
                placeholder="29"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#2C1810]/70">
                Pincode *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={formData.address.pincode}
                onChange={(e) => handleChange('address.pincode', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none font-mono"
                placeholder="560001"
              />
            </div>
          </div>

          {/* Tax Rates & SAC Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E8DFD8]">
            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#6A0019]">
                Default SAC / HSN Code *
              </label>
              <input
                type="text"
                required
                value={formData.defaultHsnSac}
                onChange={(e) => handleChange('defaultHsnSac', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none font-mono"
                placeholder="996331 (Restaurant)"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#6A0019]">
                GST Rate (%) *
              </label>
              <input
                type="number"
                required
                min={0}
                max={28}
                step={0.5}
                value={formData.gstRate}
                onChange={(e) => handleChange('gstRate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none"
                placeholder="5"
              />
              <span className="text-[10px] text-[#2C1810]/60">Intra-state: {formData.gstRate / 2}% CGST + {formData.gstRate / 2}% SGST</span>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[11px] uppercase tracking-wider text-[#2C1810]/70">
                Invoice Prefix
              </label>
              <input
                type="text"
                required
                value={formData.invoicePrefix}
                onChange={(e) => handleChange('invoicePrefix', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none font-mono uppercase"
                placeholder="CT"
              />
            </div>
          </div>

          {/* Tax Inclusive / Exclusive Toggle */}
          <div className="p-3 bg-[#FBF7F2] rounded-xl border border-[#E8DFD8] flex items-center justify-between">
            <div>
              <p className="font-semibold text-xs text-[#2C1810]">Menu Pricing Mode</p>
              <p className="text-[11px] text-[#2C1810]/70">
                {formData.isTaxInclusive
                  ? 'Tax-Inclusive (Prices on menu already include GST)'
                  : 'Tax-Exclusive (GST is calculated and added on top of menu prices)'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isTaxInclusive}
                onChange={(e) => handleChange('isTaxInclusive', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6A0019]"></div>
            </label>
          </div>

          {/* Footer Submit */}
          <div className="flex justify-end gap-3 pt-3 border-t border-[#E8DFD8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E8DFD8] hover:bg-[#2C1810]/5 text-[#2C1810] font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] font-semibold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save GST Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

