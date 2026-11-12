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

export const WORKSPACE_ID = 'hot_kitchen';

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

export async function ensureKitchenSeeded(): Promise<void> {
  const kitchenPath = `kitchens/${WORKSPACE_ID}`;
  const kitchenRef = doc(db, 'kitchens', WORKSPACE_ID);

  let kitchenExists = false;
  try {
    const snap = await getDoc(kitchenRef);
    kitchenExists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, kitchenPath);
  }

  let createdByUs = false;
  if (!kitchenExists) {
    try {
      await setDoc(kitchenRef, {
        workspaceId: WORKSPACE_ID,
        weekStart: DEFAULT_MONDAY,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      createdByUs = true;
    } catch (error) {
      // Handle race condition if another concurrent visitor just created the workspace
      const recheck = await getDoc(kitchenRef).catch(() => null);
      if (!recheck?.exists()) {
        handleFirestoreError(error, OperationType.CREATE, kitchenPath);
      }
    }
  }

  const itemsPath = `kitchens/${WORKSPACE_ID}/items`;
  let existingCount = 0;
  try {
    const existingSnap = await getDocs(
      query(
        collection(db, 'kitchens', WORKSPACE_ID, 'items'),
        where('workspaceId', '==', WORKSPACE_ID)
      )
    );
    existingCount = existingSnap.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, itemsPath);
  }

  if (createdByUs && existingCount === 0) {
    try {
      const batch = writeBatch(db);
      DEFAULT_STOCK_DATA.forEach((row, index) => {
        const docId = `item_${row.id}`;
        const itemRef = doc(db, 'kitchens', WORKSPACE_ID, 'items', docId);
        batch.set(itemRef, {
          workspaceId: WORKSPACE_ID,
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
  onData: (weekStart: string) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const kitchenPath = `kitchens/${WORKSPACE_ID}`;
  const kitchenRef = doc(db, 'kitchens', WORKSPACE_ID);

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
  onData: (items: StockItem[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const itemsPath = `kitchens/${WORKSPACE_ID}/items`;
  const itemsQuery = query(
    collection(db, 'kitchens', WORKSPACE_ID, 'items'),
    where('workspaceId', '==', WORKSPACE_ID)
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

export async function updateKitchenWeekStart(weekStart: string): Promise<void> {
  const kitchenPath = `kitchens/${WORKSPACE_ID}`;
  const validWeekStart = sanitizeWeekStart(weekStart);
  try {
    await updateDoc(doc(db, 'kitchens', WORKSPACE_ID), {
      weekStart: validWeekStart,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, kitchenPath);
  }
}

export async function updateStockItemDay(
  docId: string,
  day: DayKey,
  value: number | ''
): Promise<void> {
  const itemPath = `kitchens/${WORKSPACE_ID}/items/${docId}`;
  try {
    await updateDoc(doc(db, 'kitchens', WORKSPACE_ID, 'items', docId), {
      [day]: sanitizeDayQty(value),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, itemPath);
  }
}

export async function updateStockItemDetails(
  docId: string,
  payload: {
    category: string;
    item: string;
    unit: string;
  }
): Promise<void> {
  const itemPath = `kitchens/${WORKSPACE_ID}/items/${docId}`;
  try {
    await updateDoc(doc(db, 'kitchens', WORKSPACE_ID, 'items', docId), {
      category: payload.category.trim().slice(0, MAX_CATEGORY_LEN) || 'GENERAL',
      item: payload.item.trim().slice(0, MAX_ITEM_LEN),
      unit: payload.unit.trim().toUpperCase().slice(0, MAX_UNIT_LEN) || 'PCS',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, itemPath);
  }
}

export async function addStockItemToFirestore(
  payload: {
    category: string;
    item: string;
    unit: string;
    initialMon: number | '';
  },
  nextSortOrder: number
): Promise<void> {
  const itemsCol = collection(db, 'kitchens', WORKSPACE_ID, 'items');
  const newDocRef = doc(itemsCol);
  const itemPath = `kitchens/${WORKSPACE_ID}/items/${newDocRef.id}`;

  try {
    await setDoc(newDocRef, {
      workspaceId: WORKSPACE_ID,
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

export async function deleteStockItemFromFirestore(docId: string): Promise<void> {
  const itemPath = `kitchens/${WORKSPACE_ID}/items/${docId}`;
  try {
    await deleteDoc(doc(db, 'kitchens', WORKSPACE_ID, 'items', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, itemPath);
  }
}

export async function resetKitchenToDefault(): Promise<void> {
  const itemsPath = `kitchens/${WORKSPACE_ID}/items`;
  const kitchenPath = `kitchens/${WORKSPACE_ID}`;

  let existingDocs;
  try {
    const snap = await getDocs(
      query(
        collection(db, 'kitchens', WORKSPACE_ID, 'items'),
        where('workspaceId', '==', WORKSPACE_ID)
      )
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

  try {
    await updateDoc(doc(db, 'kitchens', WORKSPACE_ID), {
      weekStart: DEFAULT_MONDAY,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, kitchenPath);
  }

  try {
    const createBatch = writeBatch(db);
    DEFAULT_STOCK_DATA.forEach((row, index) => {
      const docId = `item_${row.id}`;
      const itemRef = doc(db, 'kitchens', WORKSPACE_ID, 'items', docId);
      createBatch.set(itemRef, {
        workspaceId: WORKSPACE_ID,
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
