const DB_NAME = "WebArchiverDB";
const DB_VERSION = 1;
const STORE_REQUESTS = "requests";
const STORE_SNAPSHOTS = "snapshots";

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_REQUESTS)) {
        db.createObjectStore(STORE_REQUESTS, { keyPath: "requestId" });
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { autoIncrement: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveToDB(storeName, data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getAllFromDB(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function clearDB() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_REQUESTS, STORE_SNAPSHOTS], "readwrite");
      const requestsClear = tx.objectStore(STORE_REQUESTS).clear();
      const snapshotsClear = tx.objectStore(STORE_SNAPSHOTS).clear();
      
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}

export { initDB, saveToDB, clearDB, getAllFromDB };
