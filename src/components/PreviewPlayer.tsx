import { useEffect, useRef, useState } from "react";
import { useShowStore } from "../state/store";
import { fmtMs } from "../engine/time";
import { FIELD } from "../engine/schedule";

const SPEED = 6; // 6 倍速预览
const BURST_MS = 1800;

/** 整场节目预览：夜空视角 + 播放头 */
export function PreviewPlayer() {
  const { state } = useShowStore();
  const { show, schedule } = state;
  const [playMs, setPlayMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const t0 = performance.now();
    const base = playMs;
    const tick = (now: number) => {
      const next = base + (now - t0) * SPEED;
      if (next >= schedule.showEndMs) {
        setPlayMs(schedule.showEndMs);
        setPlaying(false);
        return;
      }
      setPlayMs(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const typeById = new Map(show.types.map((t) => [t.id, t]));
  const posById = new Map(show.positions.map((p) => [p.id, p]));
  const nodeById = new Map(show.nodes.map((n) => [n.id, n]));

  const bursts = [...schedule.placements.values()]
    .filter((p) => !p.queued && playMs >= p.scheduledMs && playMs - p.scheduledMs < BURST_MS)
    .map((p) => {
      const node = nodeById.get(p.nodeId);
      const type = node ? typeById.get(node.typeId) : null;
      const pos = posById.get(p.positionId);
      const prog = (playMs - p.scheduledMs) / BURST_MS;
      return {
        id: p.nodeId,
        x: pos?.x ?? FIELD.w / 2,
        y: 108 - 26 - (type?.caliberMm ?? 30) * 0.72,
        r: 3 + prog * 15,
        opacity: 1 - prog,
        color: type?.color ?? "#fff",
        retry: p.retry,
      };
    });

  const upcoming = [...schedule.placements.values()]
    .filter((p) => !p.queued && p.scheduledMs > playMs)
    .sort((a, b) => a.scheduledMs - b.scheduledMs)
    .slice(0, 3);

  return (
    <section className="panel preview-panel">
      <div className="panel-head">
        <h2>整场节目预览</h2>
        <span className="dim">{SPEED}x 速度 · {fmtMs(playMs)} / {fmtMs(schedule.showEndMs)}</span>
      </div>
      <svg viewBox={`0 0 ${FIELD.w} ${FIELD.h}`} className="sky-svg" role="img">
        <rect x={0} y={0} width={FIELD.w} height={FIELD.h} className="sky-bg" />
        <line x1={0} y1={108} x2={FIELD.w} y2={108} className="ground-line" />
        {show.positions.map((p) => (
          <rect key={p.id} x={p.x - 2} y={106} width={4} height={3} className="launch-pad" />
        ))}
        {bursts.map((b) => (
          <g key={b.id}>
            <circle cx={b.x} cy={b.y} r={b.r} fill="none" stroke={b.color} strokeWidth={1.4} opacity={b.opacity} />
            <circle cx={b.x} cy={b.y} r={b.r * 0.45} fill={b.color} opacity={b.opacity * 0.7} />
            {b.retry && (
              <text x={b.x} y={b.y - b.r - 2} textAnchor="middle" className="retry-mark">重试</text>
            )}
          </g>
        ))}
        {/* 播放头对应的即将点火提示 */}
        <text x={4} y={10} className="sky-clock">{fmtMs(playMs)}</text>
      </svg>
      <div className="player-controls">
        <button
          className="primary"
          onClick={() => {
            if (!playing && playMs >= schedule.showEndMs) setPlayMs(0);
            setPlaying(!playing);
          }}
        >
          {playing ? "暂停" : "播放"}
        </button>
        <button onClick={() => { setPlaying(false); setPlayMs(0); }}>复位</button>
        <input
          type="range"
          min={0}
          max={schedule.showEndMs}
          step={100}
          value={Math.min(playMs, schedule.showEndMs)}
          onChange={(e) => { setPlaying(false); setPlayMs(Number(e.target.value)); }}
          aria-label="播放进度"
        />
      </div>
      <div className="upcoming">
        {upcoming.length === 0 ? (
          <span className="dim">已无后续节点</span>
        ) : (
          upcoming.map((p) => {
            const node = nodeById.get(p.nodeId);
            const type = node ? typeById.get(node.typeId) : null;
            return (
              <span key={p.nodeId} className="upcoming-chip">
                <i style={{ background: type?.color }} />
                {p.nodeId} {fmtMs(p.scheduledMs)}
              </span>
            );
          })
        )}
      </div>
    </section>
  );
}
