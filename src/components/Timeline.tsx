import { useEffect, useState } from "react";
import { useShowStore } from "../state/store";
import { fmtMs, parseMs } from "../engine/time";
import type { Placement } from "../engine/types";

export type Selection =
  | { kind: "node"; nodeId: string }
  | { kind: "music"; segmentId: string; pointId: string }
  | null;

const W = 1160;
const LABEL_W = 96;
const PAD_R = 24;
const LANE_H = 78;
const TOP = 34;

function nodeColors(p: Placement | undefined): { fill: string; stroke: string } {
  if (!p) return { fill: "#475569", stroke: "#94a3b8" };
  if (p.retry) return { fill: "#7f1d1d", stroke: "#ef4444" };
  if (p.queued) return { fill: "#334155", stroke: "#94a3b8" };
  if (p.delayedMs > 0) return { fill: "#78350f", stroke: "#f59e0b" };
  return { fill: "#1e3a8a", stroke: "#60a5fa" };
}

export function Timeline({
  selection,
  onSelect,
}: {
  selection: Selection;
  onSelect: (s: Selection) => void;
}) {
  const { state, dispatch } = useShowStore();
  const { show, schedule } = state;
  const tMax = Math.ceil(schedule.showEndMs / 30000) * 30000;
  const x = (ms: number) => LABEL_W + (ms / tMax) * (W - LABEL_W - PAD_R);
  const H = TOP + show.segments.length * LANE_H + 10;

  const ticks: number[] = [];
  for (let t = 0; t <= tMax; t += 10000) ticks.push(t);

  return (
    <section className="panel timeline-panel">
      <div className="panel-head">
        <h2>时间轴编排</h2>
        <div className="legend">
          <span><i className="dot normal" />正常</span>
          <span><i className="dot delayed" />顺延</span>
          <span><i className="dot queued" />排队</span>
          <span><i className="dot retry" />重试</span>
          <span><i className="dot pinned" />钉住</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="timeline-svg" role="img">
        {/* 时间刻度 */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={TOP - 14} x2={x(t)} y2={H - 6} className="grid-line" />
            <text x={x(t)} y={TOP - 20} className="tick-label" textAnchor="middle">
              {fmtMs(t).slice(0, 5)}
            </text>
          </g>
        ))}

        {show.segments.map((seg, i) => {
          const y0 = TOP + i * LANE_H;
          const segNodes = show.nodes.filter((n) => n.segmentId === seg.id);
          return (
            <g key={seg.id}>
              <text x={8} y={y0 + 26} className="lane-label">
                {seg.name}
              </text>
              <text x={8} y={y0 + 44} className="lane-sub">
                v{seg.version} · {seg.updatedBy}
              </text>
              {/* 段落区间 */}
              <rect
                x={x(seg.startMs)}
                y={y0 + 6}
                width={Math.max(2, x(seg.endMs) - x(seg.startMs))}
                height={LANE_H - 16}
                rx={6}
                className="segment-band"
              />
              {/* 音乐时间点 */}
              {seg.musicPoints.map((mp) => {
                const sel =
                  selection?.kind === "music" &&
                  selection.segmentId === seg.id &&
                  selection.pointId === mp.id;
                return (
                  <g
                    key={mp.id}
                    className="music-point"
                    onClick={() => onSelect({ kind: "music", segmentId: seg.id, pointId: mp.id })}
                  >
                    <path
                      d={`M ${x(mp.timeMs)} ${y0 + 8} l 6 10 h -12 z`}
                      className={sel ? "music-marker selected" : "music-marker"}
                    />
                    <text x={x(mp.timeMs)} y={y0 + 32} textAnchor="middle" className="music-label">
                      {mp.label}
                    </text>
                  </g>
                );
              })}
              {/* 点火节点 */}
              {segNodes.map((n) => {
                const p = schedule.placements.get(n.id);
                const c = nodeColors(p);
                const cx = x(p?.scheduledMs ?? 0);
                const cy = y0 + 52;
                const sel = selection?.kind === "node" && selection.nodeId === n.id;
                return (
                  <g
                    key={n.id}
                    className="fire-node"
                    onClick={() => onSelect({ kind: "node", nodeId: n.id })}
                  >
                    {p && p.delayedMs > 0 && !p.queued && (
                      <>
                        <circle cx={x(p.desiredMs)} cy={cy} r={5} className="ghost" />
                        <line x1={x(p.desiredMs)} y1={cy} x2={cx} y2={cy} className="delay-line" />
                      </>
                    )}
                    <rect
                      x={cx - 6}
                      y={cy - 6}
                      width={12}
                      height={12}
                      rx={2}
                      transform={`rotate(45 ${cx} ${cy})`}
                      fill={c.fill}
                      stroke={sel ? "#f8fafc" : c.stroke}
                      strokeWidth={sel ? 2.5 : 1.5}
                    />
                    {n.pinned && (
                      <text x={cx} y={cy - 12} textAnchor="middle" className="pin-mark">
                        📌
                      </text>
                    )}
                    <text x={cx} y={cy + 20} textAnchor="middle" className="node-label">
                      {n.id}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <SelectionDetail selection={selection} />
    </section>
  );
}

function SelectionDetail({ selection }: { selection: Selection }) {
  const { state, dispatch } = useShowStore();
  const { show, schedule } = state;
  const [musicText, setMusicText] = useState<string | null>(null);
  const [offsetText, setOffsetText] = useState<string | null>(null);
  const [angleText, setAngleText] = useState<string | null>(null);

  useEffect(() => {
    setMusicText(null);
    setOffsetText(null);
    setAngleText(null);
  }, [selection]);

  if (!selection) {
    return <p className="hint">点击时间轴上的音乐点或点火节点进行编辑；改动音乐会牵动未钉住的节点重算。</p>;
  }

  if (selection.kind === "music") {
    const seg = show.segments.find((s) => s.id === selection.segmentId);
    const mp = seg?.musicPoints.find((m) => m.id === selection.pointId);
    if (!seg || !mp) return null;
    const affected = show.nodes.filter(
      (n) => n.segmentId === seg.id && n.anchorId === mp.id && !n.pinned
    ).length;
    const value = musicText ?? fmtMs(mp.timeMs);
    const commit = () => {
      const ms = parseMs(value);
      if (ms == null) return;
      dispatch({ type: "updateMusicPoint", segmentId: seg.id, pointId: mp.id, timeMs: ms });
      setMusicText(null);
    };
    return (
      <div className="detail-bar">
        <strong>音乐点「{mp.label}」</strong>
        <span className="dim">{seg.name} · 牵动 {affected} 个未钉住节点</span>
        <input
          value={value}
          onChange={(e) => setMusicText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          aria-label="音乐点时间"
        />
        <button className="primary" onClick={commit}>应用并重算</button>
        <button onClick={() => setMusicText(null)}>还原</button>
      </div>
    );
  }

  const node = show.nodes.find((n) => n.id === selection.nodeId);
  if (!node) return null;
  const p = schedule.placements.get(node.id);
  const type = show.types.find((t) => t.id === node.typeId);
  const mod = show.modules.find((m) => m.id === p?.moduleId);
  const offsetVal = offsetText ?? String(node.offsetMs);
  const angleVal = angleText ?? String(node.angleDeg);
  const commitNode = () => {
    const offset = Number(offsetVal);
    const angle = Number(angleVal);
    dispatch({
      type: "updateNode",
      nodeId: node.id,
      patch: {
        ...(Number.isFinite(offset) ? { offsetMs: offset } : {}),
        ...(Number.isFinite(angle) ? { angleDeg: angle } : {}),
      },
    });
    setOffsetText(null);
    setAngleText(null);
  };
  return (
    <div className="detail-bar wrap">
      <strong>{node.id}</strong>
      <span className="dim">
        {type?.name} · 口径{type?.caliberMm}mm · 安全距离{type?.safetyRadiusM}m ·{" "}
        {p?.queued ? "排队中" : p?.retry ? "重排失败·按原节点重试" : `${mod?.name ?? "-"} @ ${fmtMs(p?.scheduledMs ?? 0)}`}
        {p && p.delayedMs > 0 && !p.queued && `（顺延 ${(p.delayedMs / 1000).toFixed(1)}s）`}
      </span>
      <label>
        偏移ms
        <input value={offsetVal} onChange={(e) => setOffsetText(e.target.value)} />
      </label>
      <label>
        角度°
        <input value={angleVal} onChange={(e) => setAngleText(e.target.value)} />
      </label>
      <button className="primary" onClick={commitNode}>应用</button>
      <button onClick={() => dispatch({ type: "togglePin", nodeId: node.id })}>
        {node.pinned ? "取消钉住" : "钉住当前时间"}
      </button>
    </div>
  );
}
