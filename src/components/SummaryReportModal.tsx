import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
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
  const [isExporting, setIsExporting] = useState(false);

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

  const handleSaveAsImage = async () => {
    if (!reportCardRef.current || isExporting) return;
    setIsExporting(true);
    onNotify('กำลังประมวลผลรูปภาพ PNG ความละเอียดสูง...');

    try {
      let dataUrl: string;
      try {
        dataUrl = await toPng(reportCardRef.current, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });
      } catch {
        dataUrl = await toPng(reportCardRef.current, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
        });
      }

      const link = document.createElement('a');
      link.download = `Par_Stock_Summary_HotKitchen_${dates.mon}_to_${dates.sun}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onNotify('ดาวน์โหลดรูปภาพสรุปยอดสำเร็จแล้ว!');
    } catch (err) {
      console.error('Snapshot export error:', err);
      onNotify('เกิดข้อผิดพลาดในการบันทึกรูปภาพ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(false);
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
      <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 max-w-4xl w-full my-auto flex flex-col max-h-[95vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none print:bg-white">
        {/* Modal Top Toolbar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-violet-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="summaryModalTitle" className="font-bold text-sm sm:text-base leading-tight">
                สรุปยอดสต๊อกประจำสัปดาห์ (Par Stock Report)
              </h3>
              <p className="text-[11px] text-slate-400">
                พรีวิวใบรายงานสรุป พร้อมดาวน์โหลดเป็นรูปภาพ PNG คุณภาพสูง
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleSaveAsImage}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm whitespace-nowrap shrink-0"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังสร้างภาพ...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>เซฟเป็นรูปภาพ (PNG)</span>
                </>
              )}
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
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible">
          {/* Printable / Snapshot Report Card */}
          <div
            id="summaryReportCard"
            ref={reportCardRef}
            className="bg-white rounded-xl shadow-lg border border-slate-300 p-6 md:p-8 max-w-3xl mx-auto space-y-6 text-slate-800"
          >
            {/* Report Header */}
            <div className="border-b-2 border-slate-800 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-[10px] font-extrabold tracking-wider bg-amber-500 text-white rounded">
                      KITCHEN OPS
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded border border-slate-300">
                      WEEKLY INVENTORY AUDIT
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    PAR STOCK SUMMARY REPORT
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    HOT KITCHEN SECTION • สรุปรายงานบันทึกสต๊อกและการใช้วัตถุดิบ
                  </p>
                </div>

                <div className="sm:text-right bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    รอบสัปดาห์ (Period)
                  </div>
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatDisplayDate(dates.mon)} - {formatDisplayDate(dates.sun)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    {generatedTimestamp}
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-amber-800 uppercase">
                  วัตถุดิบทั้งหมด
                </div>
                <div className="text-2xl font-extrabold text-amber-900 mt-0.5 tabular-nums">
                  {metrics.totalItems}
                </div>
                <div className="text-[10px] text-amber-700">รายการในระบบ</div>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">
                  รายการที่มีการบันทึก
                </div>
                <div className="text-2xl font-extrabold text-emerald-900 mt-0.5 tabular-nums">
                  {metrics.recordedCount}
                </div>
                <div className="text-[10px] text-emerald-700 tabular-nums">
                  {metrics.activePercent}% ที่มีการบันทึกยอด
                </div>
              </div>

              <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-indigo-800 uppercase">
                  ยอดรวมจำนวนที่นับได้
                </div>
                <div className="text-2xl font-extrabold text-indigo-900 mt-0.5 tabular-nums">
                  {metrics.grandTotalQty.toLocaleString()}
                </div>
                <div className="text-[10px] text-indigo-700">ผลรวมทุกหน่วยนับ</div>
              </div>

              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-700 uppercase">
                  จำนวนหมวดหมู่
                </div>
                <div className="text-2xl font-extrabold text-slate-800 mt-0.5 tabular-nums">
                  {metrics.totalCategories}
                </div>
                <div className="text-[10px] text-slate-600">กลุ่มวัตถุดิบ</div>
              </div>
            </div>

            {/* Category Breakdown Tables */}
            <div className="space-y-4">
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
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <div className="bg-slate-800 text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        <span>
                          {cat} ({catItems.length} รายการ)
                        </span>
                      </span>
                      <span className="text-amber-300 font-semibold text-[11px] tabular-nums">
                        บันทึกแล้ว {catActiveCount}/{catItems.length} รายการ | รวม{' '}
                        {catTotalQty.toLocaleString()} หน่วย
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                            <th className="py-1.5 px-3 text-center w-8">#</th>
                            <th className="py-1.5 px-3">ชื่อวัตถุดิบ (Item)</th>
                            <th className="py-1.5 px-2 text-center w-16">Unit</th>
                            <th className="py-1.5 px-1 text-center w-10">จ.</th>
                            <th className="py-1.5 px-1 text-center w-10">อ.</th>
                            <th className="py-1.5 px-1 text-center w-10">พ.</th>
                            <th className="py-1.5 px-1 text-center w-10">พฤ.</th>
                            <th className="py-1.5 px-1 text-center w-10">ศ.</th>
                            <th className="py-1.5 px-1 text-center w-10 bg-amber-100/50">
                              ส.
                            </th>
                            <th className="py-1.5 px-1 text-center w-10 bg-amber-100/50">
                              อา.
                            </th>
                            <th className="py-1.5 px-3 text-center w-16 bg-slate-200/80 font-extrabold text-slate-800">
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
                                key={it.id}
                                className={`${
                                  hasCount ? 'bg-amber-50/30' : 'bg-white'
                                } border-b border-slate-100 text-xs`}
                              >
                                <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px] tabular-nums">
                                  {idx + 1}
                                </td>
                                <td className="py-1.5 px-3 font-semibold text-slate-800">
                                  {it.item}
                                </td>
                                <td className="py-1.5 px-2 text-center text-[11px] text-slate-500 font-medium">
                                  {it.unit}
                                </td>
                                {DAY_KEYS.map((day) => {
                                  const val = it[day];
                                  const hasDayVal = val !== undefined && val !== '';
                                  return (
                                    <td
                                      key={day}
                                      className={`py-1.5 px-1 text-center font-mono tabular-nums ${
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
                                  className={`py-1.5 px-3 text-center font-bold tabular-nums ${
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
            <div className="pt-6 border-t-2 border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                <div className="text-xs text-slate-500 space-y-1">
                  <p>
                    <strong>หมายเหตุ:</strong> ข้อมูลนี้ใช้สำหรับการตรวจนับ ตรวจสอบรอบสัปดาห์
                    และสั่งซื้อวัตถุดิบเติม Par Stock ประจำส่วนครัวร้อน
                  </p>
                  <p className="text-[10px] text-slate-400">
                    PAR STOCK MANAGEMENT SYSTEM • KITCHEN OPS
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold">ผู้บันทึก / Checked by:</span>
                    <span className="border-b border-dotted border-slate-400 w-36 inline-block" />
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold">หัวหน้าครัว / Chef in Charge:</span>
                    <span className="border-b border-dotted border-slate-400 w-36 inline-block" />
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold">วันที่ / Date:</span>
                    <span className="border-b border-dotted border-slate-400 w-36 inline-block" />
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
            <span>ภาพ PNG คมชัด ความละเอียด 2X พร้อมส่งใน LINE กลุ่มครัวได้ทันที</span>
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
              onClick={handleSaveAsImage}
              className="px-4 py-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-70 text-white rounded-lg flex items-center gap-1.5 transition shadow-sm whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'กำลังสร้างภาพ...' : 'ดาวน์โหลดรูปภาพ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
