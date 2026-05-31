import type { AppData } from "../../types/domain";
import { createSeedData } from "../../data/seeds";

const DB_NAME = "fateweaver-cache";
const DB_VERSION = 1;
const STORE = "state";
const STATE_KEY = "app";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadCachedData(): Promise<AppData> {
  if (!("indexedDB" in window)) return createSeedData();
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(STATE_KEY);
    request.onsuccess = () => resolve((request.result as AppData | undefined) ?? createSeedData());
    request.onerror = () => resolve(createSeedData());
  });
}

export async function saveCachedData(data: AppData) {
  if (!("indexedDB" in window)) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(data, STATE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
