// 节点列表：快速查看 / 钉住 / 删除 / 新增

import { useApp } from "../state/AppContext";
import { formatTime } from "../engine/format";

export default function NodePanel() {
  const { state, dispatch } = useApp();
  const { nodes, segments, types, modules, selectedNodeId } = state;

  const segById = new Map(segments.map((s) => [s.id, s]));
  const typeById = new Map(types.map((t) => [t.id, t]));
  const modById = new Map(modules.map((m) => [m.id, m]));

  return (
    <section className="panel node-panel">
      <div className="heading">
        <div>
          <p>点火节点</p>
          <h2>节点清单</h2>
        </div>
        <button className="primary" onClick={() => dispatch({ type: "ADD_NODE" })}>
          + 新增节点
        </button>
      </div>
      <div className="node-list">
        {nodes.map((n) => {
          const seg = segById.get(n.segmentId);
          const t = typeById.get(n.typeId);
          const mod = modById.get(n.moduleId ?? "");
          return (
            <article
              key={n.id}
              className={`node-row ${selectedNodeId === n.id ? "selected" : ""} ${n.queued ? "queued" : ""}`}
              onClick={() => dispatch({ type: "SELECT_NODE", id: selectedNodeId === n.id ? null : n.id })}
            >
              <div className="node-row-main">
                <b>{n.id}</b>
                <span className="node-time">{formatTime(n.time)}</span>
                <span className="muted">{seg?.name}</span>
                <span className="muted">{t?.name}</span>
              </div>
              <div className="node-row-tags">
                {n.queued ? (
                  <span className="tag tag-danger">排队</span>
                ) : (
                  <span className="tag tag-ok">{mod?.name ?? "未分配"}</span>
                )}
                {n.delay > 0 && <span className="tag tag-warn">+{n.delay.toFixed(1)}s</span>}
                {n.pinned && <span className="tag tag-info">钉住</span>}
              </div>
              <div className="node-row-actions">
                <button
                  className="mini"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "TOGGLE_PIN", id: n.id });
                  }}
                >
                  {n.pinned ? "取消钉住" : "钉住"}
                </button>
                <button
                  className="mini danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "DELETE_NODE", id: n.id });
                  }}
                >
                  删除
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
