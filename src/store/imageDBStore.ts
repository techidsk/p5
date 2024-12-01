import { create } from "zustand";
import type { CanvasKit, Image as SkImage } from "canvaskit-wasm";
import { openDB, IDBPDatabase } from "idb";

interface ImageDBStore {
  db: IDBPDatabase | null;
  initDB: () => Promise<void>;
  saveImage: (id: string, imageBuffer: ArrayBuffer) => Promise<void>;
  loadImage: (id: string, canvasKit: CanvasKit) => Promise<SkImage | null>;
}

const DB_NAME = "ImageDB";
const STORE_NAME = "images";
const DB_VERSION = 1;

export const useImageDBStore = create<ImageDBStore>((set, get) => ({
  db: null,

  initDB: async () => {
    if (get().db) return;

    try {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
      set({ db });
    } catch (error) {
      console.error("Failed to init IndexedDB:", error);
      throw error;
    }
  },

  saveImage: async (id: string, imageBuffer: ArrayBuffer) => {
    const { db, initDB } = get();
    if (!db) {
      await initDB();
    }
    
    const currentDB = get().db;
    if (!currentDB) throw new Error("Database not initialized");

    try {
      await currentDB.put(STORE_NAME, imageBuffer, id);
    } catch (error) {
      console.error("Failed to save image:", error);
      throw error;
    }
  },

  loadImage: async (id: string, canvasKit: CanvasKit) => {
    const { db, initDB } = get();
    if (!db) {
      await initDB();
    }

    const currentDB = get().db;
    if (!currentDB) throw new Error("Database not initialized");

    console.log("loadImage", id);
    try {
      const imageBuffer = await currentDB.get(STORE_NAME, id);
      if (!imageBuffer) return null;

      return canvasKit.MakeImageFromEncoded(new Uint8Array(imageBuffer));
    } catch (error) {
      console.error("Failed to load image:", error);
      throw error;
    }
  },
}));
