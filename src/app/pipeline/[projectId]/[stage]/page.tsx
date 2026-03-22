import { notFound } from "next/navigation";
import type { StageName } from "@/lib/types";

// Stage page components (all are "use client" components)
import IdeaPage from "@/app/pipeline/idea/page";
import ResearchPage from "@/app/pipeline/research/page";
import ScriptPage from "@/app/pipeline/script/page";
import ShotListPage from "@/app/pipeline/shot-list/page";
import ShootPage from "@/app/pipeline/shoot/page";
import EditPage from "@/app/pipeline/edit/page";
import ThumbnailPage from "@/app/pipeline/thumbnail/page";
import CaptionPage from "@/app/pipeline/caption/page";
import SchedulePage from "@/app/pipeline/schedule/page";

const STAGE_COMPONENTS: Record<StageName, React.ComponentType> = {
  idea: IdeaPage,
  research: ResearchPage,
  script: ScriptPage,
  "shot-list": ShotListPage,
  shoot: ShootPage,
  edit: EditPage,
  thumbnail: ThumbnailPage,
  caption: CaptionPage,
  schedule: SchedulePage,
};

const VALID_STAGES = new Set<string>([
  "idea", "research", "script", "shot-list", "shoot", "edit", "thumbnail", "caption", "schedule",
]);

export default async function StagePage({
  params,
}: {
  params: Promise<{ projectId: string; stage: string }>;
}) {
  const { stage } = await params;

  if (!VALID_STAGES.has(stage)) return notFound();

  const StageComponent = STAGE_COMPONENTS[stage as StageName];
  return <StageComponent />;
}
