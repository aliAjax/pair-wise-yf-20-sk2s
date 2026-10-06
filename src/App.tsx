import { useEffect, useState } from "react";
import "./styles.css";
import { ShowStoreProvider, useShowStore } from "./state/store";
import { Timeline, type Selection } from "./components/Timeline";
import { SitePlan } from "./components/SitePlan";
import { SegmentEditor, ConflictModal } from "./components/SegmentEditor";
import { ModulePanel, ConflictPanel, TypeList } from "./components/Panels";
import { PreviewPlayer } from "./components/PreviewPlayer";

const USERS = ["编导甲", "编导乙"];

function Header() {
  const { state, dispatch } = useShowStore();
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">hxyfront-62008 · 烟花燃放编排</p>
        <h1>烟花燃放脚本编排</h1>
      </div>
      <div className="header-actions">
        <div className="user-switch" role="group" aria-label="当前编导">
          {USERS.map((u) => (
            <button
              key={u}
              className={state.currentUser === u ? "user active" : "user"}
              onClick={() => dispatch({ type: "setUser", user: u })}
            >
              {u}
            </button>
          ))}
        </div>
        <button onClick={() => dispatch({ type: "resetShow" })}>重置数据</button>
      </div>
    </header>
  );
}

function Metrics() {
  const { state } = useShowStore();
  const { show, schedule } = state;
  const remaining = show.modules
    .filter((m) => m.online)
    .reduce((sum, m) => sum + Math.max(0, m.capacity - (schedule.moduleUsage.get(m.id) ?? 0)), 0);
  const cards = [
    { label: "节目段落", value: show.segments.length },
    { label: "点火节点", value: show.nodes.length },
    { label: "冲突提示", value: schedule.conflicts.length, bad: schedule.conflicts.length > 0 },
    { label: "模块余量", value: remaining },
  ];
  return (
    <section className="metrics">
      {cards.map((c) => (
        <article key={c.label} className={c.bad ? "metric bad" : "metric"}>
          <small>{c.label}</small>
          <strong>{c.value}</strong>
        </article>
      ))}
    </section>
  );
}

function Notice() {
  const { state, dispatch } = useShowStore();
  useEffect(() => {
    if (!state.notice) return;
    const t = setTimeout(() => dispatch({ type: "clearNotice" }), 5000);
    return () => clearTimeout(t);
  }, [state.notice, dispatch]);
  if (!state.notice) return null;
  return <div className="toast">{state.notice}</div>;
}

function Shell() {
  const [selection, setSelection] = useState<Selection>(null);
  return (
    <main className="app">
      <Header />
      <Metrics />
      <div className="layout">
        <div className="main-col">
          <Timeline selection={selection} onSelect={setSelection} />
          <div className="split-row">
            <SitePlan selection={selection} />
            <PreviewPlayer />
          </div>
        </div>
        <aside className="side-col">
          <SegmentEditor />
          <ModulePanel />
          <ConflictPanel />
          <TypeList />
        </aside>
      </div>
      <ConflictModal />
      <Notice />
    </main>
  );
}

export default function App() {
  return (
    <ShowStoreProvider>
      <Shell />
    </ShowStoreProvider>
  );
}
