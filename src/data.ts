// 初始编排数据：一场约 3:42 的烟花秀

import type { FireworkType, IgnitionModule, IgnitionNode, Segment } from "./types";
import { round3 } from "./engine/format";

export const types: FireworkType[] = [
  { id: "t1", name: "30mm扇形架", caliber: 30, category: "扇形架", safetyDistance: 35, effectDuration: 20, minSeparation: 8 },
  { id: "t2", name: "75mm礼花弹", caliber: 75, category: "礼花弹", safetyDistance: 100, effectDuration: 3, minSeparation: 20 },
  { id: "t3", name: "罗马烛光", caliber: 50, category: "罗马烛光", safetyDistance: 25, effectDuration: 8, minSeparation: 8 },
  { id: "t4", name: "冷焰火", caliber: 20, category: "冷焰火", safetyDistance: 15, effectDuration: 30, minSeparation: 5 },
  { id: "t5", name: "50mm礼花弹", caliber: 50, category: "礼花弹", safetyDistance: 75, effectDuration: 3, minSeparation: 15 },
  { id: "t6", name: "20mm扇形架", caliber: 20, category: "扇形架", safetyDistance: 20, effectDuration: 15, minSeparation: 6 },
];

export const segments: Segment[] = [
  { id: "s1", name: "Intro", musicTime: 0, duration: 30, version: 1, updatedBy: "初始", updatedAt: 0 },
  { id: "s2", name: "Chorus A", musicTime: 68.2, duration: 42, version: 1, updatedBy: "初始", updatedAt: 0 },
  { id: "s3", name: "Bridge", musicTime: 130, duration: 40, version: 1, updatedBy: "初始", updatedAt: 0 },
  { id: "s4", name: "Finale", musicTime: 222, duration: 60, version: 1, updatedBy: "初始", updatedAt: 0 },
];

export const modules: IgnitionModule[] = [
  { id: "m1", name: "M1 主控", capacity: 8, online: true, x: 20, y: 128 },
  { id: "m2", name: "M2 主控", capacity: 8, online: true, x: 60, y: 128 },
  { id: "m3", name: "M3 主控", capacity: 10, online: true, x: 100, y: 128 },
  { id: "m4", name: "M4 主控", capacity: 10, online: true, x: 140, y: 128 },
];

function buildNodes(): IgnitionNode[] {
  const nodes: IgnitionNode[] = [];
  let seq = 0;
  const add = (
    segId: string,
    typeId: string,
    offset: number,
    partial: Partial<IgnitionNode> = {}
  ) => {
    const seg = segments.find((s) => s.id === segId)!;
    nodes.push({
      id: `N${++seq}`,
      segmentId: segId,
      typeId,
      moduleId: null,
      time: round3(seg.musicTime + offset),
      offset,
      pinned: false,
      angle: 90,
      x: 40,
      y: 40,
      queued: false,
      delay: 0,
      originalModuleId: null,
      ...partial,
    });
  };

  // Intro
  add("s1", "t4", 2.0, { x: 30, y: 112 });
  add("s1", "t4", 4.0, { x: 70, y: 112 });
  add("s1", "t6", 6.0, { x: 50, y: 60 });
  add("s1", "t3", 8.0, { x: 60, y: 85 });
  add("s1", "t4", 10.0, { x: 110, y: 112 });

  // Chorus A
  add("s2", "t2", 1.0, { x: 40, y: 30 });
  add("s2", "t2", 2.5, { x: 140, y: 30 });
  add("s2", "t5", 5.0, { x: 90, y: 30 });
  add("s2", "t1", 7.0, { x: 70, y: 60 });
  add("s2", "t3", 9.0, { x: 100, y: 85 });
  add("s2", "t2", 11.0, { x: 170, y: 30 });
  add("s2", "t4", 13.0, { x: 150, y: 112 });
  add("s2", "t5", 15.0, { x: 110, y: 30 });
  add("s2", "t6", 17.0, { x: 120, y: 60 });
  add("s2", "t3", 19.0, { x: 140, y: 85 });
  add("s2", "t2", 21.0, { x: 60, y: 30, pinned: true });

  // Bridge
  add("s3", "t4", 1.0, { x: 50, y: 112 });
  add("s3", "t1", 3.0, { x: 90, y: 60 });
  add("s3", "t3", 5.0, { x: 80, y: 85 });
  add("s3", "t5", 7.0, { x: 150, y: 30 });
  add("s3", "t4", 9.0, { x: 170, y: 128 }); // 落点过近观众区

  // Finale
  add("s4", "t2", 0.5, { x: 50, y: 30 });
  add("s4", "t2", 1.3, { x: 90, y: 30 });
  add("s4", "t2", 4.5, { x: 130, y: 30 });
  add("s4", "t2", 6.5, { x: 170, y: 30 });
  add("s4", "t1", 8.5, { x: 100, y: 60 });
  add("s4", "t3", 10.5, { x: 120, y: 85 });
  add("s4", "t4", 12.5, { x: 90, y: 112 });
  add("s4", "t2", 14.5, { x: 70, y: 30 });
  // 连发序列：0.4s 间隔 + 2m 间距，触发顺延、间隔冲突与炮位过近
  add("s4", "t6", 16.0, { x: 40, y: 60 });
  add("s4", "t6", 16.4, { x: 42, y: 60 });
  add("s4", "t6", 16.8, { x: 44, y: 60 });
  add("s4", "t6", 17.2, { x: 46, y: 60 });
  add("s4", "t6", 17.6, { x: 48, y: 60 });

  return nodes;
}

export const initialNodes: IgnitionNode[] = buildNodes();
