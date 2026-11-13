import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  Folder,
  Info,
  Maximize2,
  Minimize2,
  PackageSearch,
  Pencil,
  PlusCircle,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { AddItemModal } from './components/AddItemModal';
import { ConfirmModal } from './components/ConfirmModal';
import { EditItemModal } from './components/EditItemModal';
import { SummaryReportModal } from './components/SummaryReportModal';
import { useTableZoom } from './hooks/useTableZoom';
import { DEFAULT_MONDAY } from './data/defaultStock';
import { firebaseProjectInfo } from './firebase';
import {
  addStockItemToFirestore,
  deleteStockItemFromFirestore,
  ensureKitchenSeeded,
  resetKitchenToDefault,
  subscribeKitchenWorkspace,
  subscribeStockItems,
  updateKitchenWeekStart,
  updateStockItemDay,
  updateStockItemDetails,
} from './services/stockFirestore';
import { DAY_KEYS, DAY_LABELS, type DayKey, type StockItem } from './types/stock';
import {
  addDays,
  exportStockToCSV,
  formatDisplayDate,
  formatShortDate,
  getMonday,
  getUniqueCategories,
  getWeekDates,
  groupItemsByCategory,
} from './utils/stockUtils';

export function App() {
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [weekStart, setWeekStart] = useState<string>(DEFAULT_MONDAY);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [quotaUpgradeUrl, setQuotaUpgradeUrl] = useState<string | null>(null);

  const [currentCategory, setCurrentCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalDefaultCategory, setAddModalDefaultCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'main' | 'summary'>('main');

  const [confirmState, setConfirmState] = useState<
    | { type: 'delete'; item: StockItem }
    | { type: 'reset' }
    | null
  >(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: 'บันทึกข้อมูลเรียบร้อยแล้ว',
  });
  const toastTimerRef = useRef<number | null>(null);
  const pendingTimersRef = useRef<Record<string, number>>({});
  const pendingValuesRef = useRef<Record<string, number | ''>>({});

  const showToast = useCallback((message = 'บันทึกข้อมูลเรียบร้อยแล้ว') => {
    setToast({ visible: true, message });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 1800);
  }, []);

  const handleRuntimeError = useCallback((error: unknown) => {
    const raw = error instanceof Error ? error.message : String(error);
    if (raw.includes('Quota exceeded')) {
      if (raw.includes('Free daily read units per project')) {
        setQuotaUpgradeUrl(
          `https://console.firebase.google.com/project/${firebaseProjectInfo.projectId}/firestore/databases/${firebaseProjectInfo.firestoreDatabaseId}/data?openUpgradeDialog=true`
        );
      }
      setSyncError(
        'โควตาการใช้งาน Firestore รายวันเต็มแล้ว โควตาจะรีเซ็ตในวันถัดไป'
      );
      return;
    }
    setSyncError('ไม่สามารถเชื่อมต่อหรือบันทึกข้อมูลไปยัง Firebase Firestore ได้ กรุณาลองใหม่');
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      Object.values(pendingTimersRef.current).forEach((timerId) =>
        window.clearTimeout(timerId)
      );
    };
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => setPrintMode('main');
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubWorkspace: (() => void) | undefined;
    let unsubItems: (() => void) | undefined;

    setIsLoadingData(true);
    setSyncError(null);
    setQuotaUpgradeUrl(null);

    ensureKitchenSeeded()
      .then(() => {
        if (!isMounted) return;

        unsubWorkspace = subscribeKitchenWorkspace(
          (nextWeekStart) => {
            if (!isMounted) return;
            setWeekStart(nextWeekStart);
          },
          (err) => {
            if (!isMounted) return;
            handleRuntimeError(err);
          }
        );

        unsubItems = subscribeStockItems(
          (items) => {
            if (!isMounted) return;
            const merged = items.map((row) => {
              if (!row.docId) return row;
              let nextRow = row;
              DAY_KEYS.forEach((day) => {
                const pendingKey = `${row.docId}_${day}`;
                if (pendingKey in pendingValuesRef.current) {
                  if (nextRow === row) nextRow = { ...row };
                  nextRow[day] = pendingValuesRef.current[pendingKey];
                }
              });
              return nextRow;
            });
            setStockData(merged);
            setIsLoadingData(false);
          },
          (err) => {
            if (!isMounted) return;
            setIsLoadingData(false);
            handleRuntimeError(err);
          }
        );
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsLoadingData(false);
        handleRuntimeError(err);
      });

    return () => {
      isMounted = false;
      unsubWorkspace?.();
      unsubItems?.();
    };
  }, [handleRuntimeError]);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const categories = useMemo(() => getUniqueCategories(stockData), [stockData]);

  useEffect(() => {
    if (currentCategory !== 'ALL' && !categories.includes(currentCategory)) {
      setCurrentCategory('ALL');
    }
  }, [categories, currentCategory]);

  const filteredItems = useMemo(() => {
    const queryText = searchQuery.toLowerCase().trim();
    const matched = stockData.filter((item) => {
      const matchCategory = currentCategory === 'ALL' || item.category === currentCategory;
      const matchSearch =
        !queryText ||
        item.item.toLowerCase().includes(queryText) ||
        item.unit.toLowerCase().includes(queryText) ||
        item.category.toLowerCase().includes(queryText);
      return matchCategory && matchSearch;
    });
    return groupItemsByCategory(matched);
  }, [stockData, currentCategory, searchQuery]);

  const tableZoom = useTableZoom({
    minScale: 0.32,
    maxScale: 1.5,
    step: 0.1,
    autoFitWhenOverflow: false,
    measureTrigger: `${isLoadingData}-${filteredItems.length}-${currentCategory}`,
  });

  const handleChangeWeek = async (direction: -1 | 1) => {
    const nextStart = addDays(weekStart, direction * 7);
    setWeekStart(nextStart);
    try {
      await updateKitchenWeekStart(nextStart);
      showToast(`เปลี่ยนเป็นรอบ ${formatDisplayDate(nextStart)}`);
    } catch (err) {
      handleRuntimeError(err);
    }
  };

  const handleStartDateChange = async (val: string) => {
    if (!val) return;
    const monday = getMonday(val);
    setWeekStart(monday);
    try {
      await updateKitchenWeekStart(monday);
      showToast(`เปลี่ยนรอบสัปดาห์เป็น ${formatDisplayDate(monday)} แล้ว`);
    } catch (err) {
      handleRuntimeError(err);
    }
  };

  const commitDayUpdate = useCallback(
    async (docId: string, day: DayKey, nextVal: number | '') => {
      const key = `${docId}_${day}`;
      if (pendingTimersRef.current[key]) {
        window.clearTimeout(pendingTimersRef.current[key]);
        delete pendingTimersRef.current[key];
      }
      delete pendingValuesRef.current[key];

      try {
        await updateStockItemDay(docId, day, nextVal);
        showToast('บันทึกข้อมูลลง Firebase แล้ว');
      } catch (err) {
        handleRuntimeError(err);
      }
    },
    [showToast, handleRuntimeError]
  );

  const handleUpdateStock = (row: StockItem, day: DayKey, rawValue: string) => {
    if (!row.docId) return;
    let nextVal: number | '' = '';
    if (rawValue !== '') {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || parsed < 0) return;
      nextVal = parsed;
    }

    const docId = row.docId;
    const key = `${docId}_${day}`;
    pendingValuesRef.current[key] = nextVal;

    setStockData((prev) =>
      prev.map((item) => (item.docId === docId ? { ...item, [day]: nextVal } : item))
    );

    if (pendingTimersRef.current[key]) {
      window.clearTimeout(pendingTimersRef.current[key]);
    }
    pendingTimersRef.current[key] = window.setTimeout(() => {
      void commitDayUpdate(docId, day, nextVal);
    }, 350);
  };

  const handleBlurStock = (row: StockItem, day: DayKey) => {
    if (!row.docId) return;
    const key = `${row.docId}_${day}`;
    if (key in pendingValuesRef.current) {
      void commitDayUpdate(row.docId, day, pendingValuesRef.current[key]);
    }
  };

  const openAddModal = useCallback(
    (targetCategory?: string) => {
      const preset =
        targetCategory ?? (currentCategory !== 'ALL' ? currentCategory : null);
      setAddModalDefaultCategory(preset);
      setIsAddModalOpen(true);
    },
    [currentCategory]
  );

  const handleAddItem = async (payload: {
    category: string;
    item: string;
    unit: string;
    initialMon: number | '';
  }) => {
    const maxSortOrder = stockData.reduce(
      (max, row) => Math.max(max, row.sortOrder ?? row.id ?? 0),
      0
    );
    try {
      await addStockItemToFirestore(payload, maxSortOrder + 1);
      setIsAddModalOpen(false);
      if (currentCategory !== 'ALL' && currentCategory !== payload.category) {
        setCurrentCategory(payload.category);
      }
      showToast(`เพิ่มวัตถุดิบ "${payload.item}" ในหมวด ${payload.category} แล้ว`);
    } catch (err) {
      handleRuntimeError(err);
    }
  };

  const handleEditItem = async (
    docId: string,
    payload: {
      category: string;
      item: string;
      unit: string;
    }
  ) => {
    try {
      await updateStockItemDetails(docId, payload);
      setEditingItem(null);
      showToast(`แก้ไขข้อมูล "${payload.item}" เรียบร้อยแล้ว`);
    } catch (err) {
      handleRuntimeError(err);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    const currentConfirm = confirmState;
    setConfirmState(null);

    if (currentConfirm.type === 'delete') {
      const target = currentConfirm.item;
      if (!target.docId) return;
      try {
        await deleteStockItemFromFirestore(target.docId);
        showToast(`ลบวัตถุดิบ "${target.item}" เรียบร้อยแล้ว`);
      } catch (err) {
        handleRuntimeError(err);
      }
    } else if (currentConfirm.type === 'reset') {
      setIsLoadingData(true);
      try {
        await resetKitchenToDefault();
        setCurrentCategory('ALL');
        setSearchQuery('');
        showToast('รีเซ็ตข้อมูลทั้งหมดเรียบร้อยแล้ว');
      } catch (err) {
        handleRuntimeError(err);
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  const handlePrintMain = () => {
    setPrintMode('main');
    window.setTimeout(() => window.print(), 30);
  };

  const handlePrintSummary = () => {
    setPrintMode('summary');
    window.setTimeout(() => window.print(), 40);
  };

  const handleExportCSV = () => {
    exportStockToCSV(stockData, weekStart);
    showToast('ส่งออกไฟล์ CSV เรียบร้อยแล้ว');
  };

  return (
    <div className="bg-slate-100 text-slate-800 min-h-screen p-4 md:p-6 pb-20 print:bg-white print:p-0">
      <div
        className={`max-w-7xl mx-auto space-y-5 ${
          printMode === 'summary' ? 'no-print' : ''
        }`}
      >
        {/* Top Header */}
        <header className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print-shadow-none">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded whitespace-nowrap shrink-0">
                KITCHEN OPS
              </span>

              {/* Editable Week Date Range Picker */}
              <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-sm text-xs">
                <button
                  type="button"
                  onClick={() => handleChangeWeek(-1)}
                  title="สัปดาห์ก่อนหน้า"
                  aria-label="สัปดาห์ก่อนหน้า"
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition no-print"
                >
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
                <div className="flex items-center gap-1.5 px-2 py-0.5 font-medium text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                    {formatDisplayDate(weekDates.mon)} - {formatDisplayDate(weekDates.sun)}
                  </span>
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    title="เลือกวันเริ่มสัปดาห์ (วันจันทร์)"
                    aria-label="เลือกวันเริ่มสัปดาห์"
                    className="no-print ml-1 text-xs border border-slate-300 rounded px-1.5 py-0.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleChangeWeek(1)}
                  title="สัปดาห์ถัดไป"
                  aria-label="สัปดาห์ถัดไป"
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition no-print"
                >
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              PAR STOCK (HOT KITCHEN)
            </h1>
            <p className="text-sm text-slate-500">
              ระบบบันทึก จัดการ และนับสต๊อกวัตถุดิบครัวร้อนประจำสัปดาห์ (เพิ่ม/ลบวัตถุดิบได้
              พร้อมเลือกรอบวันที่)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => openAddModal()}
              className="px-3.5 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>เพิ่มวัตถุดิบใหม่</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSummaryModalOpen(true)}
              className="px-3.5 py-2 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm hover:shadow whitespace-nowrap shrink-0"
            >
              <BarChart3 className="w-4 h-4" />
              <span>สรุปยอด &amp; เซฟรูปภาพ</span>
            </button>

            <button
              type="button"
              onClick={handlePrintMain}
              className="px-3 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmState({ type: 'reset' })}
              className="px-3 py-2 text-sm font-medium bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>รีเซ็ต</span>
            </button>
          </div>
        </header>

        {/* Sync / Quota Error Banner */}
        {syncError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 flex flex-wrap items-center justify-between gap-2 no-print">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{syncError}</span>
            </div>
            {quotaUpgradeUrl && (
              <a
                href={quotaUpgradeUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline text-rose-900 hover:text-rose-700"
              >
                เปิดหน้าจัดการ Firebase Quota
              </a>
            )}
          </div>
        )}

        {/* Filter & Search Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setCurrentCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition tabular-nums ${
                currentCategory === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({stockData.length})
            </button>
            {categories.map((cat) => {
              const count = stockData.filter((i) => i.category === cat).length;
              const isActive = currentCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCurrentCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition tabular-nums ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาวัตถุดิบ หรือหน่วยนับ..."
              aria-label="ค้นหาวัตถุดิบ หรือหน่วยนับ"
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="ล้างคำค้นหา"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Main Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print-shadow-none">
          {/* Table Zoom & Fit-to-Screen Toolbar */}
          <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 no-print">
            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700 tabular-nums">
                แสดง {filteredItems.length} รายการ
              </span>
              {currentCategory !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => openAddModal(currentCategory)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md transition whitespace-nowrap shrink-0"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>เพิ่มในหมวด {currentCategory}</span>
                </button>
              )}
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="text-[11px] text-slate-500">
                ย่อ/ขยาย หรือจีบนิ้วบนตารางเพื่อดูครบทุกวัน
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={tableZoom.zoomOut}
                  disabled={!tableZoom.canZoomOut}
                  title="ย่อตาราง"
                  aria-label="ย่อตาราง"
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none rounded transition"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-xs font-bold text-slate-700 tabular-nums min-w-[46px] text-center select-none">
                  {tableZoom.percent}%
                </span>
                <button
                  type="button"
                  onClick={tableZoom.zoomIn}
                  disabled={!tableZoom.canZoomIn}
                  title="ขยายตาราง"
                  aria-label="ขยายตาราง"
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none rounded transition"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {(tableZoom.canFit || tableZoom.mode === 'fit') && (
                <button
                  type="button"
                  onClick={tableZoom.toggleFit}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap shrink-0 border ${
                    tableZoom.mode === 'fit'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {tableZoom.mode === 'fit' ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>พอดีจอ</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>ดูเต็มตาราง</span>
                    </>
                  )}
                </button>
              )}

              {tableZoom.isScaled && (
                <button
                  type="button"
                  onClick={tableZoom.resetZoom}
                  className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition whitespace-nowrap shrink-0"
                >
                  100%
                </button>
              )}
            </div>
          </div>

          <div
            ref={tableZoom.viewportRef}
            className="overflow-auto custom-scrollbar print:overflow-visible"
          >
            <div
              className="overflow-hidden print:!w-full print:!h-auto print:overflow-visible"
              style={
                tableZoom.isScaled
                  ? {
                      width: tableZoom.scaledWidth ? `${tableZoom.scaledWidth}px` : undefined,
                      height: tableZoom.scaledHeight ? `${tableZoom.scaledHeight}px` : undefined,
                    }
                  : undefined
              }
            >
              <div
                ref={tableZoom.contentRef}
                className="origin-top-left print:!transform-none print:!w-full"
                style={
                  tableZoom.isScaled
                    ? {
                        width: tableZoom.contentWidth ? `${tableZoom.contentWidth}px` : undefined,
                        transform: `scale(${tableZoom.scale})`,
                      }
                    : undefined
                }
              >
                <table className="w-full min-w-[880px] text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-800 text-slate-200 text-xs uppercase tracking-wider">
                  <th className="py-3 px-3 font-semibold w-10 text-center">#</th>
                  <th className="py-3 px-4 font-semibold min-w-[200px]">Item Description</th>
                  <th className="py-3 px-2 font-semibold text-center w-20">Unit</th>
                  {DAY_KEYS.map((day) => {
                    const isMon = day === 'mon';
                    const isWeekend = day === 'sat' || day === 'sun';
                    return (
                      <th
                        key={day}
                        className={`py-3 px-1 font-semibold text-center w-16 ${
                          isMon
                            ? 'bg-slate-700/60'
                            : isWeekend
                              ? 'bg-amber-900/40 text-amber-200'
                              : ''
                        }`}
                      >
                        {DAY_LABELS[day].en}
                        <br />
                        <span
                          className={`text-[10px] font-normal tabular-nums ${
                            isWeekend ? 'text-amber-300' : 'text-slate-400'
                          }`}
                        >
                          {formatShortDate(weekDates[day])}
                        </span>
                      </th>
                    );
                  })}
                  <th className="py-3 px-3 font-semibold text-center w-20 no-print">จัดการ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoadingData ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-slate-100 animate-pulse">
                      <td className="py-3 px-3 text-center">
                        <div className="h-3 w-4 bg-slate-200 rounded mx-auto" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-3.5 w-44 bg-slate-200 rounded" />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="h-4 w-12 bg-slate-200 rounded mx-auto" />
                      </td>
                      {DAY_KEYS.map((d) => (
                        <td key={d} className="py-2 px-1 text-center">
                          <div className="h-7 w-12 bg-slate-100 rounded mx-auto" />
                        </td>
                      ))}
                      <td className="py-3 px-2 text-center no-print">
                        <div className="h-5 w-5 bg-slate-200 rounded mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-slate-400">
                      <PackageSearch
                        className="w-8 h-8 mx-auto mb-2 opacity-50"
                        strokeWidth={1.5}
                      />
                      <div className="text-sm font-medium text-slate-500">
                        ไม่พบรายการวัตถุดิบที่ค้นหา
                      </div>
                      {(searchQuery || currentCategory !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setCurrentCategory('ALL');
                          }}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          แสดงทั้งหมด
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row, index) => {
                    const prevRow = index > 0 ? filteredItems[index - 1] : null;
                    const showCategoryHeader =
                      currentCategory === 'ALL' &&
                      (!prevRow || prevRow.category !== row.category);

                    return (
                      <React.Fragment key={row.docId ?? row.id}>
                        {showCategoryHeader && (
                          <tr className="bg-slate-100 font-bold text-slate-700 tracking-wider text-xs uppercase">
                            <td
                              colSpan={11}
                              className="py-2 px-4 bg-slate-200/70 border-y border-slate-300 font-bold text-slate-800"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5">
                                  <Folder className="w-3.5 h-3.5 text-amber-600" />
                                  <span>หมวดหมู่: {row.category}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openAddModal(row.category)}
                                  className="no-print inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 rounded-md transition whitespace-nowrap shrink-0"
                                >
                                  <PlusCircle className="w-3 h-3" />
                                  <span>เพิ่มในหมวดนี้</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}

                        <tr className="hover:bg-slate-50 transition border-b border-slate-100 group">
                          <td className="py-2.5 px-3 text-center text-xs text-slate-400 font-medium tabular-nums">
                            {index + 1}
                          </td>

                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{row.item}</span>
                              {currentCategory === 'ALL' && (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-normal hidden lg:inline whitespace-nowrap">
                                  {row.category}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-2 text-center">
                            <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded border border-slate-200 whitespace-nowrap">
                              {row.unit}
                            </span>
                          </td>

                          {DAY_KEYS.map((day) => {
                            const cellVal = row[day];
                            const hasNumericVal =
                              cellVal !== undefined &&
                              cellVal !== '' &&
                              Number.isFinite(Number(cellVal));
                            const isLowStock = hasNumericVal && Number(cellVal) < 5;
                            return (
                              <td key={day} className="py-1 px-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={cellVal !== undefined ? cellVal : ''}
                                  onChange={(e) =>
                                    handleUpdateStock(row, day, e.target.value)
                                  }
                                  onBlur={() => handleBlurStock(row, day)}
                                  aria-label={`${row.item} ${DAY_LABELS[day].en}`}
                                  className={`w-12 text-center py-1 text-sm rounded border focus:outline-none transition tabular-nums ${
                                    isLowStock
                                      ? 'font-bold text-red-600 border-red-300 bg-red-50/40 focus:bg-red-50 focus:border-red-500 hover:border-red-400'
                                      : 'font-medium text-slate-700 border-slate-200 focus:bg-amber-50 focus:border-amber-500 hover:border-slate-300'
                                  }`}
                                />
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-2 text-center no-print">
                            <div className="inline-flex items-center justify-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => setEditingItem(row)}
                                title="แก้ไขวัตถุดิบนี้"
                                aria-label={`แก้ไข ${row.item}`}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition opacity-70 group-hover:opacity-100"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmState({ type: 'delete', item: row })}
                                title="ลบวัตถุดิบนี้"
                                aria-label={`ลบ ${row.item}`}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-70 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions / Footer Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-2 no-print">
          <div className="flex items-start sm:items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>คำแนะนำ:</strong> สามารถเปลี่ยนรอบสัปดาห์ได้ที่กล่องวันที่ด้านบน
              หัวตารางและส่งออก CSV จะปรับตามจริง | คลิก{' '}
              <strong>&quot;เพิ่มวัตถุดิบใหม่&quot;</strong> เพื่อใส่รายการเพิ่มเติม หรือกดปุ่ม{' '}
              <strong>&quot;สรุปยอด &amp; เซฟรูปภาพ&quot;</strong> เพื่อทำรายงานบันทึกเป็นรูปภาพ
            </span>
          </div>
          <div className="text-slate-600 font-medium whitespace-nowrap shrink-0 flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>ซิงค์เรียลไทม์บน Firebase Firestore • ทุกคนแก้ไขร่วมกันได้</span>
          </div>
        </div>
      </div>

      {/* Summary Report & Save Image Modal */}
      <SummaryReportModal
        isOpen={isSummaryModalOpen}
        stockData={stockData}
        weekStart={weekStart}
        onClose={() => setIsSummaryModalOpen(false)}
        onPrintSummary={handlePrintSummary}
        onNotify={showToast}
      />

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        categories={categories}
        defaultCategory={addModalDefaultCategory}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
      />

      {/* Edit Item Modal */}
      <EditItemModal
        item={editingItem}
        categories={categories}
        onClose={() => setEditingItem(null)}
        onSave={handleEditItem}
      />

      {/* Custom Confirmation Modal (Delete / Reset) */}
      <ConfirmModal
        isOpen={confirmState !== null}
        title={
          confirmState?.type === 'delete'
            ? 'ยืนยันการลบวัตถุดิบ'
            : 'ยืนยันการรีเซ็ตข้อมูล'
        }
        description={
          confirmState?.type === 'delete'
            ? `คุณต้องการลบ "${confirmState.item.item}" ออกจากรายการสต๊อกใช่หรือไม่?`
            : 'คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น (44 รายการ)? การเพิ่ม/ลบรายการจะถูกรีเซ็ต'
        }
        confirmLabel={confirmState?.type === 'delete' ? 'ลบรายการ' : 'รีเซ็ตทั้งหมด'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState(null)}
      />

      {/* Notification Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-5 right-5 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl transition-all duration-300 z-50 flex items-center gap-2 no-print ${
          toast.visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

export default App;
