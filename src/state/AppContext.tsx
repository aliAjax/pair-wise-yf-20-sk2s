// 全局编排状态：段落 / 节点 / 模块 / 冲突 / 并发保存

import { createContext, useContext, useReducer, type ReactNode } from "react";
import type {
  Conflict,
  DiffEntry,
  FireworkType,
  IgnitionModule,
  IgnitionNode,
  LogEntry,
  Segment,
} from "../types";
import {
  initialNodes,
  modules as initialModules,
  segments as initialSegments,
  types,
} from "../data";
import { recompute, rearrangeOffline } from "../engine/scheduler";
import { saveSegment } from "../engine/collab";
import { round3 } from "../engine/format";

let logSeq = 0;
function makeLog(text: string): LogEntry {
  return { id: `L${++logSeq}`, text };
}

const typeInfo = new Map(
  types.map((t) => [t.id, { safetyDistance: t.safetyDistance, minSeparation: t.minSeparation }])
);

function recomputeNodes(
  nodes: IgnitionNode[],
  segments: Segment[],
  modules: IgnitionModule[]
): { nodes: IgnitionNode[]; conflicts: Conflict[] } {
  return recompute(nodes, segments, modules, typeInfo);
}

interface State {
  types: FireworkType[];
  segments: Segment[];
  modules: IgnitionModule[];
  nodes: IgnitionNode[];
  conflicts: Conflict[];
  log: LogEntry[];
  editor: "A" | "B";
  draft: Segment | null;
  baseVersion: number;
  saveDialog: { diff: DiffEntry[]; serverSegment: Segment } | null;
  selectedNodeId: string | null;
  selectedSegmentId: string | null;
}

type Action =
  | { type: "ADD_SEGMENT" }
  | { type: "SELECT_SEGMENT"; id: string }
  | { type: "UPDATE_DRAFT"; patch: Partial<Segment> }
  | { type: "SAVE_DRAFT" }
  | { type: "DISCARD_DRAFT" }
  | { type: "SWITCH_EDITOR"; editor: "A" | "B" }
  | { type: "CLOSE_SAVE_DIALOG" }
  | { type: "ADD_NODE" }
  | { type: "UPDATE_NODE"; id: string; patch: Partial<IgnitionNode> }
  | { type: "DELETE_NODE"; id: string }
  | { type: "TOGGLE_PIN"; id: string }
  | { type: "TOGGLE_MODULE"; id: string }
  | { type: "RUN_SCHEDULE" }
  | { type: "SELECT_NODE"; id: string | null }
  | { type: "CLEAR_LOG" };

const initialRecomputed = recomputeNodes(initialNodes, initialSegments, initialModules);

