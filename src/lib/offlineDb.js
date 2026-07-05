const DB_NAME = "resonanse-offline";
const DB_VERSION = 1;
const STORE_NAME = "pendingActions";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function queueAction(type, payload) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const entry = {
    type,
    payload,
    createdAt: Date.now(),
    status: "pending",
    lastError: null,
    serverResponse: null,
  };
  return new Promise((resolve, reject) => {
    const req = store.add(entry);
    req.onsuccess = () => {
      window.dispatchEvent(new CustomEvent("OFFLINE_QUEUE_CHANGED"));
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getPendingActions() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("status");
  return new Promise((resolve, reject) => {
    const req = index.getAll("pending");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getAllActions() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function markSynced(id, response) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result;
      if (entry) {
        entry.status = "synced";
        entry.serverResponse = response;
        const putReq = store.put(entry);
        putReq.onsuccess = () => {
          window.dispatchEvent(new CustomEvent("OFFLINE_QUEUE_CHANGED"));
          resolve();
        };
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => db.close();
  });
}

export async function markFailed(id, error) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result;
      if (entry) {
        entry.status = "failed";
        entry.lastError = typeof error === "string" ? error : (error?.message || "Unknown error");
        const putReq = store.put(entry);
        putReq.onsuccess = () => {
          window.dispatchEvent(new CustomEvent("OFFLINE_QUEUE_CHANGED"));
          resolve();
        };
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => db.close();
  });
}

export async function clearSynced() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("status");
  return new Promise((resolve, reject) => {
    const req = index.openCursor("synced");
    let deleted = 0;
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        deleted++;
        cursor.continue();
      } else {
        window.dispatchEvent(new CustomEvent("OFFLINE_QUEUE_CHANGED"));
        resolve(deleted);
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function clearAll() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => {
      window.dispatchEvent(new CustomEvent("OFFLINE_QUEUE_CHANGED"));
      resolve();
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getPendingCount() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("status");
  return new Promise((resolve, reject) => {
    const req = index.count("pending");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

function generateClientActionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createClientActionId() {
  return generateClientActionId();
}
