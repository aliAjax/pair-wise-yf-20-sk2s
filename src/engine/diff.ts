import type { Segment } from "./types";
import { fmtMs } from "./time";

export interface DiffEntry {
  field: string;
  mine: string;
  current: string;
}

/** 段落草稿 vs 服务端当前版本的逐字段差异（并发保存时给晚到者看） */
export function diffSegments(mine: Segment, current: Segment): DiffEntry[] {
  const out: DiffEntry[] = [];
  if (mine.name !== current.name) {
    out.push({ field: "段落名称", mine: mine.name, current: current.name });
  }
  if (mine.startMs !== current.startMs) {
    out.push({ field: "开始时间", mine: fmtMs(mine.startMs), current: fmtMs(current.startMs) });
  }
  if (mine.endMs !== current.endMs) {
    out.push({ field: "结束时间", mine: fmtMs(mine.endMs), current: fmtMs(current.endMs) });
  }
  const mineMp = new Map(mine.musicPoints.map((m) => [m.id, m]));
  const curMp = new Map(current.musicPoints.map((m) => [m.id, m]));
  for (const [id, mp] of mineMp) {
    const cur = curMp.get(id);
    if (!cur) {
      out.push({ field: `音乐点 ${mp.label}`, mine: fmtMs(mp.timeMs), current: "（已删除）" });
    } else {
      if (mp.label !== cur.label) {
        out.push({ field: `音乐点 ${id} 名称`, mine: mp.label, current: cur.label });
      }
      if (mp.timeMs !== cur.timeMs) {
        out.push({
          field: `音乐点 ${cur.label}`,
          mine: fmtMs(mp.timeMs),
          current: fmtMs(cur.timeMs),
        });
      }
    }
  }
  for (const [id, cur] of curMp) {
    if (!mineMp.has(id)) {
      out.push({ field: `音乐点 ${cur.label}`, mine: "（未包含）", current: fmtMs(cur.timeMs) });
    }
  }
  return out;
}
