// 操作日志：记录重算 / 调度 / 掉线重排 / 并发保存

import { useApp } from "../state/AppContext";

export default function LogPanel() {
  const { state, dispatch } = useApp();
  const { log } = state;

  return (
    <section className="panel log-panel">
      <div className="heading">
        <div>
          <p>操作日志</p>
          <h2>编排变更记录</h2>
        </div>
        <button className="mini" onClick={() => dispatch({ type: "CLEAR_LOG" })}>
          清空
        </button>
      </div>
      {log.length === 0 ? (
        <p className="muted">暂无日志</p>
      ) : (
        <ul className="log-list">
          {log.map((entry) => (
            <li key={entry.id}>{entry.text}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
