import { PipelineProvider } from "@/providers/pipeline-provider";
import { MotionGraphicProvider } from "@/providers/motion-graphic-provider";
import { AppHeader } from "@/components/shell/app-header";
import { StageSidebar } from "@/components/shell/stage-sidebar";

export default function PipelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PipelineProvider>
      <MotionGraphicProvider>
        <div className="flex flex-col h-screen overflow-hidden">
          <AppHeader />
          <div className="flex flex-1 overflow-hidden">
            <StageSidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </MotionGraphicProvider>
    </PipelineProvider>
  );
}
