// 整场节目预览

import { useApp } from "../state/AppContext";
import { formatTime, formatShort } from "../engine/format";

export default function Preview() {
  const { state } = useApp();
  const { segments, nodes, modules, conflicts, types } = state;

  const totalDuration = segments.reduce((m, s) => Math.max(m, s.musicTime + s.duration), 0);
  const pinnedCount = nodes.filter((n) => n.pinned).length;
  const queuedCount = nodes.filter((n) => n.queued).length;
  const delayedCount = nodes.filter((n) => n.delay > 0).length;
  const onlineModules = modules.filter((m) => m.online).length;
  const totalCapacity = modules.filter((m) => m.online).reduce((s, m) => s + m.capacity, 0);
  const usedCapacity = nodes.filter((n) => n.moduleId !== null).length;

  const typeById = new Map(types.map((t) => [t.id, t]));

  return (
    <section className="panel preview-panel">
      <div className="heading">
        <div>
          <p>整场预览</p>
          <h2>节目总览</h2>
        </div>
      </div>

      <div className="preview-stats">
        <div className="preview-stat">
          <small>总时长</small>
          <strong>{formatShort(totalDuration)}</strong>
        </div>
        <div className="preview-stat">
          <small>点火节点</small>
          <strong>{nodes.length}</strong>
        </div>
        <div className="preview-stat">
          <small>在线模块</small>
          <strong>{onlineModules}/{modules.length}</strong>
        </div>
        <div className="preview-stat">
          <small>容量占用</small>
          <strong>{usedCapacity}/{totalCapacity}</strong>
        </div>
        <div className="preview-stat">
          <small>排队 / 顺延</small>
          <strong>
            {queuedCount} / {delayedCount}
          </strong>
        </div>
        <div className="preview-stat">
          <small>钉住节点</small>
          <strong>{pinnedCount}</strong>
        </div>
        <div className="preview-stat">
          <small>冲突</small>
          <strong className={conflicts.length ? "text-danger" : "text-ok"}>{conflicts.length}</strong>
        </div>
      </div>

      <div className="preview-segments">
        {segments.map((s) => {
          const segNodes = nodes.filter((n) => n.segmentId === s.id);
          const segConflicts = conflicts.filter((c) =>
            c.nodeIds.some((id) => segNodes.some((n) => n.id === id))
          );
          return (
            <article key={s.id} className="preview-segment">
              <div className="preview-segment-head">
                <strong>{s.name}</strong>
                <span className="muted">
                  {formatTime(s.musicTime)} · {s.duration}s · v{s.version}
                </span>
              </div>
              <div className="preview-nodes">
                {segNodes.length === 0 && <span className="muted">无节点</span>}
                {segNodes.map((n) => {
                  const t = typeById.get(n.typeId);
                  return (
                    <span
                      key={n.id}
                      className={`preview-node ${n.queued ? "queued" : ""} ${n.pinned ? "pinned" : ""}`}
                      title={`${n.id} · ${t?.name ?? ""} · ${formatTime(n.time)}`}
                    >
                      {formatTime(n.time)}
                    </span>
                  );
                })}
              </div>
              {segConflicts.length > 0 && (
                <p className="preview-conflict-hint">{segConflicts.length} 项冲突</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
