// 点火模块面板：在线/掉线切换 + 容量余量

import { useApp } from "../state/AppContext";

export default function ModulePanel() {
  const { state, dispatch } = useApp();
  const { modules, nodes } = state;

  return (
    <section className="panel module-panel">
      <div className="heading">
        <div>
          <p>点火模块</p>
          <h2>模块容量与在线状态</h2>
        </div>
      </div>
      <div className="module-list">
        {modules.map((m) => {
          const used = nodes.filter((n) => n.moduleId === m.id).length;
          const queued = nodes.filter((n) => n.queued).length;
          const ratio = m.capacity > 0 ? used / m.capacity : 0;
          return (
            <article key={m.id} className={`module-card ${m.online ? "" : "offline"}`}>
              <div className="module-head">
                <strong>{m.name}</strong>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={m.online}
                    onChange={() => dispatch({ type: "TOGGLE_MODULE", id: m.id })}
                  />
                  <span>{m.online ? "在线" : "掉线"}</span>
                </label>
              </div>
              <div className="capacity-bar">
                <div
                  className="capacity-fill"
                  style={{
                    width: `${Math.min(100, ratio * 100)}%`,
                    background: ratio >= 1 ? "#dc2626" : ratio >= 0.75 ? "#f59e0b" : "#16a34a",
                  }}
                />
              </div>
              <p className="module-meta">
                容量 {used}/{m.capacity}
                {queued > 0 && <span className="tag tag-danger">{queued} 排队</span>}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
