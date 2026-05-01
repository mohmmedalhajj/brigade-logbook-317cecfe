import { openDB, type IDBPDatabase } from "idb";
import { Capacitor } from "@capacitor/core";
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from "@capacitor-community/sqlite";

// ============================================================
// Type definitions (unchanged public API)
// ============================================================

export interface MissionAttachment {
  type: "image" | "video";
  dataUrl: string;
  name?: string;
}

export interface MissionBase {
  id: string;
  type: "recon" | "strike" | "artillery" | "jamming" | string;
  missionNumber: string;
  date: string;
  createdAt: number;
  executor?: string;
  data: Record<string, any>;
  attachments?: MissionAttachment[];
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

// ============================================================
// Backend selection — SQLite on native (APK), IndexedDB on web
// ============================================================

const DB_NAME = "soqour-db";
const DB_VERSION = 1;

const STORES = [
  "missions",
  "fuel",
  "shells",
  "custody",
  "missionTypes",
  "executors",
  "backups",
  "settings",
] as const;
type StoreName = (typeof STORES)[number];

const KEY_FIELD: Record<StoreName, string> = {
  missions: "id",
  fuel: "id",
  shells: "id",
  custody: "id",
  missionTypes: "id",
  executors: "id",
  backups: "id",
  settings: "key",
};

const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

// ---------- SQLite (native) ----------
let sqliteConn: SQLiteDBConnection | null = null;
let sqlitePromise: Promise<SQLiteDBConnection> | null = null;

async function getSqlite(): Promise<SQLiteDBConnection> {
  if (sqliteConn) return sqliteConn;
  if (sqlitePromise) return sqlitePromise;
  sqlitePromise = (async () => {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const ret = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
    let db: SQLiteDBConnection;
    if (ret.result && isConn) {
      db = await sqlite.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqlite.createConnection(DB_NAME, false, "no-encryption", DB_VERSION, false);
    }
    await db.open();
    // Create tables: every store is a simple key/value store of JSON blobs.
    const stmts = STORES.map(
      (s) => `CREATE TABLE IF NOT EXISTS ${s} (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`
    ).join("\n");
    await db.execute(stmts);
    sqliteConn = db;
    return db;
  })();
  return sqlitePromise;
}

// ---------- IndexedDB (web) ----------
let idbPromise: Promise<IDBPDatabase> | null = null;

function getIdb() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (!idbPromise) {
    idbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const s of STORES) {
          if (!db.objectStoreNames.contains(s)) {
            db.createObjectStore(s, { keyPath: KEY_FIELD[s] });
          }
        }
      },
    });
  }
  return idbPromise;
}

// Expose getDB for any legacy callers — only meaningful on web.
export function getDB() {
  return getIdb();
}

// ============================================================
// Unified CRUD API
// ============================================================

export async function getAll<T>(store: string): Promise<T[]> {
  if (isNative()) {
    const db = await getSqlite();
    const res = await db.query(`SELECT value FROM ${store};`);
    const rows = res.values || [];
    return rows.map((r: any) => JSON.parse(r.value)) as T[];
  }
  const db = await getIdb();
  return db.getAll(store);
}

export async function put<T extends Record<string, any>>(store: string, value: T) {
  if (isNative()) {
    const db = await getSqlite();
    const keyField = KEY_FIELD[store as StoreName] || "id";
    const key = String(value[keyField]);
    const json = JSON.stringify(value);
    await db.run(
      `INSERT OR REPLACE INTO ${store} (key, value) VALUES (?, ?);`,
      [key, json]
    );
    return key;
  }
  const db = await getIdb();
  return db.put(store, value);
}

export async function del(store: string, key: string) {
  if (isNative()) {
    const db = await getSqlite();
    await db.run(`DELETE FROM ${store} WHERE key = ?;`, [key]);
    return;
  }
  const db = await getIdb();
  return db.delete(store, key);
}

export async function get<T>(store: string, key: string): Promise<T | undefined> {
  if (isNative()) {
    const db = await getSqlite();
    const res = await db.query(`SELECT value FROM ${store} WHERE key = ?;`, [key]);
    const row = (res.values || [])[0];
    return row ? (JSON.parse(row.value) as T) : undefined;
  }
  const db = await getIdb();
  return db.get(store, key);
}

export async function clear(store: string) {
  if (isNative()) {
    const db = await getSqlite();
    await db.execute(`DELETE FROM ${store};`);
    return;
  }
  const db = await getIdb();
  return db.clear(store);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function exportAll() {
  const stores: StoreName[] = ["missions", "fuel", "shells", "custody", "missionTypes", "executors", "settings"];
  const out: Record<string, any[]> = {};
  for (const s of stores) {
    out[s] = await getAll(s);
  }
  return out;
}

export async function importAll(data: Record<string, any[]>) {
  for (const [store, items] of Object.entries(data)) {
    if (!STORES.includes(store as StoreName)) continue;
    await clear(store);
    for (const item of items) {
      await put(store, item);
    }
  }
}
