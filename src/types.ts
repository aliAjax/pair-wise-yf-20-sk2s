// 烟花燃放脚本编排 — 核心数据模型

export type Category = "礼花弹" | "罗马烛光" | "扇形架" | "冷焰火";

/** 烟花型号 */
export interface FireworkType {
  id: string;
  name: string; // 型号名称
  caliber: number; // 口径 mm
  category: Category;
  safetyDistance: number; // 安全距离 m
  effectDuration: number; // 持续时间 s
  minSeparation: number; // 炮位最小间距 m
}

/** 节目段落 */
export interface Segment {
  id: string;
  name: string; // 段落名称
  musicTime: number; // 音乐时间点 (秒)
  duration: number; // 持续时间 s
  version: number; // 并发版本号
  updatedBy: string; // 最后保存的编导师
  updatedAt: number;
}

/** 点火节点 */
export interface IgnitionNode {
  id: string;
  segmentId: string;
  typeId: string;
  moduleId: string | null; // 已分配的点火模块
  time: number; // 点火时间 (秒)
  offset: number; // 相对段落音乐时间点的偏移
  pinned: boolean; // 手工钉住 (不随段落重算)
  angle: number; // 发射角度 °
  x: number; // 平面图位置 m
  y: number;
  queued: boolean; // 排队中 (模块容量不足)
  delay: number; // 顺延量 s (因间隔冲突)
  originalModuleId: string | null; // 掉线重排前的模块 (重试回退用)
}

/** 点火模块 */
export interface IgnitionModule {
  id: string;
  name: string;
  capacity: number; // 容量 (点火点位数量)
  online: boolean;
  x: number; // 平面图位置 m
  y: number;
}

export type ConflictKind = "interval" | "capacity" | "safety" | "offline";

export interface Conflict {
  id: string;
  kind: ConflictKind;
  severity: "error" | "warning";
  nodeIds: string[];
  message: string;
}

export interface LogEntry {
  id: string;
  text: string;
}

export interface DiffEntry {
  field: string;
  label: string;
  client: string;
  server: string;
}
