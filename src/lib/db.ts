import { openDB, type IDBPDatabase } from "idb";

export interface MissionBase {
  id: string;
  type: "recon" | "strike" | "artillery" | "jamming" | string;
  missionNumber: string;
  date: string;
  createdAt: number;
  executor?: string;
  data: Record<string, any>;
}

export interface FuelEntry {
  id: string;
  type: "بترول" | "ديزل";
  monthlyAllowance: number;
  withdrawn: number;
  date: string;
  time?: string;
  month: string;
  executor?: string;
  notes?: string;
}

export interface ShellEntry {
  id: string;
  type: "هاون 82" | "هاون 60" | "MK40";
  count: number;
  date: string;
  time?: string;
  executor?: string;
  notes?: string;
}

export interface CustodyEntry {
  id: string;
  number: number;
  text: string;
  image?: string;
  deliveryDate: string;
  executor?: string;
  createdAt: number;
}

export interface MissionType {
  id: string;
  name: string;
  fields: { key: string; label: string; type: "text" | "textarea" | "date" | "time" | "number" }[];
  whatsappTemplate: string;
  builtin?: boolean;
}

export interface Executor {
  id: string;
  name: string;
  builtin?: boolean;
}

export interface Backup {
  id: string;
  name: string;
  password: string;
  data: string;
  createdAt: number;
}

const DB_NAME = "soqour-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("missions")) {
          db.createObjectStore("missions", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("fuel")) {
          db.createObjectStore("fuel", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("shells")) {
          db.createObjectStore("shells", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("custody")) {
          db.createObjectStore("custody", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("missionTypes")) {
          db.createObjectStore("missionTypes", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("executors")) {
          db.createObjectStore("executors", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("backups")) {
          db.createObjectStore("backups", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAll<T>(store: string): Promise<T[]> {
  const db = await getDB();
  return db.getAll(store);
}
export async function put<T>(store: string, value: T) {
  const db = await getDB();
  return db.put(store, value);
}
export async function del(store: string, key: string) {
  const db = await getDB();
  return db.delete(store, key);
}
export async function get<T>(store: string, key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(store, key);
}
export async function clear(store: string) {
  const db = await getDB();
  return db.clear(store);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function exportAll() {
  const db = await getDB();
  const stores = ["missions", "fuel", "shells", "custody", "missionTypes", "executors", "settings"];
  const out: Record<string, any[]> = {};
  for (const s of stores) {
    out[s] = await db.getAll(s);
  }
  return out;
}

export async function importAll(data: Record<string, any[]>) {
  const db = await getDB();
  for (const [store, items] of Object.entries(data)) {
    if (!db.objectStoreNames.contains(store)) continue;
    const tx = db.transaction(store, "readwrite");
    await tx.store.clear();
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  }
}
