import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "reelstudio" });

export type RenderMotionGraphicEvent = {
  name: "motion-graphic/render";
  data: {
    jobId: string;
    userId: string;
    tsxCode: string;
    rootCode: string;
    totalFrames: number;
    mgWidth: number;
    mgHeight: number;
    imageRequests: Array<{
      prompt: string;
      filename: string;
      width?: number;
      height?: number;
    }>;
  };
};
