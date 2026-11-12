import type { StockItem } from '../types/stock';

export const STORAGE_KEYS = {
  STOCK: 'hot_kitchen_par_stock_v2',
  WEEK_START: 'hot_kitchen_par_week_start',
} as const;

export const DEFAULT_MONDAY = '2026-11-16';

export const UNIT_OPTIONS = [
  { value: 'KG', label: 'KG (กิโลกรัม)' },
  { value: 'PACK', label: 'PACK (แพ็ค)' },
  { value: 'PORTION', label: 'PORTION (ส่วน)' },
  { value: 'CAN', label: 'CAN (กระป๋อง)' },
  { value: 'GALLON', label: 'GALLON (แกลลอน)' },
  { value: 'PCS', label: 'PCS (ชิ้น)' },
  { value: 'BOX', label: 'BOX (กล่อง)' },
  { value: 'CASE', label: 'CASE (ลัง)' },
  { value: 'BOTTLE', label: 'BOTTLE (ขวด)' },
  { value: 'OTHER', label: 'อื่นๆ (กำหนดเอง)' },
] as const;

export const DEFAULT_STOCK_DATA: StockItem[] = [
  // BREAKFAST / GENERAL
  { id: 1, category: 'BREAKFAST / GENERAL', item: 'Bacon', unit: 'KG', mon: 1, tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 2, category: 'BREAKFAST / GENERAL', item: 'Chicken Sausage', unit: 'PACK', mon: 1, tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 3, category: 'BREAKFAST / GENERAL', item: 'Pork Sausage Chipolata', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 4, category: 'BREAKFAST / GENERAL', item: 'Pork Sausage Mini', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 5, category: 'BREAKFAST / GENERAL', item: 'Pork Sausage Cumberland', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 6, category: 'BREAKFAST / GENERAL', item: 'Veal Sausage', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 7, category: 'BREAKFAST / GENERAL', item: 'English Muffin (30PCS/PACK)', unit: 'PCS', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 8, category: 'BREAKFAST / GENERAL', item: 'Frozen Spinach (PACK)', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 9, category: 'BREAKFAST / GENERAL', item: 'Hash Brown (KG)', unit: 'KG', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 10, category: 'BREAKFAST / GENERAL', item: 'French Fries (PACK)', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 11, category: 'BREAKFAST / GENERAL', item: 'Pancake (PACK)', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 12, category: 'BREAKFAST / GENERAL', item: 'Baked Bean (CAN)', unit: 'CAN', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 13, category: 'BREAKFAST / GENERAL', item: 'Honey Comb', unit: 'PCS', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 14, category: 'BREAKFAST / GENERAL', item: 'Hummus', unit: 'BOX', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 15, category: 'BREAKFAST / GENERAL', item: 'Tzatziki', unit: 'BOX', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 16, category: 'BREAKFAST / GENERAL', item: 'Labneh', unit: 'BOX', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 17, category: 'BREAKFAST / GENERAL', item: 'Egg (CASE)', unit: 'CASE', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 18, category: 'BREAKFAST / GENERAL', item: 'Cream', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },

  // MEAT
  { id: 19, category: 'MEAT', item: 'Ribeye A La Carte', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 20, category: 'MEAT', item: 'Salmon A La Carte', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 21, category: 'MEAT', item: 'Seabass A La Carte', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 22, category: 'MEAT', item: 'Lemon Chicken', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 23, category: 'MEAT', item: 'Pork Chop', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 24, category: 'MEAT', item: 'Calamari', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 25, category: 'MEAT', item: 'Berger Bun', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 26, category: 'MEAT', item: 'Beef Patty', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 27, category: 'MEAT', item: 'Plant Base Berger', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 28, category: 'MEAT', item: 'Nugget', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 29, category: 'MEAT', item: 'Mushroom Soup', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 30, category: 'MEAT', item: 'Potato Soup', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 31, category: 'MEAT', item: 'Red Wine Sauce', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 32, category: 'MEAT', item: 'Pepper Corn Sauce', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 33, category: 'MEAT', item: 'White Wine Sauce', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 34, category: 'MEAT', item: 'Shakshuka', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 35, category: 'MEAT', item: 'Falafel', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 36, category: 'MEAT', item: 'Chicken Shawama', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 37, category: 'MEAT', item: 'Beef Kofta', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 38, category: 'MEAT', item: 'Kimchi Arancini', unit: 'PORTION', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },

  // DRY STORE
  { id: 39, category: 'DRY STORE', item: 'Tomato Peel', unit: 'CAN', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 40, category: 'DRY STORE', item: 'Spaghetti', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 41, category: 'DRY STORE', item: 'Black Ink Spaghetti', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 42, category: 'DRY STORE', item: 'Penne', unit: 'PACK', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 43, category: 'DRY STORE', item: 'Pomace Olive Oil', unit: 'GALLON', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { id: 44, category: 'DRY STORE', item: 'Palm Oil', unit: 'GALLON', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
];
