import { useEffect, useState } from "react";
import { useShowStore } from "../state/store";
import { fmtMs, parseMs } from "../engine/time";
import type { Segment } from "../engine/types";

interface Draft {
  name: string;
  start: string;
  end: string;
  musicPoints: { id: string; label: string; time: string }[];
}

function toDraft(seg: Segment): Draft {
  return {
    name: seg.name,
    start: fmtMs(seg.startMs),
    end: fmtMs(seg.endMs),
    musicPoints: seg.musicPoints.map((m) => ({ id: m.id, label: m.label, time: fmtMs(m.timeMs) })),
  };
}

/** 段落编辑：基于版本号的并发保存（先落的留下，晚到的列出差异） */
export function SegmentEditor() {
  const { state, dispatch } = useShowStore();
  const { show, currentUser, editorResetNonce } = state;
  const [segId, setSegId] = useState(show.segments[0]?.id ?? "");
  const segment = show.segments.find((s) => s.id === segId) ?? show.segments[0];
  const [draft, setDraft] = useState<Draft>(() => toDraft(segment));
  const [baseVersion, setBaseVersion] = useState(segment.version);
  const [error, setError] = useState<string | null>(null);

  const reload = (seg: Segment) => {
    setDraft(toDraft(seg));
    setBaseVersion(seg.version);
    setError(null);
  };

  useEffect(() => {
    reload(segment);
    // 仅在切换段落或确认放弃后重载草稿，避免覆盖正在编辑的内容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment.id, editorResetNonce]);

  if (!segment) return null;
  const stale = segment.version !== baseVersion;

  const save = () => {
    const startMs = parseMs(draft.start);
    const endMs = parseMs(draft.end);
    if (startMs == null || endMs == null || endMs <= startMs) {
      setError("段落开始/结束时间格式不正确（mm:ss.mmm），且结束需晚于开始");
      return;
    }
    const musicPoints = [];
    for (const mp of draft.musicPoints) {
      const t = parseMs(mp.time);
      if (t == null) {
        setError(`音乐点「${mp.label}」时间格式不正确`);
        return;
      }
      musicPoints.push({ id: mp.id, label: mp.label, timeMs: t });
    }
    setError(null);
    dispatch({
      type: "saveSegment",
      baseVersion,
      draft: {
        id: segment.id,
        name: draft.name.trim() || segment.name,
        startMs,
        endMs,
        musicPoints,
        version: baseVersion,
        updatedBy: currentUser,
      },
    });
  };

  return (
    <section className="panel editor-panel">
      <div className="panel-head">
        <h2>段落编辑</h2>
        <div className="seg-tabs">
          {show.segments.map((s) => (
            <button
              key={s.id}
              className={s.id === segment.id ? "tab active" : "tab"}
              onClick={() => setSegId(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <p className="dim version-line">
        服务端 v{segment.version}（{segment.updatedBy}） · 你正在基于 v{baseVersion} 编辑
      </p>
      {stale && (
        <div className="stale-banner">
          ⚠ {segment.updatedBy} 已保存了 v{segment.version}，你的草稿基于旧版本，保存时将列出差异。
          <button className="link" onClick={() => reload(segment)}>放弃草稿并载入最新</button>
        </div>
      )}

      <div className="editor-grid">
        <label>
          段落名称
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label>
          开始时间
          <input value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
        </label>
        <label>
          结束时间
          <input value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
        </label>
      </div>

      <div className="mp-list">
        {draft.musicPoints.map((mp, i) => (
          <div className="mp-row" key={mp.id}>
            <input
              className="mp-label"
              value={mp.label}
              aria-label="音乐点名称"
              onChange={(e) =>
                setDraft({
                  ...draft,
                  musicPoints: draft.musicPoints.map((m, j) =>
                    j === i ? { ...m, label: e.target.value } : m
                  ),
                })
              }
            />
            <input
              value={mp.time}
              aria-label="音乐点时间"
              onChange={(e) =>
                setDraft({
                  ...draft,
                  musicPoints: draft.musicPoints.map((m, j) =>
                    j === i ? { ...m, time: e.target.value } : m
                  ),
                })
              }
            />
          </div>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="btn-row">
        <button className="primary" onClick={save}>保存段落（{currentUser}）</button>
        <button onClick={() => dispatch({ type: "simulateExternalSave", segmentId: segment.id })}>
          模拟另一编导保存
        </button>
        <button onClick={() => reload(segment)}>重新载入</button>
      </div>
    </section>
  );
}

/** 保存冲突弹窗：先落的留下，晚到的列出差异 */
export function ConflictModal() {
  const { state, dispatch } = useShowStore();
  const conflict = state.saveConflict;
  if (!conflict) return null;
  return (
    <div className="modal-mask" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>保存冲突 · {conflict.segmentName}</h2>
        <p className="dim">
          {conflict.savedBy} 的版本已先落库，你的修改未写入。以下为逐项差异：
        </p>
        {conflict.entries.length === 0 ? (
          <p className="dim">内容无实质差异（仅版本号不同）。</p>
        ) : (
          <table className="diff-table">
            <thead>
              <tr>
                <th>字段</th>
                <th>你的修改</th>
                <th>已保存（{conflict.savedBy}）</th>
              </tr>
            </thead>
            <tbody>
              {conflict.entries.map((e) => (
                <tr key={e.field}>
                  <td>{e.field}</td>
                  <td className="mine">{e.mine}</td>
                  <td className="theirs">{e.current}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="btn-row">
          <button className="primary" onClick={() => dispatch({ type: "dismissConflict", reloadEditor: true })}>
            放弃我的修改，载入最新
          </button>
          <button onClick={() => dispatch({ type: "dismissConflict", reloadEditor: false })}>
            保留草稿，稍后处理
          </button>
        </div>
      </div>
    </div>
  );
}
