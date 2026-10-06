// 冲突提示面板

import { useApp } from "../state/AppContext";
import type { ConflictKind } from "../types";

const KIND_LABEL: Record<ConflictKind, string> = {
  interval: "间隔冲突",
  capacity: "容量排队",
  safety: "安全距离",
  offline: "模块掉线",
};

const KIND_COLOR: Record<ConflictKind, string> = {
  interval: "#dc2626",
  capacity: "#f59e0b",
  safety: "#dc2626",
  offline: "#64748b",
};

export default function ConflictPanel() {
  const { state } = useApp();
  const { conflicts } = state;

  return (
    <section className="panel conflict-panel">
      <div className="heading">
        <div>
          <p>冲突提示</p>
          <h2>间隔 / 容量 / 安全</h2>
        </div>
        <span className="conflict-count">
          {conflicts.length} 项
        </span>
      </div>

      {conflicts.length === 0 ? (
        <p className="empty-ok">✓ 当前无冲突，编排正常</p>
      ) : (
        <ul className="conflict-list">
          {conflicts.map((c) => (
            <li key={c.id} className={`conflict-item ${c.severity}`}>
              <span className="conflict-kind" style={{ background: KIND_COLOR[c.kind] }}>
                {KIND_LABEL[c.kind]}
              </span>
              <span className="conflict-msg">{c.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
