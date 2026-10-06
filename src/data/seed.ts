import type { ShowState } from "../engine/types";

/** 种子数据：江畔跨年烟花秀（容量/间隔/安全距离均按可演示冲突调校） */
export function seedShow(): ShowState {
  return {
    types: [
      { id: "T1", name: "75mm礼花弹", category: "礼花弹", caliberMm: 75, durationMs: 3500, safetyRadiusM: 60, color: "#f59e0b" },
      { id: "T2", name: "30mm扇形架", category: "扇形架", caliberMm: 30, durationMs: 6000, safetyRadiusM: 35, color: "#1d4ed8" },
      { id: "T3", name: "罗马烛光", category: "罗马烛光", caliberMm: 25, durationMs: 8000, safetyRadiusM: 25, color: "#dc2626" },
      { id: "T4", name: "冷焰火", category: "冷焰火", caliberMm: 12, durationMs: 5000, safetyRadiusM: 8, color: "#38bdf8" },
    ],
    positions: [
      { id: "P1", name: "江畔A", x: 30, y: 28 },
      { id: "P2", name: "江畔B", x: 110, y: 22 },
      { id: "P3", name: "观景台", x: 185, y: 34 },
      { id: "P4", name: "近景区", x: 150, y: 86 },
    ],
    modules: [
      { id: "M1", name: "M1", positionId: "P1", capacity: 6, minIntervalMs: 800, online: true },
      { id: "M2", name: "M2", positionId: "P2", capacity: 6, minIntervalMs: 800, online: true },
      { id: "M3", name: "M3", positionId: "P3", capacity: 4, minIntervalMs: 1000, online: true },
      { id: "M4", name: "M4", positionId: "P4", capacity: 4, minIntervalMs: 600, online: true },
    ],
    segments: [
      {
        id: "S1",
        name: "Intro",
        startMs: 0,
        endMs: 30000,
        musicPoints: [
          { id: "m1", label: "鼓点切入", timeMs: 12500 },
          { id: "m2", label: "弦乐进入", timeMs: 20000 },
        ],
        version: 3,
        updatedBy: "编导甲",
      },
      {
        id: "S2",
        name: "Chorus A",
        startMs: 30000,
        endMs: 90000,
        musicPoints: [
          { id: "m3", label: "副歌起", timeMs: 32000 },
          { id: "m4", label: "鼓组齐奏", timeMs: 48000 },
          { id: "m5", label: "高潮", timeMs: 68200 },
        ],
        version: 5,
        updatedBy: "编导乙",
      },
      {
        id: "S3",
        name: "Finale",
        startMs: 90000,
        endMs: 222000,
        musicPoints: [
          { id: "m6", label: "终章起", timeMs: 95000 },
          { id: "m7", label: "礼花齐放", timeMs: 150000 },
          { id: "m8", label: "终音", timeMs: 222000 },
        ],
        version: 2,
        updatedBy: "编导甲",
      },
    ],
    nodes: [
      { id: "N01", segmentId: "S1", typeId: "T2", positionId: "P1", anchorId: "m1", offsetMs: 0, angleDeg: 90, pinned: false, pinnedTimeMs: null },
      { id: "N02", segmentId: "S1", typeId: "T2", positionId: "P1", anchorId: "m1", offsetMs: 800, angleDeg: 75, pinned: false, pinnedTimeMs: null },
      { id: "N03", segmentId: "S1", typeId: "T3", positionId: "P2", anchorId: "m1", offsetMs: 1500, angleDeg: 90, pinned: false, pinnedTimeMs: null },
      { id: "N04", segmentId: "S1", typeId: "T1", positionId: "P2", anchorId: "m2", offsetMs: 0, angleDeg: 80, pinned: false, pinnedTimeMs: null },
      { id: "N05", segmentId: "S1", typeId: "T3", positionId: "P1", anchorId: "m2", offsetMs: 2500, angleDeg: 90, pinned: false, pinnedTimeMs: null },
      { id: "N06", segmentId: "S2", typeId: "T1", positionId: "P2", anchorId: "m3", offsetMs: 0, angleDeg: 85, pinned: false, pinnedTimeMs: null },
      { id: "N07", segmentId: "S2", typeId: "T1", positionId: "P1", anchorId: "m3", offsetMs: 1200, angleDeg: 90, pinned: false, pinnedTimeMs: null },
      { id: "N08", segmentId: "S2", typeId: "T2", positionId: "P3", anchorId: "m4", offsetMs: 0, angleDeg: 70, pinned: false, pinnedTimeMs: null },
      { id: "N09", segmentId: "S2", typeId: "T1", positionId: "P2", anchorId: "m4", offsetMs: 500, angleDeg: 90, pinned: false, pinnedTimeMs: null },
      { id: "N10", segmentId: "S2", typeId: "T1", positionId: "P2", anchorId: "m4", offsetMs: 900, angleDeg: 100, pinned: false, pinnedTimeMs: null },
      { id: "N11", segmentId: "S2", typeId: "T1", positionId: "P1", anchorId: "m5", offsetMs: 0, angleDeg: 90, pinned: true, pinnedTimeMs: 68200 },
      { id: "N12", segmentId: "S2", typeId: "T3", positionId: "P3", anchorId: "m5", offsetMs: 2000, angleDeg: 90, pinned: false, pinnedTimeMs: null },
      { id: "N13", segmentId: "S3", typeId: "T1", positionId: "P3", anchorId: "m6", offsetMs: 0, angleDeg: 88, pinned: false, pinnedTimeMs: null },
      { id: "N14", segmentId: "S3", typeId: "T1", positionId: "P1", anchorId: "m7", offsetMs: 0, angleDeg: 90, pinned: false, pinnedTimeMs: null },
      { id: "N15", segmentId: "S3", typeId: "T1", positionId: "P2", anchorId: "m7", offsetMs: 400, angleDeg: 85, pinned: false, pinnedTimeMs: null },
      { id: "N16", segmentId: "S3", typeId: "T1", positionId: "P3", anchorId: "m7", offsetMs: 800, angleDeg: 95, pinned: false, pinnedTimeMs: null },
      { id: "N17", segmentId: "S3", typeId: "T2", positionId: "P1", anchorId: "m7", offsetMs: 1200, angleDeg: 60, pinned: false, pinnedTimeMs: null },
      { id: "N18", segmentId: "S3", typeId: "T4", positionId: "P4", anchorId: "m8", offsetMs: -5000, angleDeg: 90, pinned: false, pinnedTimeMs: null },
      { id: "N19", segmentId: "S3", typeId: "T4", positionId: "P4", anchorId: "m8", offsetMs: -2500, angleDeg: 90, pinned: false, pinnedTimeMs: null },
    ],
  };
}
