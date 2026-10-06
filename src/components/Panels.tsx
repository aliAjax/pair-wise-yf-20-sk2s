import { useShowStore } from "../state/store";
import { fmtMs } from "../engine/time";

/** 点火模块列表：容量余量、在线状态 */
export function ModulePanel() {
  const { state, dispatch } = useShowStore();
  const { show, schedule } = state;
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>点火模块</h2>
        <span className="dim">容量有限 · 间隔不足自动顺延</span>
      </div>
      <div className="module-list">
        {show.modules.map((m) => {
          const used = schedule.moduleUsage.get(m.id) ?? 0;
          const remain = m.capacity - used;
          const pos = show.positions.find((p) => p.id === m.positionId);
          const pct = Math.min(100, (used / m.capacity) * 100);
          return (
            <div key={m.id} className={m.online ? "module-item" : "module-item offline"}>
              <div className="module-top">
                <strong>{m.name}</strong>
                <span className="dim">
                  {pos?.name} · 间隔≥{m.minIntervalMs}ms
                </span>
                <button
                  className={m.online ? "toggle on" : "toggle off"}
                  onClick={() => dispatch({ type: "toggleModule", moduleId: m.id })}
                >
                  {m.online ? "在线" : "掉线"}
                </button>
              </div>
              <div className="usage-bar">
                <div
                  className={remain < 0 ? "usage-fill over" : remain === 0 ? "usage-fill full" : "usage-fill"}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="module-sub">
                <span>
                  已用 {used}/{m.capacity} · 余量 {remain < 0 ? `超载${-remain}` : remain}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** 冲突时间提示 */
export function ConflictPanel() {
  const { state } = useShowStore();
  const { conflicts } = state.schedule;
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>冲突提示</h2>
        <span className={conflicts.length ? "count-badge bad" : "count-badge good"}>
          {conflicts.length}
        </span>
      </div>
      {conflicts.length === 0 ? (
        <p className="hint">暂无冲突，所有节点按计划排程。</p>
      ) : (
        <ul className="conflict-list">
          {conflicts.map((c) => (
            <li key={c.id} className={c.severity}>
              <span className="conflict-icon">{c.severity === "error" ? "⛔" : "⚠️"}</span>
              <span>{c.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 型号清单 */
export function TypeList() {
  const { state } = useShowStore();
  const { show, schedule } = state;
  const usage = new Map<string, number>();
  for (const p of schedule.placements.values()) {
    if (p.queued) continue;
    const node = show.nodes.find((n) => n.id === p.nodeId);
    if (node) usage.set(node.typeId, (usage.get(node.typeId) ?? 0) + 1);
  }
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>型号清单</h2>
      </div>
      <table className="type-table">
        <thead>
          <tr>
            <th>型号</th>
            <th>口径</th>
            <th>持续</th>
            <th>安全距离</th>
            <th>用量</th>
          </tr>
        </thead>
        <tbody>
          {show.types.map((t) => (
            <tr key={t.id}>
              <td>
                <i className="type-dot" style={{ background: t.color }} />
                {t.name}
              </td>
              <td>{t.caliberMm}mm</td>
              <td>{(t.durationMs / 1000).toFixed(1)}s</td>
              <td>{t.safetyRadiusM}m</td>
              <td>{usage.get(t.id) ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">全场结束于 {fmtMs(schedule.showEndMs)}</p>
    </section>
  );
}
