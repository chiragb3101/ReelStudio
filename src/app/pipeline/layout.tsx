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
        <div className="flex flex-col h-screen overflow-hidden bg-background relative">
          {/* Subtle background accents */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-0 right-[25%] w-80 h-80 rounded-full bg-primary/3 blur-3xl" />
            <div className="absolute bottom-[30%] left-[5%] w-60 h-60 rounded-full bg-accent/2 blur-3xl" />
          </div>

          <AppHeader />
          <div className="flex flex-1 overflow-hidden relative z-[1]">
            <StageSidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </MotionGraphicProvider>
    </PipelineProvider>
  );
}
