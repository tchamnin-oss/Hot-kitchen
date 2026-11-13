import { DAY_KEYS, type StockItem, type WeekDates } from '../types/stock';

export function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonday(dateInput: string): string {
  const parts = dateInput.split('-').map(Number);
  const d =
    parts.length === 3
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(dateInput);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return formatDateToYMD(monday);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatDateToYMD(date);
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function formatShortDate(dateStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, m, d] = dateStr.split('-').map(Number);
  void y;
  return `${d} ${months[m - 1]}`;
}

export function getWeekDates(weekStart: string): WeekDates {
  return {
    mon: weekStart,
    tue: addDays(weekStart, 1),
    wed: addDays(weekStart, 2),
    thu: addDays(weekStart, 3),
    fri: addDays(weekStart, 4),
    sat: addDays(weekStart, 5),
    sun: addDays(weekStart, 6),
  };
}

export function calculateTotal(row: StockItem): number {
  const raw = DAY_KEYS.reduce((sum, day) => {
    const val = row[day];
    const parsed = typeof val === 'number' ? val : parseFloat(String(val));
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);
  return Math.round(raw * 1000) / 1000;
}

export function getUniqueCategories(items: StockItem[]): string[] {
  return Array.from(new Set(items.map((d) => d.category)));
}

export function groupItemsByCategory(items: StockItem[]): StockItem[] {
  const orderedCategories = getUniqueCategories(items);
  const grouped: StockItem[] = [];
  orderedCategories.forEach((cat) => {
    items.forEach((item) => {
      if (item.category === cat) {
        grouped.push(item);
      }
    });
  });
  return grouped;
}

export function exportStockToCSV(stockData: StockItem[], weekStart: string): void {
  const dates = getWeekDates(weekStart);
  const ordered = groupItemsByCategory(stockData);
  let csv = `\uFEFFPAR STOCK (HOT KITCHEN) [${formatDisplayDate(dates.mon)} - ${formatDisplayDate(dates.sun)}]\n`;
  csv += `ITEM,CATEGORY,UNIT,${dates.mon} (Mon),${dates.tue} (Tue),${dates.wed} (Wed),${dates.thu} (Thu),${dates.fri} (Fri),${dates.sat} (Sat),${dates.sun} (Sun)\n`;

  let lastCat = '';
  ordered.forEach((row) => {
    if (row.category !== lastCat) {
      lastCat = row.category;
      csv += `[${lastCat}],,,,,,,,,,\n`;
    }
    const line = [
      `"${row.item.replace(/"/g, '""')}"`,
      `"${row.category}"`,
      `"${row.unit}"`,
      row.mon !== undefined ? row.mon : '',
      row.tue !== undefined ? row.tue : '',
      row.wed !== undefined ? row.wed : '',
      row.thu !== undefined ? row.thu : '',
      row.fri !== undefined ? row.fri : '',
      row.sat !== undefined ? row.sat : '',
      row.sun !== undefined ? row.sun : '',
    ].join(',');
    csv += line + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Par_Stock_Hot_Kitchen_${dates.mon}_to_${dates.sun}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
