// 烟花燃放编排引擎：时间重算 / 模块容量调度 / 掉线重排 / 冲突检测

import type { Conflict, IgnitionModule, IgnitionNode, Segment } from "../types";
import { round3 } from "./format";

/** 同一炮位两次点火的最小间隔 (炮管再装填时间) s */
export const MIN_INTERVAL_SAME_POS = 3.0;
/** 同一模块不同炮位两次点火的最小间隔 s */
export const MIN_INTERVAL_SAME_MODULE = 0.6;

/** 平面图尺寸 m */
export const STAGE_WIDTH = 200;
export const STAGE_HEIGHT = 140;
export const AUDIENCE_DEPTH = 20;

let conflictSeq = 0;
function nextConflictId(): string {
  return `c${++conflictSeq}`;
}

/**
 * 改一处牵动全场：段落音乐时间点变化后，
 * 非手工钉住的节点按偏移重算时间，钉住的节点留在原处。
 */
export function recalculateTimes(nodes: IgnitionNode[], segments: Segment[]): IgnitionNode[] {
  return nodes.map((n) => {
    if (n.pinned) return n;
    const seg = segments.find((s) => s.id === n.segmentId);
    if (!seg) return n;
    return { ...n, time: round3(seg.musicTime + n.offset) };
  });
}

/** 模块已占用点数 */
function usedCapacity(nodes: IgnitionNode[], moduleId: string): number {
  return nodes.filter((n) => n.moduleId === moduleId).length;
}

/** 模块在某时刻之前的最后一个已排节点 */
function lastNodeOnModule(nodes: IgnitionNode[], moduleId: string): IgnitionNode | null {
  const on = nodes.filter((n) => n.moduleId === moduleId);
  if (on.length === 0) return null;
  return on.reduce((a, b) => (b.time > a.time ? b : a));
}

function minIntervalBetween(a: IgnitionNode, b: IgnitionNode): number {
  return a.x === b.x && a.y === b.y ? MIN_INTERVAL_SAME_POS : MIN_INTERVAL_SAME_MODULE;
}

/**
 * 调度：把节点排进在线模块。
 * - 容量不足的节点排队等下一台 (queued)
 * - 两次点火挨得太近则顺延 (delay)
 * - 手工钉住的节点时间不动
 */
export function schedule(
  nodes: IgnitionNode[],
  modules: IgnitionModule[]
): IgnitionNode[] {
  const placed = nodes.map((n) => ({
    ...n,
    moduleId: null as string | null,
    queued: false,
    delay: 0,
  }));
  const online = modules.filter((m) => m.online);

  // 钉住的节点先落位 (时间不可动)
  const pinned = placed
    .filter((n) => n.pinned)
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  for (const node of pinned) {
    const candidates = online.filter((m) => usedCapacity(placed, m.id) < m.capacity);
    if (candidates.length === 0) {
      node.queued = true;
      continue;
    }
    // 选顺延量最小的模块 (钉住节点不动，冲突只报不顺延)
    let best: IgnitionModule | null = null;
    let bestGap = -Infinity;
    for (const m of candidates) {
      const last = lastNodeOnModule(placed, m.id);
      if (!last) {
        best = m;
        bestGap = Infinity;
        break;
      }
      const gap = node.time - last.time;
      if (gap > bestGap) {
        best = m;
        bestGap = gap;
      }
    }
    node.moduleId = best!.id;
  }

  // 未钉住的节点按时间顺序落位，冲突可顺延
  const unpinned = placed
    .filter((n) => !n.pinned)
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  for (const node of unpinned) {
    const candidates = online.filter((m) => usedCapacity(placed, m.id) < m.capacity);
    if (candidates.length === 0) {
      node.queued = true;
      continue;
    }
    let best: IgnitionModule | null = null;
    let bestDelay = Infinity;
    for (const m of candidates) {
      const last = lastNodeOnModule(placed, m.id);
      if (!last) {
        best = m;
        bestDelay = 0;
        break;
      }
      const gap = node.time - last.time;
      const minInt = minIntervalBetween(last, node);
      const d = gap < minInt ? round3(minInt - gap) : 0;
      if (d < bestDelay) {
        best = m;
        bestDelay = d;
      }
    }
    node.moduleId = best!.id;
    if (bestDelay > 0) {
      node.delay = round3(node.delay + bestDelay);
      node.time = round3(node.time + bestDelay);
    }
  }

  return placed;
}

