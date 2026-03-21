"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ReelEditSpec } from "@/lib/types";
import { FPS, REEL_WIDTH, REEL_HEIGHT } from "@/lib/constants";

const Player = dynamic(
  () => import("@remotion/player").then((mod) => mod.Player),
  { ssr: false }
);

const ReelCompositionModule = dynamic(
  () =>
    import("@/remotion/compositions/reel-composition").then((mod) => ({
      default: mod.ReelComposition,
    })),
  { ssr: false }
);

interface EditPreviewProps {
  editSpec: ReelEditSpec;
  assetUrls: Record<string, string>;
}

export function EditPreview({ editSpec, assetUrls }: EditPreviewProps) {
  const totalDuration = useMemo(
    () => editSpec.scenes.reduce((sum, s) => sum + s.durationFrames, 0),
    [editSpec]
  );

  if (totalDuration === 0) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden border border-border/50 bg-black"
      style={{ maxWidth: 360, margin: "0 auto" }}
    >
      <Player
        component={ReelCompositionModule as any}
        inputProps={{ editSpec, assetUrls }}
        durationInFrames={totalDuration}
        fps={FPS}
        compositionWidth={REEL_WIDTH}
        compositionHeight={REEL_HEIGHT}
        style={{
          width: "100%",
          aspectRatio: "9/16",
        }}
        controls
        autoPlay={false}
        loop
      />
    </div>
  );
}
