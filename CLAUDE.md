# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npx eslint .     # Lint (no npm script alias)
```

No test suite is currently configured.

## Architecture Overview

ReelStudio is an AI-powered short-form video production platform. Users move through a **9-stage linear pipeline**: Idea → Research → Script → Shot List → Shoot → Edit → Thumbnail → Caption → Schedule. Each stage unlocks when the previous one is completed.

### Key Technologies

- **Next.js 16** (App Router) with React 19 and TypeScript
- **Remotion v4** for client-side video composition and rendering (1080×1920, 30fps)
- **Clerk** for authentication (middleware guards `/pipeline/*` and `/dashboard/*`)
- **Supabase** for project/stage data persistence (`projects` and `project_data` tables)
- **IndexedDB** (via `idb`) for binary media blob storage — see `src/lib/media-db.ts`
- **OpenRouter** to call Claude Sonnet 4 for all AI generation — see `src/lib/openrouter.ts`
- **Tailwind CSS v4** + shadcn/ui + Base UI components

### State Management

All pipeline state lives in `PipelineContext` (`src/providers/pipeline-provider.tsx`) using `useReducer`. State auto-saves to `localStorage` as `"reelstudio-draft"` and can also be persisted to Supabase. Access state via the `usePipeline` hook (`src/hooks/use-pipeline.ts`).

### AI API Routes

All routes are under `src/app/api/ai/` and stream responses as Server-Sent Events (SSE). The `useAiStream` hook (`src/hooks/use-ai-stream.ts`) handles consuming these streams on the client. Each stage has a dedicated endpoint (e.g. `/api/ai/script`, `/api/ai/research`, `/api/ai/shot-list`).

### Video Rendering

The `ReelComposition` Remotion component (`src/remotion/compositions/`) renders scenes sequentially using `Sequence`. Each `ReelScene` can contain a video clip, transitions, text overlays, motion graphics (`MotionGraphicElement`), and karaoke/pop/typewriter captions. The `useRenderVideo` hook triggers rendering to an MP4 blob.

### Path Alias

`@/*` maps to `src/*` — use this for all internal imports.

### Prompts

AI prompt templates for each stage live in `src/lib/prompts/`. When modifying AI behavior, edit the relevant prompt file there.
