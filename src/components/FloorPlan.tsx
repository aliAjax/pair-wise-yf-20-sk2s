// 燃放点位平面图：模块余量 / 间隔冲突 / 落点安全距离

import { useApp } from "../state/AppContext";
import { STAGE_WIDTH, STAGE_HEIGHT, AUDIENCE_DEPTH } from "../engine/scheduler";
import type { Category, IgnitionNode } from "../types";

const CATEGORY_COLOR: Record<Category, string> = {
  礼花弹: "#dc2626",
  罗马烛光: "#f59e0b",
  扇形架: "#1d4ed8",
  冷焰火: "#0d9488",
};

const SCALE = 3; // 安全距离显示比例 (1m : 3px)，避免大圆遮挡全图

export default function FloorPlan() {
  const { state, dispatch } = useApp();
  const { nodes, modules, conflicts, types, selectedNodeId } = state;

  const typeById = new Map(types.map((t) => [t.id, t]));
  const conflictNodeIds = new Set(conflicts.flatMap((c) => c.nodeIds));
  const intervalPairs = conflicts
    .filter((c) => c.kind === "interval")
    .map((c) => c.nodeIds);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <section className="panel floor-panel">
      <div className="heading">
        <div>
          <p>点位平面图</p>
          <h2>燃放点位布局</h2>
        </div>
        <div className="legend">
          {Object.entries(CATEGORY_COLOR).map(([cat, color]) => (
            <span key={cat}>
              <i style={{ background: color }} />
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div className="floor-wrap">
        <svg
          viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT + AUDIENCE_DEPTH}`}
          className="floor-svg"
        >
          {/* 场地 */}
          <rect x={0} y={0} width={STAGE_WIDTH} height={STAGE_HEIGHT} fill="#f8fafc" />
          {/* 观众区 */}
          <rect
            x={0}
            y={STAGE_HEIGHT}
            width={STAGE_WIDTH}
            height={AUDIENCE_DEPTH}
            fill="#fee2e2"
          />
          <text x={STAGE_WIDTH / 2} y={STAGE_HEIGHT + 14} textAnchor="middle" fontSize="10" fill="#b91c1c">
            观 众 区
          </text>

          {/* 安全距离圈 */}
          {nodes.map((n) => {
            const t = typeById.get(n.typeId);
            if (!t) return null;
            const color = CATEGORY_COLOR[t.category];
            const r = t.safetyDistance * SCALE;
            return (
              <circle
                key={`safe-${n.id}`}
                cx={n.x}
                cy={n.y}
                r={r}
                fill={color}
                fillOpacity={0.06}
                stroke={color}
                strokeOpacity={0.35}
                strokeWidth={0.6}
                strokeDasharray="3 2"
              />
            );
          })}

          {/* 间隔冲突连线 */}
          {intervalPairs.map((pair, i) => {
            const a = nodeById.get(pair[0]);
            const b = nodeById.get(pair[1]);
            if (!a || !b) return null;
            return (
              <line
                key={`int-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#dc2626"
                strokeWidth={1.2}
                strokeDasharray="4 3"
              />
            );
          })}

          {/* 模块 */}
          {modules.map((m) => {
            const used = nodes.filter((n) => n.moduleId === m.id).length;
            const ratio = m.capacity > 0 ? used / m.capacity : 0;
            const barColor = ratio >= 1 ? "#dc2626" : ratio >= 0.75 ? "#f59e0b" : "#16a34a";
            return (
              <g key={m.id}>
                <rect
                  x={m.x - 11}
                  y={m.y - 8}
                  width={22}
                  height={16}
                  rx={2}
                  fill={m.online ? "#1e293b" : "#94a3b8"}
                  stroke="#0f172a"
                  strokeWidth={0.8}
                />
                <text x={m.x} y={m.y - 1} textAnchor="middle" fontSize="7" fill="#fff">
                  {m.name.replace("主控", "")}
                </text>
                {/* 容量条 */}
                <rect x={m.x - 9} y={m.y + 3} width={18} height={2.5} fill="#e2e8f0" />
                <rect x={m.x - 9} y={m.y + 3} width={18 * ratio} height={2.5} fill={barColor} />
                <text x={m.x} y={m.y + 11} textAnchor="middle" fontSize="6" fill="#475569">
                  {used}/{m.capacity}
                  {m.online ? "" : " 掉线"}
                </text>
              </g>
            );
          })}

          {/* 节点 */}
          {nodes.map((n) => {
            const t = typeById.get(n.typeId);
            if (!t) return null;
            const color = CATEGORY_COLOR[t.category];
            const hasConflict = conflictNodeIds.has(n.id);
            const selected = selectedNodeId === n.id;
            return (
              <g
                key={n.id}
                onClick={() => dispatch({ type: "SELECT_NODE", id: selected ? null : n.id })}
                style={{ cursor: "pointer" }}
              >
                {hasConflict && (
                  <circle cx={n.x} cy={n.y} r={6} fill="none" stroke="#dc2626" strokeWidth={1.2}>
                    <animate attributeName="r" values="5;8;5" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                )}
                {n.queued ? (
                  <circle cx={n.x} cy={n.y} r={3.2} fill="#fff" stroke="#dc2626" strokeWidth={1.2} strokeDasharray="2 1.5" />
                ) : (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={selected ? 5 : 3.2}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                )}
                {n.pinned && (
                  <text x={n.x} y={n.y - 5} textAnchor="middle" fontSize="6" fill="#1d4ed8">
                    ▼
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {selectedNodeId && <NodeDetail node={nodes.find((n) => n.id === selectedNodeId)!} />}
    </section>
  );
}

function NodeDetail({ node }: { node: IgnitionNode }) {
  const { state, dispatch } = useApp();
  const type = state.types.find((t) => t.id === node.typeId);
  const seg = state.segments.find((s) => s.id === node.segmentId);
  const mod = state.modules.find((m) => m.id === node.moduleId);
  return (
    <div className="node-detail">
      <div className="node-detail-head">
        <strong>{node.id}</strong>
        <span className="muted">
          {seg?.name} · {type?.name}
        </span>
        <button className="mini" onClick={() => dispatch({ type: "TOGGLE_PIN", id: node.id })}>
          {node.pinned ? "取消钉住" : "钉住"}
        </button>
        <button className="mini danger" onClick={() => dispatch({ type: "DELETE_NODE", id: node.id })}>
          删除
        </button>
      </div>
      <div className="node-detail-grid">
        <label>
          <span>发射角度</span>
          <input
            type="number"
            value={node.angle}
            onChange={(e) =>
              dispatch({ type: "UPDATE_NODE", id: node.id, patch: { angle: Number(e.target.value) } })
            }
          />
        </label>
        <label>
          <span>位置 X (m)</span>
          <input
            type="number"
            value={node.x}
            onChange={(e) =>
              dispatch({ type: "UPDATE_NODE", id: node.id, patch: { x: Number(e.target.value) } })
            }
          />
        </label>
        <label>
          <span>位置 Y (m)</span>
          <input
            type="number"
            value={node.y}
            onChange={(e) =>
              dispatch({ type: "UPDATE_NODE", id: node.id, patch: { y: Number(e.target.value) } })
            }
          />
        </label>
        <label>
          <span>点火时间 (s)</span>
          <input
            type="number"
            step="0.1"
            value={node.time}
            disabled={node.pinned}
            onChange={(e) =>
              dispatch({ type: "UPDATE_NODE", id: node.id, patch: { time: Number(e.target.value) } })
            }
          />
        </label>
      </div>
      <p className="muted node-status">
        {node.queued ? (
          <span className="tag tag-danger">排队中</span>
        ) : (
          <span className="tag tag-ok">{mod?.name ?? "未分配"}</span>
        )}
        {node.delay > 0 && <span className="tag tag-warn">顺延 +{node.delay.toFixed(2)}s</span>}
        {node.pinned && <span className="tag tag-info">已钉住</span>}
      </p>
    </div>
  );
}
