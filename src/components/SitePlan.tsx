import { useShowStore } from "../state/store";
import { FIELD } from "../engine/schedule";
import type { Selection } from "./Timeline";

/** 燃放点位平面图：模块余量、间隔冲突标记、落点安全距离 */
export function SitePlan({ selection }: { selection: Selection }) {
  const { state, dispatch } = useShowStore();
  const { show, schedule } = state;

  const safetyConflictPos = new Set<string>();
  for (const c of schedule.conflicts) {
    if (c.kind === "safety-audience" || c.kind === "safety-position") {
      const m = c.id.match(/safe-(?:aud|ctl|pos)-(\w+)/);
      if (m) safetyConflictPos.add(m[1]);
    }
  }

  const selNode =
    selection?.kind === "node" ? show.nodes.find((n) => n.id === selection.nodeId) : null;
  const selPosId = selNode ? schedule.placements.get(selNode.id)?.positionId : null;

  // 每个点位的顺延/排队/重试统计（间隔冲突的平面化呈现）
  const badges = new Map<string, { delayed: number; queued: number; retry: number }>();
  for (const p of schedule.placements.values()) {
    const b = badges.get(p.positionId) ?? { delayed: 0, queued: 0, retry: 0 };
    if (p.retry) b.retry++;
    else if (p.queued) b.queued++;
    else if (p.delayedMs > 0) b.delayed++;
    badges.set(p.positionId, b);
  }

  return (
    <section className="panel plan-panel">
      <div className="panel-head">
        <h2>燃放点位平面图</h2>
        <span className="dim">单位：米 · 点击模块可切换掉线/上线</span>
      </div>
      <svg viewBox={`0 0 ${FIELD.w} ${FIELD.h}`} className="plan-svg" role="img">
        <defs>
          <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="4" fill="rgba(220,38,38,0.10)" />
            <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(220,38,38,0.35)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={FIELD.w} height={FIELD.h} className="field-bg" />
        {[20, 40, 60, 80, 100].map((y) => (
          <line key={y} x1={0} y1={y} x2={FIELD.w} y2={y} className="plan-grid" />
        ))}
        {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((gx) => (
          <line key={gx} x1={gx} y1={0} x2={gx} y2={FIELD.h} className="plan-grid" />
        ))}

        {/* 观众区 */}
        <rect x={0} y={FIELD.audienceY} width={FIELD.w} height={FIELD.h - FIELD.audienceY} fill="url(#hatch)" />
        <text x={FIELD.w - 4} y={FIELD.h - 3} textAnchor="end" className="zone-label">
          观众区
        </text>
        {/* 控制室 */}
        <rect x={FIELD.control.x - 3} y={FIELD.control.y - 3} width={7} height={6} className="control-room" />
        <text x={FIELD.control.x + 6} y={FIELD.control.y + 1} className="zone-label">
          控制室
        </text>

        {/* 落点安全距离圈 */}
        {show.positions.map((pos) => {
          const r = schedule.positionRadius.get(pos.id) ?? 0;
          if (r <= 0) return null;
          const danger = safetyConflictPos.has(pos.id);
          return (
            <circle
              key={`r-${pos.id}`}
              cx={pos.x}
              cy={pos.y}
              r={r}
              className={danger ? "safety-circle danger" : "safety-circle"}
            />
          );
        })}

        {show.positions.map((pos) => {
          const r = schedule.positionRadius.get(pos.id) ?? 0;
          const mods = show.modules.filter((m) => m.positionId === pos.id);
          const b = badges.get(pos.id);
          return (
            <g key={pos.id}>
              <rect
                x={pos.x - 2.5}
                y={pos.y - 2.5}
                width={5}
                height={5}
                className={selPosId === pos.id ? "position-marker selected" : "position-marker"}
              />
              <text x={pos.x} y={pos.y - 5} textAnchor="middle" className="pos-label">
                {pos.name}
              </text>
              {r > 0 && (
                <text x={pos.x} y={pos.y + 9} textAnchor="middle" className="pos-radius">
                  r={r}m
                </text>
              )}
              {/* 模块余量条 */}
              {mods.map((mod, i) => {
                const used = schedule.moduleUsage.get(mod.id) ?? 0;
                const remain = mod.capacity - used;
                const cls = !mod.online
                  ? "offline"
                  : remain < 0
                    ? "over"
                    : remain === 0
                      ? "full"
                      : remain <= 1
                        ? "tight"
                        : "ok";
                return (
                  <g
                    key={mod.id}
                    className={`module-chip ${cls}`}
                    onClick={() => dispatch({ type: "toggleModule", moduleId: mod.id })}
                  >
                    <rect x={pos.x - 16} y={pos.y + 12 + i * 9} width={32} height={7.5} rx={1.5} />
                    <text x={pos.x} y={pos.y + 17.4 + i * 9} textAnchor="middle">
                      {mod.name} {used}/{mod.capacity}
                    </text>
                    {!mod.online && (
                      <line x1={pos.x - 16} y1={pos.y + 12 + i * 9} x2={pos.x + 16} y2={pos.y + 19.5 + i * 9} className="offline-slash" />
                    )}
                  </g>
                );
              })}
              {/* 间隔冲突 / 排队 / 重试徽标 */}
              {b && (b.delayed > 0 || b.queued > 0 || b.retry > 0) && (
                <g transform={`translate(${pos.x + 5}, ${pos.y - 14})`}>
                  {b.delayed > 0 && <text className="badge delayed">顺延×{b.delayed}</text>}
                  {b.queued > 0 && (
                    <text y={b.delayed > 0 ? 5 : 0} className="badge queued">排队×{b.queued}</text>
                  )}
                  {b.retry > 0 && (
                    <text y={(b.delayed > 0 ? 5 : 0) + (b.queued > 0 ? 5 : 0)} className="badge retry">
                      重试×{b.retry}
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="legend plan-legend">
        <span><i className="swatch ok" />余量充足</span>
        <span><i className="swatch tight" />余量≤1</span>
        <span><i className="swatch full" />满载</span>
        <span><i className="swatch offline" />掉线</span>
        <span><i className="swatch circle" />落点安全距离圈（红=越界）</span>
      </div>
    </section>
  );
}
