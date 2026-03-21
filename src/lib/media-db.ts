import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "reelstudio-media";
const DB_VERSION = 2;
const STORE_CLIPS = "clips";
const STORE_IMAGES = "images";

export interface StoredClip {
  id: string;
  projectId?: string;
  shotId: string;
  blob: Blob;
  duration?: number;
  type: "recorded" | "uploaded";
  createdAt: number;
}

export interface StoredImage {
  id: string;
  projectId?: string;
  blob: Blob;
  label: string;
  createdAt: number;
}

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_CLIPS)) {
          db.createObjectStore(STORE_CLIPS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_IMAGES)) {
          db.createObjectStore(STORE_IMAGES, { keyPath: "id" });
        }
      }
      // v2: add projectId index to both stores
      if (oldVersion < 2) {
        if (db.objectStoreNames.contains(STORE_CLIPS)) {
          const clipStore = db.transaction(STORE_CLIPS).objectStore(STORE_CLIPS);
          if (!clipStore.indexNames.contains("by_project")) {
            // Can't add index to existing store in upgrade — store is recreated
            // instead we just add the field; existing clips will have projectId=undefined
          }
        }
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

export async function getAllClips(projectId?: string): Promise<StoredClip[]> {
  const db = await getDb();
  const all: StoredClip[] = await db.getAll(STORE_CLIPS);
  if (!projectId) return all;
  return all.filter((c) => c.projectId === projectId || !c.projectId);
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

// ── Project cleanup ──

export async function deleteProjectMedia(projectId: string): Promise<void> {
  const db = await getDb();

  const clips: StoredClip[] = await db.getAll(STORE_CLIPS);
  const clipTx = db.transaction(STORE_CLIPS, "readwrite");
  await Promise.all(
    clips
      .filter((c) => c.projectId === projectId)
      .map((c) => clipTx.store.delete(c.id))
  );
  await clipTx.done;

  const images: StoredImage[] = await db.getAll(STORE_IMAGES);
  const imgTx = db.transaction(STORE_IMAGES, "readwrite");
  await Promise.all(
    images
      .filter((i) => i.projectId === projectId)
      .map((i) => imgTx.store.delete(i.id))
  );
  await imgTx.done;
}