/** 检测冲突：容量排队 / 间隔过近 / 安全距离 */
export function detectConflicts(
  nodes: IgnitionNode[],
  modules: IgnitionModule[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // 容量冲突：排队节点
  for (const n of nodes) {
    if (n.queued) {
      conflicts.push({
        id: nextConflictId(),
        kind: "capacity",
        severity: "error",
        nodeIds: [n.id],
        message: `节点 ${n.id} 排队：在线模块容量已满，等下一台`,
      });
    }
  }

  // 间隔冲突：同模块相邻节点小于最小间隔 (钉住节点撞了报冲突，不顺延)
  for (const m of modules) {
    const on = nodes
      .filter((n) => n.moduleId === m.id)
      .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
    for (let i = 1; i < on.length; i++) {
      const prev = on[i - 1];
      const cur = on[i];
      const minInt = minIntervalBetween(prev, cur);
      if (cur.time - prev.time < minInt - 1e-6) {
        conflicts.push({
          id: nextConflictId(),
          kind: "interval",
          severity: cur.pinned || prev.pinned ? "error" : "warning",
          nodeIds: [prev.id, cur.id],
          message: `${m.name} 上 ${prev.id} 与 ${cur.id} 间隔 ${round3(cur.time - prev.time)}s < ${minInt}s`,
        });
      }
    }
  }

  // 安全距离冲突：两个炮位间距小于型号最小间距 (同炮位跨段落复用不算冲突)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (a.x === b.x && a.y === b.y) continue; // 同一炮位复用
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const sepA = (a as IgnitionNode & { minSeparation?: number }).minSeparation ?? 8;
      const sepB = (b as IgnitionNode & { minSeparation?: number }).minSeparation ?? 8;
      const minSep = Math.max(sepA, sepB);
      if (dist < minSep) {
        conflicts.push({
          id: nextConflictId(),
          kind: "safety",
          severity: "error",
          nodeIds: [a.id, b.id],
          message: `${a.id} 与 ${b.id} 炮位过近 (${round3(dist)}m < ${minSep}m)`,
        });
      }
    }
  }

  // 落点距观众区过近
  for (const n of nodes) {
    const r = (n as IgnitionNode & { safetyRadius?: number }).safetyRadius ?? 0;
    const distToAudience = STAGE_HEIGHT - n.y;
    if (r > 0 && distToAudience < r) {
      conflicts.push({
        id: nextConflictId(),
        kind: "safety",
        severity: "error",
        nodeIds: [n.id],
        message: `${n.id} 落点距观众区 ${round3(distToAudience)}m < 安全距离 ${r}m`,
      });
    }
  }

  return conflicts;
}

/**
 * 某台模块掉线：节点按在线模块余量重排。
 * 重排失败 (仍有节点排不下) 则按原节点重试 (恢复原模块分配)。
 */
export function rearrangeOffline(
  nodes: IgnitionNode[],
  modules: IgnitionModule[],
  offlineModuleId: string
): { nodes: IgnitionNode[]; success: boolean } {
  const originalStates = new Map(
    nodes.filter((n) => n.moduleId === offlineModuleId).map((n) => [n.id, { ...n }])
  );
  const cleared = nodes.map((n) =>
    originalStates.has(n.id)
      ? { ...n, moduleId: null, queued: false, delay: 0, originalModuleId: n.moduleId }
      : n
  );
  const attempt = schedule(cleared, modules);
  const failed = attempt.some((n) => n.queued);
  if (failed) {
    const restored = attempt.map((n) => {
      const orig = originalStates.get(n.id);
      if (orig) return { ...orig, originalModuleId: null };
      return n;
    });
    return { nodes: restored, success: false };
  }
  return { nodes: attempt, success: true };
}

/** 重算 + 调度 + 冲突检测，返回最终节点与冲突 */
export function recompute(
  nodes: IgnitionNode[],
  segments: Segment[],
  modules: IgnitionModule[],
  typeInfo: Map<string, { safetyDistance: number; minSeparation: number }>
): { nodes: IgnitionNode[]; conflicts: Conflict[] } {
  const recalc = recalculateTimes(nodes, segments);
  const scheduled = schedule(recalc, modules);
  const withInfo = scheduled.map((n) => {
    const info = typeInfo.get(n.typeId);
    return {
      ...n,
      safetyRadius: info?.safetyDistance ?? 0,
      minSeparation: info?.minSeparation ?? 8,
    };
  });
  const conflicts = detectConflicts(withInfo, modules);
  return { nodes: scheduled, conflicts };
}
