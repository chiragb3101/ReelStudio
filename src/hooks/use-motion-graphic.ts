"use client";

import { useContext } from "react";
import { MotionGraphicContext, type MotionGraphicState } from "@/providers/motion-graphic-provider";

export function useMotionGraphic(): MotionGraphicState {
  const ctx = useContext(MotionGraphicContext);
  if (!ctx) throw new Error("useMotionGraphic must be used within MotionGraphicProvider");
  return ctx;
}
