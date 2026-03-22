"use client";

import {
  createContext,
  useReducer,
  useEffect,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  STAGES,
  type PipelineState,
  type PipelineAction,
  type StageName,
  type StageStatus,
} from "@/lib/types";

const initialStatuses: Record<StageName, StageStatus> = {
  idea: "active",
  research: "locked",
  script: "locked",
  "shot-list": "locked",
  shoot: "locked",
  edit: "locked",
  thumbnail: "locked",
  caption: "locked",
  schedule: "locked",
};

function makeInitialState(projectId?: string): PipelineState {
  return {
    currentStage: "idea",
    stageStatuses: { ...initialStatuses },
    idea: null,
    research: null,
    script: null,
    shotList: null,
    shoot: null,
    edit: null,
    thumbnail: null,
    caption: null,
    schedule: null,
    template: "full-video-overlay",
    projectId,
  };
}

function getDraftKey(projectId?: string) {
  return projectId ? `reelstudio-draft-${projectId}` : "reelstudio-draft";
}

function getNextStage(stage: StageName): StageName | null {
  const idx = STAGES.indexOf(stage);
  return idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
}

function unlockNext(
  statuses: Record<StageName, StageStatus>,
  currentStage: StageName
): Record<StageName, StageStatus> {
  const next = getNextStage(currentStage);
  if (!next) return statuses;
  return {
    ...statuses,
    [currentStage]: "complete",
    ...(statuses[next] === "locked" ? { [next]: "active" } : {}),
  };
}

function pipelineReducer(
  state: PipelineState,
  action: PipelineAction
): PipelineState {
  switch (action.type) {
    case "SET_STAGE":
      return { ...state, currentStage: action.stage };

    case "SET_STAGE_STATUS":
      return {
        ...state,
        stageStatuses: {
          ...state.stageStatuses,
          [action.stage]: action.status,
        },
      };

    case "SET_IDEA":
      return {
        ...state,
        idea: action.data,
        stageStatuses: unlockNext(state.stageStatuses, "idea"),
      };

    case "SET_RESEARCH":
      return {
        ...state,
        research: action.data,
        stageStatuses: unlockNext(state.stageStatuses, "research"),
      };

    case "SET_SCRIPT":
      return {
        ...state,
        script: action.data,
        stageStatuses: unlockNext(state.stageStatuses, "script"),
      };

    case "SET_SHOT_LIST":
      return {
        ...state,
        shotList: action.data,
        stageStatuses: unlockNext(state.stageStatuses, "shot-list"),
      };

    case "SET_SHOOT":
      return {
        ...state,
        shoot: action.data,
        stageStatuses: unlockNext(state.stageStatuses, "shoot"),
      };

    case "SET_EDIT":
      return {
        ...state,
        edit: action.data,
        stageStatuses: unlockNext(state.stageStatuses, "edit"),
      };

    case "SET_THUMBNAIL":
      return {
        ...state,
        thumbnail: action.data,
        stageStatuses: unlockNext(state.stageStatuses, "thumbnail"),
      };

    case "SET_CAPTION":
      return {
        ...state,
        caption: action.data,
        stageStatuses: unlockNext(state.stageStatuses, "caption"),
      };

    case "SET_SCHEDULE":
      return {
        ...state,
        schedule: action.data,
        stageStatuses: {
          ...state.stageStatuses,
          schedule: "complete",
        },
      };

    case "SET_TEMPLATE":
      return { ...state, template: action.template };

    case "HYDRATE":
      return { ...action.state };

    case "RESET":
      return makeInitialState(state.projectId);

    default:
      return state;
  }
}

export const PipelineContext = createContext<{
  state: PipelineState;
  dispatch: Dispatch<PipelineAction>;
} | null>(null);

interface PipelineProviderProps {
  children: ReactNode;
  projectId?: string;
}

export function PipelineProvider({ children, projectId }: PipelineProviderProps) {
  const draftKey = getDraftKey(projectId);
  const [state, dispatch] = useReducer(pipelineReducer, makeInitialState(projectId));
  const prevStateRef = useRef(state);

  // Auto-save to localStorage on every state change
  useEffect(() => {
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;
    try {
      const serializable = {
        ...state,
        shoot: state.shoot ? { clips: {} } : null,
        edit: state.edit ? { editSpec: state.edit.editSpec } : null,
      };
      localStorage.setItem(draftKey, JSON.stringify(serializable));
    } catch {
      // localStorage might be full — ignore
    }
  }, [state, draftKey]);

  // Hydrate from localStorage on mount (or when projectId changes)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.currentStage) {
          dispatch({
            type: "HYDRATE",
            state: { ...makeInitialState(projectId), ...parsed, projectId },
          });
          return;
        }
      }
      // No saved state — reset to fresh initial for this project
      dispatch({ type: "HYDRATE", state: makeInitialState(projectId) });
    } catch {
      // Ignore corrupt data
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  return (
    <PipelineContext.Provider value={{ state, dispatch }}>
      {children}
    </PipelineContext.Provider>
  );
}