const initialState: State = {
  types,
  segments: initialSegments,
  modules: initialModules,
  nodes: initialRecomputed.nodes,
  conflicts: initialRecomputed.conflicts,
  log: [makeLog("编排系统就绪，已完成初始调度")],
  editor: "A",
  draft: null,
  baseVersion: 0,
  saveDialog: null,
  selectedNodeId: null,
  selectedSegmentId: initialSegments[0]?.id ?? null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_SEGMENT": {
      const maxTime = state.segments.reduce((m, s) => Math.max(m, s.musicTime), 0);
      const seg: Segment = {
        id: `s${Date.now()}`,
        name: "新段落",
        musicTime: round3(maxTime + 30),
        duration: 30,
        version: 1,
        updatedBy: state.editor,
        updatedAt: Date.now(),
      };
      return {
        ...state,
        segments: [...state.segments, seg],
        selectedSegmentId: seg.id,
        log: [makeLog(`新增段落 ${seg.name}`), ...state.log],
      };
    }

    case "SELECT_SEGMENT": {
      const seg = state.segments.find((s) => s.id === action.id);
      if (!seg) return state;
      return {
        ...state,
        draft: { ...seg },
        baseVersion: seg.version,
        selectedSegmentId: seg.id,
      };
    }

    case "UPDATE_DRAFT": {
      if (!state.draft) return state;
      return { ...state, draft: { ...state.draft, ...action.patch } };
    }

    case "SAVE_DRAFT": {
      if (!state.draft) return state;
      const server = state.segments.find((s) => s.id === state.draft!.id);
      if (!server) return state;
      const result = saveSegment(state.draft, state.baseVersion, server);
      if (result.ok) {
        const updated: Segment = {
          ...state.draft,
          version: server.version + 1,
          updatedBy: state.editor,
          updatedAt: Date.now(),
        };
        const segments = state.segments.map((s) => (s.id === updated.id ? updated : s));
        const before = state.nodes;
        const { nodes, conflicts } = recomputeNodes(state.nodes, segments, state.modules);
        const shifted = nodes.filter((n) => {
          const prev = before.find((b) => b.id === n.id);
          return prev && !n.pinned && Math.abs(n.time - prev.time) > 0.001;
        }).length;
        const queued = nodes.filter((n) => n.queued).length;
        const delayed = nodes.filter((n) => n.delay > 0).length;
        const entries = [makeLog(`编导师 ${state.editor} 保存段落《${updated.name}》成功 (v${updated.version})`)];
        if (shifted > 0) entries.push(makeLog(`音乐时间点变更，${shifted} 个节点重算时间`));
        if (delayed > 0) entries.push(makeLog(`${delayed} 个节点因间隔冲突顺延`));
        if (queued > 0) entries.push(makeLog(`${queued} 个节点排队等下一台`));
        return {
          ...state,
          segments,
          nodes,
          conflicts,
          draft: null,
          log: [...entries, ...state.log],
        };
      }
      return {
        ...state,
        saveDialog: { diff: result.diff, serverSegment: result.serverSegment! },
        log: [
          makeLog(`编导师 ${state.editor} 保存段落《${state.draft.name}》失败：版本冲突，先落的留下`),
          ...state.log,
        ],
      };
    }

    case "DISCARD_DRAFT":
      return { ...state, draft: null };

    case "SWITCH_EDITOR":
      return { ...state, editor: action.editor, draft: null };

    case "CLOSE_SAVE_DIALOG":
      return { ...state, saveDialog: null, draft: null };

    case "ADD_NODE": {
      const segId = state.selectedSegmentId ?? state.segments[0]?.id;
      if (!segId) return state;
      const seg = state.segments.find((s) => s.id === segId)!;
      const node: IgnitionNode = {
        id: `N${Date.now()}`,
        segmentId: segId,
        typeId: state.types[0].id,
        moduleId: null,
        time: round3(seg.musicTime + 5),
        offset: 5,
        pinned: false,
        angle: 90,
        x: 50,
        y: 60,
        queued: false,
        delay: 0,
        originalModuleId: null,
      };
      const { nodes, conflicts } = recomputeNodes([...state.nodes, node], state.segments, state.modules);
      return {
        ...state,
        nodes,
        conflicts,
        selectedNodeId: node.id,
        log: [makeLog(`新增节点 ${node.id} 到段落《${seg.name}》`), ...state.log],
      };
    }

    case "UPDATE_NODE": {
      let patch = action.patch;
      // 未钉住节点改时间：同步偏移，重算时不被覆盖
      if (patch.time !== undefined) {
        const target = state.nodes.find((n) => n.id === action.id);
        if (target && !target.pinned) {
          const seg = state.segments.find((s) => s.id === target.segmentId);
          if (seg) patch = { ...patch, offset: round3(patch.time - seg.musicTime) };
        }
      }
      const nodes = state.nodes.map((n) => (n.id === action.id ? { ...n, ...patch } : n));
      const recomputed = recomputeNodes(nodes, state.segments, state.modules);
      return { ...state, nodes: recomputed.nodes, conflicts: recomputed.conflicts };
    }

    case "DELETE_NODE": {
      const nodes = state.nodes.filter((n) => n.id !== action.id);
      const recomputed = recomputeNodes(nodes, state.segments, state.modules);
      return {
        ...state,
        nodes: recomputed.nodes,
        conflicts: recomputed.conflicts,
        selectedNodeId: null,
        log: [makeLog(`删除节点 ${action.id}`), ...state.log],
      };
    }

    case "TOGGLE_PIN": {
      const nodes = state.nodes.map((n) => (n.id === action.id ? { ...n, pinned: !n.pinned } : n));
      const recomputed = recomputeNodes(nodes, state.segments, state.modules);
      const pinned = recomputed.nodes.find((n) => n.id === action.id);
      return {
        ...state,
        nodes: recomputed.nodes,
        conflicts: recomputed.conflicts,
        log: [
          makeLog(pinned?.pinned ? `节点 ${action.id} 已钉住，不随段落重算` : `节点 ${action.id} 取消钉住`),
          ...state.log,
        ],
      };
    }

    case "TOGGLE_MODULE": {
      const mod = state.modules.find((m) => m.id === action.id);
      if (!mod) return state;
      if (mod.online) {
        const updatedModules = state.modules.map((m) =>
          m.id === action.id ? { ...m, online: false } : m
        );
        const result = rearrangeOffline(state.nodes, updatedModules, action.id);
        const recomputed = recomputeNodes(result.nodes, state.segments, updatedModules);
        const entries = [makeLog(`模块《${mod.name}》掉线，节点按余量重排`)];
        entries.push(
          result.success
            ? makeLog("重排成功，全部节点已分配")
            : makeLog("重排失败，按原节点重试 (恢复原模块分配)")
        );
        return {
          ...state,
          modules: updatedModules,
          nodes: recomputed.nodes,
          conflicts: recomputed.conflicts,
          log: [...entries, ...state.log],
        };
      }
      const updatedModules = state.modules.map((m) =>
        m.id === action.id ? { ...m, online: true } : m
      );
      const recomputed = recomputeNodes(state.nodes, state.segments, updatedModules);
      return {
        ...state,
        modules: updatedModules,
        nodes: recomputed.nodes,
        conflicts: recomputed.conflicts,
        log: [makeLog(`模块《${mod.name}》上线，重新调度`), ...state.log],
      };
    }

    case "RUN_SCHEDULE": {
      const recomputed = recomputeNodes(state.nodes, state.segments, state.modules);
      return {
        ...state,
        nodes: recomputed.nodes,
        conflicts: recomputed.conflicts,
        log: [makeLog("重新调度完成"), ...state.log],
      };
    }

    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.id };

    case "CLEAR_LOG":
      return { ...state, log: [] };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
