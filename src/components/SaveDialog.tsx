// 并发保存冲突弹窗：先落的留下，晚到的列出差异

import { useApp } from "../state/AppContext";

export default function SaveDialog() {
  const { state, dispatch } = useApp();
  const { saveDialog, editor } = state;

  if (!saveDialog) return null;

  return (
    <div className="modal-overlay" onClick={() => dispatch({ type: "CLOSE_SAVE_DIALOG" })}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>保存冲突</h3>
          <span className="tag tag-warn">先落的留下</span>
        </div>
        <p className="modal-desc">
          编导师 {editor} 的草稿基于旧版本，段落已被编导师 {saveDialog.serverSegment.updatedBy} 先保存。
          以下为你的草稿与服务器当前版本的差异（未覆盖）：
        </p>
        <table className="diff-table">
          <thead>
            <tr>
              <th>字段</th>
              <th>你的草稿（晚到）</th>
              <th>服务器（先落）</th>
            </tr>
          </thead>
          <tbody>
            {saveDialog.diff.map((d) => (
              <tr key={d.field}>
                <td>{d.label}</td>
                <td className="diff-client">{d.client}</td>
                <td className="diff-server">{d.server}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="modal-actions">
          <button className="primary" onClick={() => dispatch({ type: "CLOSE_SAVE_DIALOG" })}>
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
