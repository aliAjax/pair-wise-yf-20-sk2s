// 时间轴编排：节目段落泳道 + 模块点火点位

import { useApp } from "../state/AppContext";
import { formatTime } from "../engine/format";
import type { Category, IgnitionNode } from "../types";

const CATEGORY_COLOR: Record<Category, string> = {
  礼花弹: "#dc2626",
  罗马烛光: "#f59e0b",
  扇形架: "#1d4ed8",
  冷焰火: "#0d9488",
};

const PX_PER_SEC = 4;
const RULER_HEIGHT = 28;
const SEGMENT_HEIGHT = 34;
const LANE_HEIGHT = 26;
const QUEUE_HEIGHT = 26;

export default function Timeline() {
  const { state, dispatch } = useApp();
  const { segments, modules, nodes, conflicts, types, selectedNodeId } = state;

  const typeById = new Map(types.map((t) => [t.id, t]));
  const totalDuration = Math.max(
    300,
    ...segments.map((s) => s.musicTime + s.duration),
    ...nodes.map((n) => n.time + 5)
  );
  const width = totalDuration * PX_PER_SEC;

  const conflictNodeIds = new Set(conflicts.flatMap((c) => c.nodeIds));
  const queuedNodes = nodes.filter((n) => n.queued);

  const segColor = (i: number) =>
    ["#dbeafe", "#fef3c7", "#fce7f3", "#dcfce7", "#e0e7ff"][i % 5];

  return (
    <section className="panel timeline-panel">
      <div className="heading">
        <div>
          <p>时间轴编排</p>
          <h2>段落与点火点位</h2>
        </div>
        <div className="timeline-legend">
          <span><i className="dot dot-pin" />钉住</span>
          <span><i className="dot dot-queue" />排队</span>
          <span><i className="dot dot-conflict" />冲突</span>
        </div>
      </div>

      <div className="timeline-scroll">
        <div className="timeline" style={{ width }}>
          {/* 标尺 */}
          <div className="ruler" style={{ height: RULER_HEIGHT }}>
            {Array.from({ length: Math.ceil(totalDuration / 30) + 1 }, (_, i) => i * 30).map((sec) => (
              <div key={sec} className="ruler-tick" style={{ left: sec * PX_PER_SEC }}>
                <span>{formatTime(sec)}</span>
              </div>
            ))}
          </div>

          {/* 段落泳道 */}
          <div className="lane segment-lane" style={{ height: SEGMENT_HEIGHT }}>
            {segments.map((s, i) => (
              <div
                key={s.id}
                className={`segment-block ${state.selectedSegmentId === s.id ? "active" : ""}`}
                style={{
                  left: s.musicTime * PX_PER_SEC,
                  width: Math.max(40, s.duration * PX_PER_SEC),
                  background: segColor(i),
                }}
                onClick={() => dispatch({ type: "SELECT_SEGMENT", id: s.id })}
              >
                <b>{s.name}</b>
                <span>{formatTime(s.musicTime)}</span>
              </div>
            ))}
          </div>

          {/* 模块泳道 */}
          {modules.map((m) => (
            <div
              key={m.id}
              className={`lane module-lane ${m.online ? "" : "offline"}`}
              style={{ height: LANE_HEIGHT }}
            >
              <span className="lane-label">
                {m.name}
                {!m.online && <em>掉线</em>}
              </span>
              {nodes
                .filter((n) => n.moduleId === m.id)
                .map((n) => {
                  const t = typeById.get(n.typeId);
                  const color = t ? CATEGORY_COLOR[t.category] : "#64748b";
                  const hasConflict = conflictNodeIds.has(n.id);
                  return (
                    <NodeTick
                      key={n.id}
                      node={n}
                      color={color}
                      conflict={hasConflict}
                      selected={selectedNodeId === n.id}
                      pxPerSec={PX_PER_SEC}
                      onSelect={() =>
                        dispatch({ type: "SELECT_NODE", id: selectedNodeId === n.id ? null : n.id })
                      }
                    />
                  );
                })}
            </div>
          ))}

          {/* 排队泳道 */}
          <div className="lane queue-lane" style={{ height: QUEUE_HEIGHT }}>
            <span className="lane-label">排队</span>
            {queuedNodes.map((n) => {
              const t = typeById.get(n.typeId);
              const color = t ? CATEGORY_COLOR[t.category] : "#64748b";
              return (
                <NodeTick
                  key={n.id}
                  node={n}
                  color={color}
                  conflict
                  selected={selectedNodeId === n.id}
                  pxPerSec={PX_PER_SEC}
                  onSelect={() =>
                    dispatch({ type: "SELECT_NODE", id: selectedNodeId === n.id ? null : n.id })
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function NodeTick({
  node,
  color,
  conflict,
  selected,
  pxPerSec,
  onSelect,
}: {
  node: IgnitionNode;
  color: string;
  conflict: boolean;
  selected: boolean;
  pxPerSec: number;
  onSelect: () => void;
}) {
  return (
    <div
      className={`node-tick ${conflict ? "conflict" : ""} ${selected ? "selected" : ""} ${node.queued ? "queued" : ""}`}
      style={{ left: node.time * pxPerSec }}
      onClick={onSelect}
      title={`${node.id} · ${formatTime(node.time)}${node.delay > 0 ? ` · 顺延 +${node.delay.toFixed(2)}s` : ""}`}
    >
      {node.pinned && <i className="pin">▼</i>}
      <span className="tick-dot" style={{ background: node.queued ? "#fff" : color, borderColor: color }} />
      {node.delay > 0 && <i className="delay">+{node.delay.toFixed(1)}</i>}
    </div>
  );
}
