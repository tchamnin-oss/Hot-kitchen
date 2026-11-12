import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { DEFAULT_MONDAY, DEFAULT_STOCK_DATA } from '../data/defaultStock';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { DayKey, StockItem } from '../types/stock';

const MAX_CATEGORY_LEN = 80;
const MAX_ITEM_LEN = 160;
const MAX_UNIT_LEN = 40;
const MAX_QTY = 1000000;

function sanitizeDayQty(val: number | '' | null | undefined): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(MAX_QTY, Math.round(num * 1000) / 1000);
}

function toUiDayQty(val: unknown): number | '' {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  return Number.isFinite(num) ? num : '';
}

function sanitizeWeekStart(weekStart: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(weekStart) ? weekStart : DEFAULT_MONDAY;
}

export async function ensureKitchenSeeded(uid: string): Promise<void> {
  const kitchenPath = `kitchens/${uid}`;
  const kitchenRef = doc(db, 'kitchens', uid);

  let kitchenExists = false;
  try {
    const snap = await getDoc(kitchenRef);
    kitchenExists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, kitchenPath);
  }

  if (!kitchenExists) {
    try {
      await setDoc(kitchenRef, {
        ownerId: uid,
        weekStart: DEFAULT_MONDAY,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, kitchenPath);
    }
  }

  const itemsPath = `kitchens/${uid}/items`;
  let existingCount = 0;
  try {
    const existingSnap = await getDocs(
      query(collection(db, 'kitchens', uid, 'items'), where('ownerId', '==', uid))
    );
    existingCount = existingSnap.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, itemsPath);
  }

  if (!kitchenExists && existingCount === 0) {
    try {
      const batch = writeBatch(db);
      DEFAULT_STOCK_DATA.forEach((row, index) => {
        const docId = `item_${row.id}`;
        const itemRef = doc(db, 'kitchens', uid, 'items', docId);
        batch.set(itemRef, {
          ownerId: uid,
          sortOrder: index + 1,
          category: row.category.slice(0, MAX_CATEGORY_LEN),
          item: row.item.slice(0, MAX_ITEM_LEN),
          unit: row.unit.slice(0, MAX_UNIT_LEN),
          mon: sanitizeDayQty(row.mon),
          tue: sanitizeDayQty(row.tue),
          wed: sanitizeDayQty(row.wed),
          thu: sanitizeDayQty(row.thu),
          fri: sanitizeDayQty(row.fri),
          sat: sanitizeDayQty(row.sat),
          sun: sanitizeDayQty(row.sun),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, itemsPath);
    }
  }
}

export function subscribeKitchenWorkspace(
  uid: string,
  onData: (weekStart: string) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const kitchenPath = `kitchens/${uid}`;
  const kitchenRef = doc(db, 'kitchens', uid);

  return onSnapshot(
    kitchenRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.weekStart)) {
          onData(data.weekStart);
        }
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, kitchenPath);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeStockItems(
  uid: string,
  onData: (items: StockItem[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const itemsPath = `kitchens/${uid}/items`;
  const itemsQuery = query(
    collection(db, 'kitchens', uid, 'items'),
    where('ownerId', '==', uid)
  );

  return onSnapshot(
    itemsQuery,
    (snapshot) => {
      const mapped: StockItem[] = snapshot.docs.map((docSnap, idx) => {
        const data = docSnap.data();
        const sortOrder =
          typeof data.sortOrder === 'number' && Number.isFinite(data.sortOrder)
            ? data.sortOrder
            : idx + 1;
        return {
          id: sortOrder,
          docId: docSnap.id,
          sortOrder,
          category: String(data.category || 'GENERAL'),
          item: String(data.item || ''),
          unit: String(data.unit || 'PCS'),
          mon: toUiDayQty(data.mon),
          tue: toUiDayQty(data.tue),
          wed: toUiDayQty(data.wed),
          thu: toUiDayQty(data.thu),
          fri: toUiDayQty(data.fri),
          sat: toUiDayQty(data.sat),
          sun: toUiDayQty(data.sun),
        };
      });

      mapped.sort((a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id));
      onData(mapped);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, itemsPath);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function updateKitchenWeekStart(uid: string, weekStart: string): Promise<void> {
  const kitchenPath = `kitchens/${uid}`;
  const validWeekStart = sanitizeWeekStart(weekStart);
  try {
    await updateDoc(doc(db, 'kitchens', uid), {
      weekStart: validWeekStart,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, kitchenPath);
  }
}

export async function updateStockItemDay(
  uid: string,
  docId: string,
  day: DayKey,
  value: number | ''
): Promise<void> {
  const itemPath = `kitchens/${uid}/items/${docId}`;
  try {
    await updateDoc(doc(db, 'kitchens', uid, 'items', docId), {
      [day]: sanitizeDayQty(value),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, itemPath);
  }
}

export async function addStockItemToFirestore(
  uid: string,
  payload: {
    category: string;
    item: string;
    unit: string;
    initialMon: number | '';
  },
  nextSortOrder: number
): Promise<void> {
  const itemsCol = collection(db, 'kitchens', uid, 'items');
  const newDocRef = doc(itemsCol);
  const itemPath = `kitchens/${uid}/items/${newDocRef.id}`;

  try {
    await setDoc(newDocRef, {
      ownerId: uid,
      sortOrder: Math.min(100000, Math.max(1, Math.round(nextSortOrder))),
      category: payload.category.trim().slice(0, MAX_CATEGORY_LEN) || 'GENERAL',
      item: payload.item.trim().slice(0, MAX_ITEM_LEN),
      unit: payload.unit.trim().toUpperCase().slice(0, MAX_UNIT_LEN) || 'PCS',
      mon: sanitizeDayQty(payload.initialMon),
      tue: null,
      wed: null,
      thu: null,
      fri: null,
      sat: null,
      sun: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, itemPath);
  }
}

export async function deleteStockItemFromFirestore(uid: string, docId: string): Promise<void> {
  const itemPath = `kitchens/${uid}/items/${docId}`;
  try {
    await deleteDoc(doc(db, 'kitchens', uid, 'items', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, itemPath);
  }
}

export async function resetKitchenToDefault(uid: string): Promise<void> {
  const itemsPath = `kitchens/${uid}/items`;
  const kitchenPath = `kitchens/${uid}`;

  // 1. Delete existing item docs in batches of <= 400
  let existingDocs;
  try {
    const snap = await getDocs(
      query(collection(db, 'kitchens', uid, 'items'), where('ownerId', '==', uid))
    );
    existingDocs = snap.docs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, itemsPath);
  }

  for (let i = 0; i < existingDocs.length; i += 400) {
    const chunk = existingDocs.slice(i, i + 400);
    const deleteBatch = writeBatch(db);
    chunk.forEach((docSnap) => {
      deleteBatch.delete(docSnap.ref);
    });
    try {
      await deleteBatch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, itemsPath);
    }
  }

  // 2. Reset kitchen weekStart to default Monday
  try {
    await updateDoc(doc(db, 'kitchens', uid), {
      weekStart: DEFAULT_MONDAY,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, kitchenPath);
  }

  // 3. Re-seed all 44 default items with fresh timestamps
  try {
    const createBatch = writeBatch(db);
    DEFAULT_STOCK_DATA.forEach((row, index) => {
      const docId = `item_${row.id}`;
      const itemRef = doc(db, 'kitchens', uid, 'items', docId);
      createBatch.set(itemRef, {
        ownerId: uid,
        sortOrder: index + 1,
        category: row.category.slice(0, MAX_CATEGORY_LEN),
        item: row.item.slice(0, MAX_ITEM_LEN),
        unit: row.unit.slice(0, MAX_UNIT_LEN),
        mon: sanitizeDayQty(row.mon),
        tue: sanitizeDayQty(row.tue),
        wed: sanitizeDayQty(row.wed),
        thu: sanitizeDayQty(row.thu),
        fri: sanitizeDayQty(row.fri),
        sat: sanitizeDayQty(row.sat),
        sun: sanitizeDayQty(row.sun),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await createBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, itemsPath);
  }
}
