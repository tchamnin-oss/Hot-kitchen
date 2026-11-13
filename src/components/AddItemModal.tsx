import React, { useEffect, useRef, useState } from 'react';
import { Check, PlusCircle, X } from 'lucide-react';
import { UNIT_OPTIONS } from '../data/defaultStock';

interface AddItemModalProps {
  isOpen: boolean;
  categories: string[];
  defaultCategory?: string | null;
  onClose: () => void;
  onAdd: (payload: {
    category: string;
    item: string;
    unit: string;
    initialMon: number | '';
  }) => void;
}

const FALLBACK_CATEGORIES = ['BREAKFAST / GENERAL', 'MEAT', 'DRY STORE'];

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  categories,
  defaultCategory,
  onClose,
  onAdd,
}) => {
  const availableCategories =
    categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  const [selectedCategory, setSelectedCategory] = useState<string>(
    defaultCategory || availableCategories[0]
  );
  const [customCategory, setCustomCategory] = useState('');
  const [itemName, setItemName] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('KG');
  const [customUnit, setCustomUnit] = useState('');
  const [initialQty, setInitialQty] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const itemInputRef = useRef<HTMLInputElement>(null);
  const customCatRef = useRef<HTMLInputElement>(null);
  const customUnitRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const initialCat =
        defaultCategory && availableCategories.includes(defaultCategory)
          ? defaultCategory
          : availableCategories[0];
      setSelectedCategory(initialCat);
      setCustomCategory('');
      setItemName('');
      setSelectedUnit('KG');
      setCustomUnit('');
      setInitialQty('');
      setErrorMsg('');
      const timer = setTimeout(() => itemInputRef.current?.focus(), 60);
      wasOpenRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, defaultCategory, availableCategories]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      setErrorMsg('กรุณากรอกชื่อวัตถุดิบ');
      itemInputRef.current?.focus();
      return;
    }

    const finalCategory =
      selectedCategory === 'CUSTOM'
        ? customCategory.trim().toUpperCase() || 'GENERAL'
        : selectedCategory;

    if (selectedCategory === 'CUSTOM' && !customCategory.trim()) {
      setErrorMsg('กรุณาระบุชื่อหมวดหมู่ใหม่');
      customCatRef.current?.focus();
      return;
    }

    const finalUnit =
      selectedUnit === 'OTHER'
        ? customUnit.trim().toUpperCase() || 'PCS'
        : selectedUnit;

    if (selectedUnit === 'OTHER' && !customUnit.trim()) {
      setErrorMsg('กรุณาระบุหน่วยนับ');
      customUnitRef.current?.focus();
      return;
    }

    const parsedQty = initialQty !== '' ? Number(initialQty) : '';
    onAdd({
      category: finalCategory,
      item: trimmedName,
      unit: finalUnit,
      initialMon: parsedQty !== '' && Number.isFinite(parsedQty) ? parsedQty : '',
    });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="addItemModalTitle"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-amber-400" />
            <h3 id="addItemModalTitle" className="font-bold text-base">
              เพิ่มรายการวัตถุดิบใหม่
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              หมวดหมู่วัตถุดิบ <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCategory(val);
                  setErrorMsg('');
                  if (val === 'CUSTOM') {
                    setTimeout(() => customCatRef.current?.focus(), 40);
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none font-medium text-slate-800"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="CUSTOM">+ เพิ่มหมวดหมู่ใหม่...</option>
              </select>

              {selectedCategory === 'CUSTOM' && (
                <input
                  ref={customCatRef}
                  type="text"
                  maxLength={80}
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="ระบุชื่อหมวดหมู่ใหม่ เช่น SEAFOOD, SAUCES"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none uppercase"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อวัตถุดิบ (Item Description) <span className="text-rose-500">*</span>
            </label>
            <input
              ref={itemInputRef}
              type="text"
              maxLength={160}
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="เช่น Wagyu Beef A5, Truffle Paste"
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              หน่วยนับ (Unit) <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={selectedUnit}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedUnit(val);
                  setErrorMsg('');
                  if (val === 'OTHER') {
                    setTimeout(() => customUnitRef.current?.focus(), 40);
                  }
                }}
                className={`${
                  selectedUnit === 'OTHER' ? 'w-1/2' : 'w-full'
                } px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none`}
              >
                {UNIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {selectedUnit === 'OTHER' && (
                <input
                  ref={customUnitRef}
                  type="text"
                  maxLength={40}
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  placeholder="ระบุหน่วย..."
                  className="w-1/2 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none uppercase"
                />
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              จำนวนตั้งต้นสำหรับวันจันทร์ (ไม่บังคับ)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={initialQty}
              onChange={(e) => setInitialQty(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none tabular-nums"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition whitespace-nowrap shrink-0"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>เพิ่มวัตถุดิบ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
