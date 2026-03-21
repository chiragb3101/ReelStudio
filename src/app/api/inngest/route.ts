import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { renderMotionGraphic } from "@/inngest/functions/render-motion-graphic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [renderMotionGraphic],
});
