// 编导师工作台：A/B 切换、段落草稿、保存（并发冲突检测）

import { useApp } from "../state/AppContext";
import { formatTime } from "../engine/format";

export default function EditorBar() {
  const { state, dispatch } = useApp();
  const { editor, draft, segments, selectedSegmentId } = state;

  const selectId = draft?.id ?? selectedSegmentId;
  const serverSeg = segments.find((s) => s.id === selectId);

  return (
    <section className="panel editor-panel">
      <div className="heading">
        <div>
          <p>编导师工作台</p>
          <h2>段落编辑与保存</h2>
        </div>
        <div className="editor-switch">
          {(["A", "B"] as const).map((e) => (
            <button
              key={e}
              className={editor === e ? "active" : ""}
              onClick={() => dispatch({ type: "SWITCH_EDITOR", editor: e })}
            >
              编导师 {e}
            </button>
          ))}
        </div>
      </div>

      <div className="editor-body">
        <div className="segment-picker">
          {segments.map((s) => (
            <button
              key={s.id}
              className={selectId === s.id ? "active" : ""}
              onClick={() => dispatch({ type: "SELECT_SEGMENT", id: s.id })}
            >
              {s.name}
              <small>v{s.version}</small>
            </button>
          ))}
          <button className="add-seg" onClick={() => dispatch({ type: "ADD_SEGMENT" })}>
            + 新增段落
          </button>
        </div>

        {draft && serverSeg ? (
          <div className="draft-form">
            <div className="draft-version">
              草稿基线 v{draft.version} · 服务器当前 v{serverSeg.version}
              {draft.version !== serverSeg.version && (
                <span className="tag tag-warn">已落后，保存将触发冲突</span>
              )}
            </div>
            <label>
              <span>段落名称</span>
              <input
                value={draft.name}
                onChange={(e) => dispatch({ type: "UPDATE_DRAFT", patch: { name: e.target.value } })}
              />
            </label>
            <label>
              <span>音乐时间点 (s)</span>
              <input
                type="number"
                step="0.1"
                value={draft.musicTime}
                onChange={(e) =>
                  dispatch({ type: "UPDATE_DRAFT", patch: { musicTime: Number(e.target.value) } })
                }
              />
              <small className="hint">={formatTime(draft.musicTime)}</small>
            </label>
            <label>
              <span>持续时间 (s)</span>
              <input
                type="number"
                value={draft.duration}
                onChange={(e) =>
                  dispatch({ type: "UPDATE_DRAFT", patch: { duration: Number(e.target.value) } })
                }
              />
            </label>
            <div className="draft-actions">
              <button className="primary" onClick={() => dispatch({ type: "SAVE_DRAFT" })}>
                保存段落
              </button>
              <button onClick={() => dispatch({ type: "DISCARD_DRAFT" })}>放弃草稿</button>
            </div>
          </div>
        ) : (
          <div className="draft-empty">
            <p>选择一个段落开始编辑。</p>
            <p className="muted">
              提示：编导师 A 与 B 同时保存同一段落时，先落的留下，晚到的列出差异。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
