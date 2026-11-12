export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABELS: Record<DayKey, { en: string; thShort: string }> = {
  mon: { en: 'Mon', thShort: 'จ.' },
  tue: { en: 'Tue', thShort: 'อ.' },
  wed: { en: 'Wed', thShort: 'พ.' },
  thu: { en: 'Thu', thShort: 'พฤ.' },
  fri: { en: 'Fri', thShort: 'ศ.' },
  sat: { en: 'Sat', thShort: 'ส.' },
  sun: { en: 'Sun', thShort: 'อา.' },
};

export interface StockItem {
  id: number;
  docId?: string;
  sortOrder?: number;
  category: string;
  item: string;
  unit: string;
  mon: number | '';
  tue: number | '';
  wed: number | '';
  thu: number | '';
  fri: number | '';
  sat: number | '';
  sun: number | '';
}

export type WeekDates = Record<DayKey, string>;
