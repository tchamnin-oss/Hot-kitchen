import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toJpeg, toPng } from 'html-to-image';
import { BarChart3, Camera, Download, Loader2, Printer, ShieldCheck, X } from 'lucide-react';
import { DAY_KEYS, type StockItem } from '../types/stock';
import {
  calculateTotal,
  formatDisplayDate,
  getUniqueCategories,
  getWeekDates,
} from '../utils/stockUtils';

interface SummaryReportModalProps {
  isOpen: boolean;
  stockData: StockItem[];
  weekStart: string;
  onClose: () => void;
  onPrintSummary: () => void;
  onNotify: (message: string) => void;
}

export const SummaryReportModal: React.FC<SummaryReportModalProps> = ({
  isOpen,
  stockData,
  weekStart,
  onClose,
  onPrintSummary,
  onNotify,
}) => {
  const reportCardRef = useRef<HTMLDivElement>(null);
  const [exportingFormat, setExportingFormat] = useState<'jpg' | 'png' | null>(null);

  const dates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const categories = useMemo(() => getUniqueCategories(stockData), [stockData]);

  const metrics = useMemo(() => {
    const totalItems = stockData.length;
    let recordedCount = 0;
    let grandTotalQty = 0;

    stockData.forEach((item) => {
      const total = calculateTotal(item);
      if (total > 0) {
        recordedCount++;
        grandTotalQty += total;
      }
    });

    const activePercent = totalItems > 0 ? Math.round((recordedCount / totalItems) * 100) : 0;
    const roundedGrandTotal = Math.round(grandTotalQty * 1000) / 1000;

    return {
      totalItems,
      recordedCount,
      activePercent,
      grandTotalQty: roundedGrandTotal,
      totalCategories: categories.length,
    };
  }, [stockData, categories]);

  const generatedTimestamp = useMemo(() => {
    if (!isOpen) return '';
    const now = new Date();
    return `พิมพ์เมื่อ: ${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isExporting = exportingFormat !== null;

  const handleSaveAsImage = async (format: 'jpg' | 'png' = 'jpg') => {
    if (!reportCardRef.current || isExporting) return;
    setExportingFormat(format);
    onNotify(`กำลังประมวลผลรูปภาพ ${format.toUpperCase()} ความละเอียดสูง...`);

    try {
      let dataUrl: string;
      const baseOptions = {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        ...(format === 'jpg' ? { quality: 0.95 } : {}),
      };

      const renderFn = format === 'jpg' ? toJpeg : toPng;

      try {
        dataUrl = await renderFn(reportCardRef.current, {
          ...baseOptions,
          cacheBust: true,
        });
      } catch {
        dataUrl = await renderFn(reportCardRef.current, {
          ...baseOptions,
          skipFonts: true,
        });
      }

      const link = document.createElement('a');
      link.download = `Par_Stock_Summary_HotKitchen_${dates.mon}_to_${dates.sun}.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onNotify(`ดาวน์โหลดรูปภาพ .${format} สำเร็จแล้ว!`);
    } catch (err) {
      console.error('Snapshot export error:', err);
      onNotify('เกิดข้อผิดพลาดในการบันทึกรูปภาพ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-5 overflow-y-auto print:static print:bg-white print:p-0 print:block"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="summaryModalTitle"
    >
      <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 max-w-5xl w-full my-auto flex flex-col max-h-[95vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none print:bg-white">
        {/* Modal Top Toolbar */}
        <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-violet-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="summaryModalTitle" className="font-bold text-sm sm:text-base leading-tight">
                สรุปยอดสต๊อกประจำสัปดาห์ (Par Stock Report)
              </h3>
              <p className="text-[11px] text-slate-400">
                พรีวิวใบรายงานสรุปแบบแผ่นเดียว พร้อมดาวน์โหลดเป็นรูปภาพ JPG / PNG คุณภาพสูง
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleSaveAsImage('jpg')}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm whitespace-nowrap shrink-0"
            >
              {exportingFormat === 'jpg' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังสร้าง JPG...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>เซฟเป็นรูปภาพ (.JPG)</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleSaveAsImage('png')}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-70 text-slate-200 rounded-lg flex items-center gap-1 transition border border-slate-700 whitespace-nowrap shrink-0"
              title="ดาวน์โหลดเป็นไฟล์ PNG"
            >
              {exportingFormat === 'png' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PNG</span>
            </button>
            <button
              type="button"
              onClick={onPrintSummary}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition border border-slate-700 whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition ml-1"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible">
          {/* Printable / Snapshot Report Card (Compact Single-Sheet Layout) */}
          <div
            id="summaryReportCard"
            ref={reportCardRef}
            className="bg-white rounded-xl shadow-lg border border-slate-300 p-4 sm:p-5 max-w-4xl mx-auto space-y-2.5 text-slate-800"
          >
            {/* Report Header */}
            <div className="border-b-2 border-slate-800 pb-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider bg-amber-500 text-white rounded">
                      KITCHEN OPS
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 text-slate-600 rounded border border-slate-300">
                      WEEKLY INVENTORY AUDIT
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                    PAR STOCK SUMMARY REPORT
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight">
                    HOT KITCHEN SECTION • สรุปรายงานบันทึกสต๊อกและการใช้วัตถุดิบ
                  </p>
                </div>

                <div className="sm:text-right bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 shrink-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 leading-tight">
                    รอบสัปดาห์ (Period)
                  </div>
                  <div className="text-xs font-bold text-slate-900 tabular-nums leading-snug">
                    {formatDisplayDate(dates.mon)} - {formatDisplayDate(dates.sun)}
                  </div>
                  <div className="text-[9.5px] text-slate-500 tabular-nums leading-tight">
                    {generatedTimestamp}
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-amber-50/80 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <div className="text-[9px] font-bold text-amber-800 uppercase leading-tight">
                  วัตถุดิบทั้งหมด
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-extrabold text-amber-900 tabular-nums leading-none">
                    {metrics.totalItems}
                  </span>
                  <span className="text-[9px] text-amber-700 leading-tight">รายการ</span>
                </div>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                <div className="text-[9px] font-bold text-emerald-800 uppercase leading-tight">
                  บันทึกยอดแล้ว
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-extrabold text-emerald-900 tabular-nums leading-none">
                    {metrics.recordedCount}
                  </span>
                  <span className="text-[9px] text-emerald-700 tabular-nums leading-tight">
                    ({metrics.activePercent}%)
                  </span>
                </div>
              </div>

              <div className="bg-indigo-50/80 border border-indigo-200 rounded-lg px-2.5 py-1.5">
                <div className="text-[9px] font-bold text-indigo-800 uppercase leading-tight">
                  ยอดรวมที่นับได้
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-extrabold text-indigo-900 tabular-nums leading-none">
                    {metrics.grandTotalQty.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-indigo-700 leading-tight">หน่วยรวม</span>
                </div>
              </div>

              <div className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <div className="text-[9px] font-bold text-slate-700 uppercase leading-tight">
                  หมวดหมู่
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-extrabold text-slate-800 tabular-nums leading-none">
                    {metrics.totalCategories}
                  </span>
                  <span className="text-[9px] text-slate-600 leading-tight">กลุ่ม</span>
                </div>
              </div>
            </div>

            {/* Category Breakdown Tables */}
            <div className="space-y-2">
              {categories.map((cat) => {
                const catItems = stockData.filter((i) => i.category === cat);
                const catTotalQty =
                  Math.round(
                    catItems.reduce((acc, curr) => acc + calculateTotal(curr), 0) * 1000
                  ) / 1000;
                const catActiveCount = catItems.filter((i) => calculateTotal(i) > 0).length;

                return (
                  <div
                    key={cat}
                    className="border border-slate-200 rounded-md overflow-hidden"
                  >
                    <div className="bg-slate-800 text-white px-2.5 py-1 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold leading-tight">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                        <span>
                          {cat} ({catItems.length} รายการ)
                        </span>
                      </span>
                      <span className="text-amber-300 font-semibold text-[9.5px] tabular-nums">
                        บันทึกแล้ว {catActiveCount}/{catItems.length} รายการ | รวม{' '}
                        {catTotalQty.toLocaleString()} หน่วย
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 text-[9px] uppercase font-bold border-b border-slate-200 leading-tight">
                            <th className="py-1 px-2 text-center w-7">#</th>
                            <th className="py-1 px-2">ชื่อวัตถุดิบ (Item)</th>
                            <th className="py-1 px-1.5 text-center w-14">Unit</th>
                            <th className="py-1 px-1 text-center w-8">จ.</th>
                            <th className="py-1 px-1 text-center w-8">อ.</th>
                            <th className="py-1 px-1 text-center w-8">พ.</th>
                            <th className="py-1 px-1 text-center w-8">พฤ.</th>
                            <th className="py-1 px-1 text-center w-8">ศ.</th>
                            <th className="py-1 px-1 text-center w-8 bg-amber-100/50">
                              ส.
                            </th>
                            <th className="py-1 px-1 text-center w-8 bg-amber-100/50">
                              อา.
                            </th>
                            <th className="py-1 px-2 text-center w-12 bg-slate-200/80 font-extrabold text-slate-800">
                              รวม
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {catItems.map((it, idx) => {
                            const tot = calculateTotal(it);
                            const hasCount = tot > 0;
                            return (
                              <tr
                                key={it.docId ?? it.id}
                                className={`${
                                  hasCount ? 'bg-amber-50/30' : 'bg-white'
                                } border-b border-slate-100 text-[10px] leading-tight`}
                              >
                                <td className="py-[2.5px] px-2 text-center text-slate-400 font-mono text-[9.5px] tabular-nums">
                                  {idx + 1}
                                </td>
                                <td className="py-[2.5px] px-2 font-semibold text-slate-800 whitespace-nowrap">
                                  {it.item}
                                </td>
                                <td className="py-[2.5px] px-1.5 text-center text-[9.5px] text-slate-500 font-medium whitespace-nowrap">
                                  {it.unit}
                                </td>
                                {DAY_KEYS.map((day) => {
                                  const val = it[day];
                                  const hasDayVal = val !== undefined && val !== '';
                                  return (
                                    <td
                                      key={day}
                                      className={`py-[2.5px] px-1 text-center font-mono text-[10px] tabular-nums ${
                                        hasDayVal && Number(val) > 0
                                          ? 'font-bold text-amber-700'
                                          : 'text-slate-600'
                                      }`}
                                    >
                                      {hasDayVal ? val : '-'}
                                    </td>
                                  );
                                })}
                                <td
                                  className={`py-[2.5px] px-2 text-center font-bold text-[10px] tabular-nums ${
                                    hasCount
                                      ? 'text-slate-900 bg-amber-100/60'
                                      : 'text-slate-400 bg-slate-50'
                                  }`}
                                >
                                  {tot > 0 ? tot : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer & Signature Block */}
            <div className="pt-2.5 border-t border-slate-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-[9.5px] text-slate-500 leading-snug">
                  <p>
                    <strong>หมายเหตุ:</strong> ใช้สำหรับตรวจนับ ตรวจสอบรอบสัปดาห์
                    และสั่งซื้อวัตถุดิบเติม Par Stock ครัวร้อน
                  </p>
                  <p className="text-[9px] text-slate-400">
                    PAR STOCK MANAGEMENT SYSTEM • KITCHEN OPS
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-700 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">ผู้บันทึก:</span>
                    <span className="border-b border-dotted border-slate-400 w-24 inline-block h-3" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">หัวหน้าครัว:</span>
                    <span className="border-b border-dotted border-slate-400 w-24 inline-block h-3" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">วันที่:</span>
                    <span className="border-b border-dotted border-slate-400 w-16 inline-block h-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Action */}
        <div className="bg-white px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>ภาพ JPG / PNG คมชัด ความละเอียด 2X พร้อมส่งใน LINE กลุ่มครัวได้ทันที</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition whitespace-nowrap shrink-0"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleSaveAsImage('jpg')}
              className="px-4 py-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-70 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingFormat === 'jpg' ? 'กำลังสร้าง JPG...' : 'ดาวน์โหลดรูปภาพ (.jpg)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
