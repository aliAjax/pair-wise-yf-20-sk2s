import type {
  Conflict,
  FireModule,
  FireNode,
  Placement,
  ScheduleResult,
  Segment,
  ShowState,
} from "./types";
import { fmtMs } from "./time";

/** 平面图常量（米） */
export const FIELD = {
  w: 220,
  h: 120,
  audienceY: 104, // 观众区上边界
  control: { x: 8, y: 96 }, // 控制室
};

function desiredTime(node: FireNode, segment: Segment | undefined): number {
  if (node.pinned && node.pinnedTimeMs != null) return node.pinnedTimeMs; // 钉住的节点留在原处
  const mp = segment?.musicPoints.find((m) => m.id === node.anchorId);
  return (mp?.timeMs ?? segment?.startMs ?? 0) + node.offsetMs;
}

/** 模块偏好：本点位模块优先，其余按编号顺序（排不下的节点排队等下一台） */
function preferredModules(node: FireNode, modules: FireModule[]): FireModule[] {
  return [...modules].sort((a, b) => {
    const pa = a.positionId === node.positionId ? 0 : 1;
    const pb = b.positionId === node.positionId ? 0 : 1;
    return pa - pb || a.id.localeCompare(b.id);
  });
}

/** 贪心排程：按期望时间排序，逐节点分配模块；同台间隔不足则顺延 */
function placeAll(
  state: ShowState,
  desired: Map<string, number>,
  modules: FireModule[]
): Map<string, Placement> {
  const sorted = [...state.nodes].sort(
    (a, b) =>
      (desired.get(a.id) ?? 0) - (desired.get(b.id) ?? 0) || a.id.localeCompare(b.id)
  );
  const lastFireAt = new Map<string, number>();
  const used = new Map<string, number>();
  const out = new Map<string, Placement>();

  for (const node of sorted) {
    const d = desired.get(node.id) ?? 0;
    let placed = false;
    for (const mod of preferredModules(node, modules)) {
      if ((used.get(mod.id) ?? 0) >= mod.capacity) continue; // 容量已满，试下一台
      const t = Math.max(d, (lastFireAt.get(mod.id) ?? -Infinity) + mod.minIntervalMs);
      out.set(node.id, {
        nodeId: node.id,
        desiredMs: d,
        scheduledMs: t,
        delayedMs: t - d,
        moduleId: mod.id,
        positionId: mod.positionId,
        crossPosition: mod.positionId !== node.positionId,
        queued: false,
        retry: false,
      });
      used.set(mod.id, (used.get(mod.id) ?? 0) + 1);
      lastFireAt.set(mod.id, t);
      placed = true;
      break;
    }
    if (!placed) {
      out.set(node.id, {
        nodeId: node.id,
        desiredMs: d,
        scheduledMs: d,
        delayedMs: 0,
        moduleId: null,
        positionId: node.positionId,
        crossPosition: false,
        queued: true,
        retry: false,
      });
    }
  }
  return out;
}

/**
 * 全量重算：任何一处改动（音乐点、钉住、模块掉线…）都通过它牵动全场。
 * fallback 为上一版排程：重排后仍排不下的节点，按原节点重试。
 */
