"use client";

import { useContext } from "react";
import { PipelineContext } from "@/providers/pipeline-provider";

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) {
    throw new Error("usePipeline must be used within PipelineProvider");
  }
  return ctx;
}
