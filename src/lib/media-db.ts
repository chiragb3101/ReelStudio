import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "reelstudio-media";
const DB_VERSION = 1;
const STORE_CLIPS = "clips";
const STORE_IMAGES = "images";

interface StoredClip {
  id: string;
  shotId: string;
  blob: Blob;
  duration?: number;
  type: "recorded" | "uploaded";
  createdAt: number;
}

interface StoredImage {
  id: string;
  blob: Blob;
  label: string;
  createdAt: number;
}

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_CLIPS)) {
        db.createObjectStore(STORE_CLIPS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: "id" });
      }
    },
  });
}

// ── Clips ──

export async function saveClip(clip: StoredClip): Promise<void> {
  const db = await getDb();
  await db.put(STORE_CLIPS, clip);
}

export async function getClip(id: string): Promise<StoredClip | undefined> {
  const db = await getDb();
  return db.get(STORE_CLIPS, id);
}

export async function getClipByShotId(
  shotId: string
): Promise<StoredClip | undefined> {
  const db = await getDb();
  const all = await db.getAll(STORE_CLIPS);
  return all.find((c) => c.shotId === shotId);
}

export async function getAllClips(): Promise<StoredClip[]> {
  const db = await getDb();
  return db.getAll(STORE_CLIPS);
}

export async function deleteClip(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_CLIPS, id);
}

export async function clearAllClips(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_CLIPS);
}

// ── Images ──

export async function saveImage(image: StoredImage): Promise<void> {
  const db = await getDb();
  await db.put(STORE_IMAGES, image);
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await getDb();
  return db.get(STORE_IMAGES, id);
}

export async function clearAllImages(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_IMAGES);
}
