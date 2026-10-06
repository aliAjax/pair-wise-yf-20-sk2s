import { createContext, useContext, useMemo, useReducer } from "react";
import type { Dispatch, ReactNode } from "react";
import type { FireNode, ScheduleResult, Segment, ShowState } from "../engine/types";
import { computeSchedule, countRipple } from "../engine/schedule";
import { diffSegments, type DiffEntry } from "../engine/diff";
import { fmtMs } from "../engine/time";
import { seedShow } from "../data/seed";

export interface SaveConflict {
  segmentId: string;
  segmentName: string;
  savedBy: string;
  entries: DiffEntry[];
}

interface StoreState {
  show: ShowState;
  schedule: ScheduleResult;
  currentUser: string;
  notice: string | null;
  saveConflict: SaveConflict | null;
  editorResetNonce: number;
}

type Action =
  | { type: "setUser"; user: string }
  | { type: "updateMusicPoint"; segmentId: string; pointId: string; timeMs: number }
  | { type: "updateNode"; nodeId: string; patch: Partial<Pick<FireNode, "offsetMs" | "angleDeg">> }
  | { type: "togglePin"; nodeId: string }
  | { type: "toggleModule"; moduleId: string }
  | { type: "saveSegment"; draft: Segment; baseVersion: number }
  | { type: "simulateExternalSave"; segmentId: string }
  | { type: "dismissConflict"; reloadEditor: boolean }
  | { type: "resetShow" }
  | { type: "clearNotice" };

function otherUser(u: string): string {
  return u === "编导甲" ? "编导乙" : "编导甲";
}

/** 每次改动后全量重算，并生成“牵动全场”提示 */
function withRecompute(state: StoreState, show: ShowState, headline: string): StoreState {
  const schedule = computeSchedule(show, state.schedule.placements);
  const ripple = countRipple(state.schedule, schedule);
  const parts = [headline];
  if (ripple > 0) parts.push(`牵动重算 ${ripple} 个节点`);
  parts.push(`当前冲突 ${schedule.conflicts.length} 处`);
  return { ...state, show, schedule, notice: parts.join(" · ") };
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "setUser":
      return { ...state, currentUser: action.user, notice: `已切换为 ${action.user}` };

    case "updateMusicPoint": {
      const show: ShowState = {
        ...state.show,
        segments: state.show.segments.map((s) =>
          s.id !== action.segmentId
            ? s
            : {
                ...s,
                version: s.version + 1,
                updatedBy: state.currentUser,
                musicPoints: s.musicPoints.map((m) =>
                  m.id === action.pointId ? { ...m, timeMs: action.timeMs } : m
                ),
              }
        ),
      };
      const seg = show.segments.find((s) => s.id === action.segmentId);
      const mp = seg?.musicPoints.find((m) => m.id === action.pointId);
      return withRecompute(
        state,
        show,
        `音乐点「${mp?.label ?? action.pointId}」调整为 ${fmtMs(action.timeMs)}（钉住的节点保持不动）`
      );
    }

    case "updateNode": {
      const show: ShowState = {
        ...state.show,
        nodes: state.show.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, ...action.patch } : n
        ),
      };
      return withRecompute(state, show, `节点 ${action.nodeId} 参数已更新`);
    }

    case "togglePin": {
      const node = state.show.nodes.find((n) => n.id === action.nodeId);
      if (!node) return state;
      const placement = state.schedule.placements.get(action.nodeId);
      const show: ShowState = {
        ...state.show,
        nodes: state.show.nodes.map((n) =>
          n.id === action.nodeId
            ? n.pinned
              ? { ...n, pinned: false, pinnedTimeMs: null }
              : { ...n, pinned: true, pinnedTimeMs: placement?.scheduledMs ?? n.pinnedTimeMs }
            : n
        ),
      };
      return withRecompute(
        state,
        show,
        node.pinned ? `节点 ${node.id} 已取消钉住，跟随音乐点重算` : `节点 ${node.id} 已钉住在 ${fmtMs(placement?.scheduledMs ?? 0)}`
      );
    }

    case "toggleModule": {
      const mod = state.show.modules.find((m) => m.id === action.moduleId);
      if (!mod) return state;
      const show: ShowState = {
        ...state.show,
        modules: state.show.modules.map((m) =>
          m.id === action.moduleId ? { ...m, online: !m.online } : m
        ),
      };
      return withRecompute(
        state,
        show,
        mod.online
          ? `模块 ${mod.name} 掉线，其节点按余量重排`
          : `模块 ${mod.name} 恢复上线，节点重新排程`
      );
    }

    case "saveSegment": {
      const current = state.show.segments.find((s) => s.id === action.draft.id);
      if (!current) return state;
      // 并发保存：版本不一致说明有人先落了，先落的留下，晚到的列出差异
      if (current.version !== action.baseVersion) {
        return {
          ...state,
          saveConflict: {
            segmentId: current.id,
            segmentName: current.name,
            savedBy: current.updatedBy,
            entries: diffSegments(action.draft, current),
          },
          notice: `保存冲突：${current.updatedBy} 已先保存 ${current.name}（v${current.version}），你的修改未写入`,
        };
      }
      const saved: Segment = {
        ...action.draft,
        version: current.version + 1,
        updatedBy: state.currentUser,
      };
      const show: ShowState = {
        ...state.show,
        segments: state.show.segments.map((s) => (s.id === saved.id ? saved : s)),
      };
      return withRecompute(state, show, `${saved.name} 已保存为 v${saved.version}`);
    }

    case "simulateExternalSave": {
      const seg = state.show.segments.find((s) => s.id === action.segmentId);
      if (!seg) return state;
      const actor = otherUser(state.currentUser);
      const show: ShowState = {
        ...state.show,
        segments: state.show.segments.map((s) =>
          s.id !== seg.id
            ? s
            : {
                ...s,
                version: s.version + 1,
                updatedBy: actor,
                musicPoints: s.musicPoints.map((m, i) =>
                  i === 0 ? { ...m, timeMs: m.timeMs + 1500 } : m
                ),
              }
        ),
      };
      return withRecompute(
        state,
        show,
        `${actor} 并发保存了 ${seg.name}（v${seg.version + 1}）：音乐点「${seg.musicPoints[0]?.label}」+1.5s`
      );
    }

    case "dismissConflict":
      return {
        ...state,
        saveConflict: null,
        editorResetNonce: action.reloadEditor
          ? state.editorResetNonce + 1
          : state.editorResetNonce,
      };

    case "resetShow":
      return init();

    case "clearNotice":
      return { ...state, notice: null };

    default:
      return state;
  }
}

function init(): StoreState {
  const show = seedShow();
  return {
    show,
    schedule: computeSchedule(show, null),
    currentUser: "编导甲",
    notice: null,
    saveConflict: null,
    editorResetNonce: 0,
  };
}

interface StoreApi {
  state: StoreState;
  dispatch: Dispatch<Action>;
}

const StoreCtx = createContext<StoreApi | null>(null);

export function ShowStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const api = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useShowStore(): StoreApi {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useShowStore must be used within ShowStoreProvider");
  return ctx;
}