export function computeSchedule(
  state: ShowState,
  fallback?: Map<string, Placement> | null
): ScheduleResult {
  const segById = new Map(state.segments.map((s) => [s.id, s]));
  const typeById = new Map(state.types.map((t) => [t.id, t]));
  const nodeById = new Map(state.nodes.map((n) => [n.id, n]));
  const desired = new Map<string, number>();
  for (const n of state.nodes) desired.set(n.id, desiredTime(n, segById.get(n.segmentId)));

  const online = state.modules.filter((m) => m.online);
  const placements = placeAll(state, desired, online);
  const conflicts: Conflict[] = [];

  // 掉线/容量变化后重排失败 -> 按原节点重试
  if (fallback) {
    const retried: string[] = [];
    for (const n of state.nodes) {
      const p = placements.get(n.id);
      const prev = fallback.get(n.id);
      if (p?.queued && prev && !prev.queued) {
        placements.set(n.id, { ...prev, retry: true });
        retried.push(n.id);
      }
    }
    if (retried.length > 0) {
      const offNames = state.modules
        .filter((m) => !m.online)
        .map((m) => m.name)
        .join("、");
      conflicts.push({
        id: "retry",
        kind: "retry",
        severity: "error",
        message: `${offNames ? `模块 ${offNames} 掉线，` : ""}${retried.length} 个节点按余量重排失败，已按原节点重试：${retried.join("、")}`,
        nodeIds: retried,
      });
    }
  }

  const moduleUsage = new Map<string, number>();
  for (const m of state.modules) moduleUsage.set(m.id, 0);
  for (const p of placements.values()) {
    if (p.moduleId) moduleUsage.set(p.moduleId, (moduleUsage.get(p.moduleId) ?? 0) + 1);
  }

  // 间隔冲突（顺延）与容量排队
  for (const p of placements.values()) {
    if (p.retry) continue;
    if (p.queued) {
      conflicts.push({
        id: `cap-${p.nodeId}`,
        kind: "capacity",
        severity: "error",
        message: `节点 ${p.nodeId} 排队中：在线模块容量已全部占满，等待下一台空出`,
        nodeIds: [p.nodeId],
      });
    } else if (p.delayedMs > 0) {
      const mod = state.modules.find((m) => m.id === p.moduleId);
      conflicts.push({
        id: `int-${p.nodeId}`,
        kind: "interval",
        severity: "warn",
        message: `节点 ${p.nodeId} 与模块 ${mod?.name ?? ""} 上一次点火间隔不足 ${mod?.minIntervalMs ?? 0}ms，顺延 ${(p.delayedMs / 1000).toFixed(1)}s（${fmtMs(p.desiredMs)} → ${fmtMs(p.scheduledMs)}）`,
        nodeIds: [p.nodeId],
      });
    }
    if (p.crossPosition && !p.queued) {
      conflicts.push({
        id: `cross-${p.nodeId}`,
        kind: "capacity",
        severity: "warn",
        message: `节点 ${p.nodeId} 本点位模块已满，溢出到 ${p.moduleId}（跨点位 ${nodeById.get(p.nodeId)?.positionId} → ${p.positionId}）`,
        nodeIds: [p.nodeId],
      });
    }
  }

  // 点位实际落点半径（按落在该点位的最大型号）
  const positionRadius = new Map<string, number>();
  for (const p of placements.values()) {
    if (p.queued) continue;
    const node = nodeById.get(p.nodeId);
    const r = node ? typeById.get(node.typeId)?.safetyRadiusM ?? 0 : 0;
    positionRadius.set(p.positionId, Math.max(positionRadius.get(p.positionId) ?? 0, r));
  }

  // 落点安全距离：观众区 / 控制室 / 点位间
  for (const pos of state.positions) {
    const r = positionRadius.get(pos.id) ?? 0;
    if (r <= 0) continue;
    const dAudience = FIELD.audienceY - pos.y;
    if (dAudience >= 0 && r > dAudience) {
      conflicts.push({
        id: `safe-aud-${pos.id}`,
        kind: "safety-audience",
        severity: "error",
        message: `点位 ${pos.name} 落点半径 ${r}m 超出距观众区 ${dAudience}m 的安全距离`,
        nodeIds: [],
      });
    }
    const dControl = Math.hypot(pos.x - FIELD.control.x, pos.y - FIELD.control.y);
    if (r > dControl) {
      conflicts.push({
        id: `safe-ctl-${pos.id}`,
        kind: "safety-audience",
        severity: "error",
        message: `点位 ${pos.name} 落点半径 ${r}m 覆盖控制室（相距 ${dControl.toFixed(0)}m）`,
        nodeIds: [],
      });
    }
  }
  const active = state.positions.filter((p) => (positionRadius.get(p.id) ?? 0) > 0);
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const ra = positionRadius.get(a.id) ?? 0;
      const rb = positionRadius.get(b.id) ?? 0;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < Math.max(ra, rb)) {
        conflicts.push({
          id: `safe-pos-${a.id}-${b.id}`,
          kind: "safety-position",
          severity: "warn",
          message: `点位 ${a.name} 与 ${b.name} 相距 ${d.toFixed(0)}m，小于落点半径 ${Math.max(ra, rb)}m，落区交叠`,
          nodeIds: [],
        });
      }
    }
  }

  const showEndMs = Math.max(
    ...state.segments.map((s) => s.endMs),
    ...[...placements.values()].map((p) => p.scheduledMs + 3000),
    30000
  );

  return { placements, conflicts, moduleUsage, positionRadius, showEndMs };
}

/** 统计两版排程间时间/模块发生变化的节点数（“改一处牵动全场”的量化） */
export function countRipple(prev: ScheduleResult, next: ScheduleResult): number {
  let n = 0;
  for (const [id, p] of next.placements) {
    const q = prev.placements.get(id);
    if (
      !q ||
      q.scheduledMs !== p.scheduledMs ||
      q.moduleId !== p.moduleId ||
      q.queued !== p.queued ||
      q.retry !== p.retry
    ) {
      n++;
    }
  }
  return n;
}
