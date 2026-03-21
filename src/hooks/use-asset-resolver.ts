"use client";

import { useState, useEffect, useCallback } from "react";
import { getClipByShotId } from "@/lib/media-db";

export function useAssetResolver(assetIds: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const resolve = useCallback(async () => {
    setLoading(true);
    const resolved: Record<string, string> = {};

    for (const id of assetIds) {
      // Try to get clip from IndexedDB
      const clip = await getClipByShotId(id);
      if (clip) {
        resolved[id] = URL.createObjectURL(clip.blob);
      }
    }

    setUrls(resolved);
    setLoading(false);
  }, [assetIds]);

  useEffect(() => {
    resolve();

    return () => {
      // Cleanup URLs on unmount
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [resolve]); // eslint-disable-line react-hooks/exhaustive-deps

  return { urls, loading };
}
