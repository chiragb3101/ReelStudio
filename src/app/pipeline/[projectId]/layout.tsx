import { PipelineProvider } from "@/providers/pipeline-provider";
import { MotionGraphicProvider } from "@/providers/motion-graphic-provider";
import { AppHeader } from "@/components/shell/app-header";
import { StageSidebar } from "@/components/shell/stage-sidebar";

export default async function ProjectPipelineLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <PipelineProvider projectId={projectId}>
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
