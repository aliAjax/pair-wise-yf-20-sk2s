/** 烟花型号 */
export interface FireworkType {
  id: string;
  name: string;
  category: string;
  caliberMm: number; // 口径
  durationMs: number; // 持续时间
  safetyRadiusM: number; // 安全距离（落点半径）
  color: string;
}

/** 音乐时间点 */
export interface MusicPoint {
  id: string;
  label: string;
  timeMs: number;
}

/** 节目段落（带版本号，用于并发保存检测） */
export interface Segment {
  id: string;
  name: string;
  startMs: number;
  endMs: number;
  musicPoints: MusicPoint[];
  version: number;
  updatedBy: string;
}

/** 点火节点 */
export interface FireNode {
  id: string;
  segmentId: string;
  typeId: string;
  positionId: string; // 计划发射点位
  anchorId: string; // 绑定的音乐时间点
  offsetMs: number; // 相对音乐点的偏移
  angleDeg: number; // 发射角度
  pinned: boolean; // 手工钉住：音乐点改动时留在原处
  pinnedTimeMs: number | null;
}

/** 点火模块 */
export interface FireModule {
  id: string;
  name: string;
  positionId: string;
  capacity: number; // 通道数（容量）
  minIntervalMs: number; // 同台模块两次点火最小间隔
  online: boolean;
}

/** 燃放点位（平面图坐标，单位米） */
export interface Position {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface ShowState {
  types: FireworkType[];
  segments: Segment[];
  nodes: FireNode[];
  modules: FireModule[];
  positions: Position[];
}

/** 节点排程结果 */
export interface Placement {
  nodeId: string;
  desiredMs: number; // 期望点火时间（音乐点+偏移，或钉住时间）
  scheduledMs: number; // 实际点火时间（间隔不足时顺延）
  delayedMs: number; // 顺延量
  moduleId: string | null; // null = 排队中
  positionId: string; // 实际发射点位（跟随模块）
  crossPosition: boolean; // 溢出到其它点位的模块
  queued: boolean; // 容量已满，排队等待
  retry: boolean; // 重排失败，按原节点重试
}

export type ConflictKind =
  | "interval" // 间隔冲突（顺延）
  | "capacity" // 容量溢出 / 排队
  | "retry" // 掉线重排失败
  | "safety-audience" // 距观众区不足
  | "safety-position"; // 点位落区交叠

export interface Conflict {
  id: string;
  kind: ConflictKind;
  severity: "warn" | "error";
  message: string;
  nodeIds: string[];
}

export interface ScheduleResult {
  placements: Map<string, Placement>;
  conflicts: Conflict[];
  moduleUsage: Map<string, number>; // 模块已用通道
  positionRadius: Map<string, number>; // 点位实际落点半径
  showEndMs: number;
}
