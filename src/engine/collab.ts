// 并发保存：两名编导师同时保存同一段落，先落的留下，晚到的列出差异

import type { DiffEntry, Segment } from "../types";
import { formatTime } from "./format";

export interface SaveResult {
  ok: boolean;
  diff: DiffEntry[];
  serverSegment: Segment | null;
}

function diffSegments(client: Segment, server: Segment): DiffEntry[] {
  const fields: { key: keyof Segment; label: string; fmt: (v: number | string) => string }[] = [
    { key: "name", label: "段落名称", fmt: (v) => String(v) },
    { key: "musicTime", label: "音乐时间点", fmt: (v) => formatTime(Number(v)) },
    { key: "duration", label: "持续时间", fmt: (v) => `${v}s` },
  ];
  return fields
    .filter((f) => client[f.key] !== server[f.key])
    .map((f) => ({
      field: f.key,
      label: f.label,
      client: f.fmt(client[f.key]),
      server: f.fmt(server[f.key]),
    }));
}

/**
 * 尝试保存段落。baseVersion 为编导师打开段落时的版本。
 * 版本一致：保存成功 (版本号 +1)。
 * 版本不一致：先落的留下，晚到的列出差异，不覆盖。
 */
export function saveSegment(
  client: Segment,
  baseVersion: number,
  server: Segment
): SaveResult {
  if (baseVersion === server.version) {
    return { ok: true, diff: [], serverSegment: null };
  }
  return {
    ok: false,
    diff: diffSegments(client, server),
    serverSegment: server,
  };
}
