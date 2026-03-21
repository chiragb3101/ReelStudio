"use client";

import { useState, useCallback, useEffect } from "react";
import {
  saveClip,
  getClipByShotId,
  getAllClips,
  deleteClip,
} from "@/lib/media-db";

interface ClipInfo {
  id: string;
  shotId: string;
  blobUrl: string;
  duration?: number;
  type: "recorded" | "uploaded";
}

export function useMediaStore() {
  const [clips, setClips] = useState<Record<string, ClipInfo>>({});
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const all = await getAllClips();
    const map: Record<string, ClipInfo> = {};
    for (const clip of all) {
      map[clip.shotId] = {
        id: clip.id,
        shotId: clip.shotId,
        blobUrl: URL.createObjectURL(clip.blob),
        duration: clip.duration,
        type: clip.type,
      };
    }
    setClips(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addClip = useCallback(
    async (
      shotId: string,
      blob: Blob,
      type: "recorded" | "uploaded",
      duration?: number
    ) => {
      const id = `clip-${shotId}-${Date.now()}`;
      await saveClip({
        id,
        shotId,
        blob,
        duration,
        type,
        createdAt: Date.now(),
      });
      const blobUrl = URL.createObjectURL(blob);
      setClips((prev) => ({
        ...prev,
        [shotId]: { id, shotId, blobUrl, duration, type },
      }));
    },
    []
  );

  const removeClip = useCallback(async (shotId: string) => {
    setClips((prev) => {
      const existing = prev[shotId];
      if (existing) {
        URL.revokeObjectURL(existing.blobUrl);
        deleteClip(existing.id);
      }
      const next = { ...prev };
      delete next[shotId];
      return next;
    });
  }, []);

  return { clips, loading, addClip, removeClip, loadAll };
}
