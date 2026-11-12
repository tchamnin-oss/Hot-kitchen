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
          {/* Printable / Snapshot Report Card (Clean Table-Only Layout) */}
          <div
            id="summaryReportCard"
            ref={reportCardRef}
            className="bg-white rounded-xl shadow-lg border border-slate-300 p-4 max-w-4xl mx-auto space-y-2.5 text-slate-800"
          >
            {/* Minimal Title & Week Range */}
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-300">
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                PAR STOCK (HOT KITCHEN)
              </h2>
              <span className="text-xs font-bold text-slate-700 tabular-nums">
                {formatDisplayDate(dates.mon)} - {formatDisplayDate(dates.sun)}
              </span>
            </div>

            {/* Single Unified, High-Legibility Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white text-[11px] font-bold">
                    <th className="py-1.5 px-2 text-center w-8">#</th>
                    <th className="py-1.5 px-2.5">รายการวัตถุดิบ</th>
                    <th className="py-1.5 px-2 text-center w-16">หน่วย</th>
                    <th className="py-1.5 px-1.5 text-center w-9">จ.</th>
                    <th className="py-1.5 px-1.5 text-center w-9">อ.</th>
                    <th className="py-1.5 px-1.5 text-center w-9">พ.</th>
                    <th className="py-1.5 px-1.5 text-center w-9">พฤ.</th>
                    <th className="py-1.5 px-1.5 text-center w-9">ศ.</th>
                    <th className="py-1.5 px-1.5 text-center w-9 bg-amber-900/50 text-amber-200">
                      ส.
                    </th>
                    <th className="py-1.5 px-1.5 text-center w-9 bg-amber-900/50 text-amber-200">
                      อา.
                    </th>
                    <th className="py-1.5 px-2.5 text-center w-14 bg-slate-900 text-amber-300">
                      รวม
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const catItems = stockData.filter((i) => i.category === cat);
                    return (
                      <React.Fragment key={cat}>
                        <tr className="bg-slate-200/80 border-y border-slate-300">
                          <td
                            colSpan={11}
                            className="py-1 px-2.5 text-[10.5px] font-extrabold text-slate-800 uppercase tracking-wide"
                          >
                            {cat}
                          </td>
                        </tr>
                        {catItems.map((it, idx) => {
                          const tot = calculateTotal(it);
                          const hasCount = tot > 0;
                          const rowBg = hasCount
                            ? 'bg-amber-50/60'
                            : idx % 2 === 1
                              ? 'bg-slate-50/70'
                              : 'bg-white';

                          return (
                            <tr
                              key={it.docId ?? it.id}
                              className={`${rowBg} border-b border-slate-200/80 text-[11px] leading-snug`}
                            >
                              <td className="py-[3px] px-2 text-center text-slate-400 font-mono text-[10px] tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="py-[3px] px-2.5 font-semibold text-slate-900 whitespace-nowrap">
                                {it.item}
                              </td>
                              <td className="py-[3px] px-2 text-center text-[10px] text-slate-600 font-semibold whitespace-nowrap">
                                {it.unit}
                              </td>
                              {DAY_KEYS.map((day) => {
                                const val = it[day];
                                const hasDayVal = val !== undefined && val !== '' && Number(val) > 0;
                                const isZero = val === 0;
                                return (
                                  <td
                                    key={day}
                                    className={`py-[3px] px-1.5 text-center font-mono text-[11px] tabular-nums ${
                                      hasDayVal
                                        ? 'font-bold text-amber-700'
                                        : isZero
                                          ? 'text-slate-500'
                                          : 'text-slate-300'
                                    }`}
                                  >
                                    {hasDayVal || isZero ? val : '-'}
                                  </td>
                                );
                              })}
                              <td
                                className={`py-[3px] px-2.5 text-center font-bold text-[11.5px] tabular-nums ${
                                  hasCount
                                    ? 'text-slate-900 bg-amber-100/70'
                                    : 'text-slate-300 bg-slate-50/80'
                                }`}
                              >
                                {tot > 0 ? tot : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
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
