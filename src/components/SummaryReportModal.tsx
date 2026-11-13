import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toJpeg, toPng } from 'html-to-image';
import {
  BarChart3,
  Camera,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Printer,
  ShieldCheck,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useTableZoom } from '../hooks/useTableZoom';
import { DAY_KEYS, DAY_LABELS, type StockItem } from '../types/stock';
import {
  formatDisplayDate,
  formatShortDate,
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

  const previewZoom = useTableZoom({
    minScale: 0.3,
    maxScale: 1.5,
    step: 0.1,
    autoFitWhenOverflow: true,
    fixedContentWidth: 820,
    measureTrigger: `${isOpen}-${stockData.length}`,
  });

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
      const node = reportCardRef.current;
      let dataUrl: string;
      const baseOptions = {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: node.scrollWidth,
        height: node.scrollHeight,
        ...(format === 'jpg' ? { quality: 0.95 } : {}),
      };

      const renderFn = format === 'jpg' ? toJpeg : toPng;

      try {
        dataUrl = await renderFn(node, {
          ...baseOptions,
          cacheBust: true,
        });
      } catch {
        dataUrl = await renderFn(node, {
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

        {/* Preview Zoom Toolbar */}
        <div className="bg-slate-800 text-slate-200 px-4 py-1.5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs no-print">
          <span className="text-[11px] text-slate-300">
            ดูตารางครบทุกวัน (จ.–อา.) • ย่อ/ขยาย หรือจีบนิ้วเพื่อซูมได้
          </span>

          <div className="flex items-center gap-1.5">
            <div className="inline-flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
              <button
                type="button"
                onClick={previewZoom.zoomOut}
                disabled={!previewZoom.canZoomOut}
                title="ย่อพรีวิว"
                aria-label="ย่อพรีวิว"
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-35 disabled:pointer-events-none rounded transition"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-[11px] font-bold text-slate-100 tabular-nums min-w-[44px] text-center select-none">
                {previewZoom.percent}%
              </span>
              <button
                type="button"
                onClick={previewZoom.zoomIn}
                disabled={!previewZoom.canZoomIn}
                title="ขยายพรีวิว"
                aria-label="ขยายพรีวิว"
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-35 disabled:pointer-events-none rounded transition"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {(previewZoom.canFit || previewZoom.mode === 'fit') && (
              <button
                type="button"
                onClick={previewZoom.toggleFit}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition whitespace-nowrap shrink-0 border ${
                  previewZoom.mode === 'fit'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-900 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {previewZoom.mode === 'fit' ? (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    <span>พอดีจอ</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3 text-amber-400" />
                    <span>ดูเต็มตาราง</span>
                  </>
                )}
              </button>
            )}

            {previewZoom.isScaled && (
              <button
                type="button"
                onClick={previewZoom.resetZoom}
                className="px-2 py-1 text-[11px] font-medium bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition whitespace-nowrap shrink-0"
              >
                100%
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div
          ref={previewZoom.viewportRef}
          className="p-3 sm:p-4 overflow-auto custom-scrollbar flex-1 bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible"
        >
          <div
            className="overflow-hidden mx-auto print:!w-full print:!h-auto print:overflow-visible"
            style={
              previewZoom.isScaled
                ? {
                    width: previewZoom.scaledWidth ? `${previewZoom.scaledWidth}px` : undefined,
                    height: previewZoom.scaledHeight ? `${previewZoom.scaledHeight}px` : undefined,
                  }
                : { width: '820px' }
            }
          >
            <div
              ref={previewZoom.contentRef}
              className="w-[820px] origin-top-left print:!transform-none print:!w-full"
              style={
                previewZoom.isScaled
                  ? {
                      transform: `scale(${previewZoom.scale})`,
                    }
                  : undefined
              }
            >
              {/* Printable / Snapshot Report Card (Full-Width Table-Only Layout, kept unscaled for 2x export) */}
              <div
                id="summaryReportCard"
                ref={reportCardRef}
                className="bg-white rounded-xl shadow-lg border border-slate-300 p-4 w-[820px] min-w-[820px] space-y-2.5 text-slate-800 print:w-full print:min-w-0 print:shadow-none print:border-none"
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
                    <th className="py-1.5 px-2.5 min-w-[220px]">รายการวัตถุดิบ</th>
                    <th className="py-1.5 px-2 text-center w-16">หน่วย</th>
                    {DAY_KEYS.map((day) => {
                      const isWeekend = day === 'sat' || day === 'sun';
                      return (
                        <th
                          key={day}
                          className={`py-1 px-1 text-center w-14 leading-tight ${
                            isWeekend ? 'bg-amber-900/50 text-amber-200' : ''
                          }`}
                        >
                          <div>{DAY_LABELS[day].thShort}</div>
                          <div
                            className={`text-[9px] font-normal tabular-nums ${
                              isWeekend ? 'text-amber-300' : 'text-slate-300'
                            }`}
                          >
                            {formatShortDate(dates[day])}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const catItems = stockData.filter((i) => i.category === cat);
                    return (
                      <React.Fragment key={cat}>
                        <tr className="bg-slate-200/80 border-y border-slate-300">
                          <td
                            colSpan={10}
                            className="py-1 px-2.5 text-[10.5px] font-extrabold text-slate-800 uppercase tracking-wide"
                          >
                            {cat}
                          </td>
                        </tr>
                        {catItems.map((it, idx) => {
                          const hasCount = DAY_KEYS.some((d) => {
                            const v = it[d];
                            return v !== undefined && v !== '' && Number(v) > 0;
                          });
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
                                const hasNum =
                                  val !== undefined &&
                                  val !== '' &&
                                  Number.isFinite(Number(val));
                                const numVal = hasNum ? Number(val) : NaN;
                                const isLowStock = hasNum && numVal < 5;
                                return (
                                  <td
                                    key={day}
                                    className={`py-[3px] px-1.5 text-center font-mono text-[11px] tabular-nums ${
                                      isLowStock
                                        ? 'font-bold text-red-600'
                                        : hasNum && numVal > 0
                                          ? 'font-bold text-amber-700'
                                          : 'text-slate-300'
                                    }`}
                                  >
                                    {hasNum ? val : '-'}
                                  </td>
                                );
                              })}
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
