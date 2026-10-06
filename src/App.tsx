import { AppProvider, useApp } from "./state/AppContext";
import EditorBar from "./components/EditorBar";
import ModulePanel from "./components/ModulePanel";
import Timeline from "./components/Timeline";
import FloorPlan from "./components/FloorPlan";
import ConflictPanel from "./components/ConflictPanel";
import Preview from "./components/Preview";
import TypeList from "./components/TypeList";
import NodePanel from "./components/NodePanel";
import LogPanel from "./components/LogPanel";
import SaveDialog from "./components/SaveDialog";
import "./styles.css";

function StatsBar() {
  const { state } = useApp();
  const { segments, nodes, conflicts, modules } = state;
  const queued = nodes.filter((n) => n.queued).length;
  const delayed = nodes.filter((n) => n.delay > 0).length;
  const pinned = nodes.filter((n) => n.pinned).length;
  const online = modules.filter((m) => m.online).length;

  const stats = [
    { label: "节目段落", value: segments.length },
    { label: "点火节点", value: nodes.length },
    { label: "在线模块", value: `${online}/${modules.length}` },
    { label: "排队节点", value: queued },
    { label: "顺延节点", value: delayed },
    { label: "钉住节点", value: pinned },
    { label: "冲突提示", value: conflicts.length },
  ];

  return (
    <section className="stats-bar">
      {stats.map((s) => (
        <article key={s.label}>
          <small>{s.label}</small>
          <strong>{s.value}</strong>
        </article>
      ))}
    </section>
  );
}

function Workspace() {
  return (
    <main className="app">
      <header className="hero">
        <p>hxyfront-62008 · 烟花燃放编排</p>
        <h1>烟花燃放脚本编排</h1>
        <span>
          改一处牵动全场：段落音乐时间点变更，点火节点重算时间，手工钉住的节点留在原处。
          模块容量有限，排不下的节点排队等下一台；两次点火挨得太近顺延。模块掉线按余量重排，
          重排失败按原节点重试。两名编导师同时保存同一段落，先落的留下，晚到的列出差异。
        </span>
      </header>

      <StatsBar />

      <div className="grid grid-top">
        <EditorBar />
        <ModulePanel />
      </div>

      <Timeline />

      <div className="grid grid-mid">
        <FloorPlan />
        <ConflictPanel />
      </div>

      <Preview />

      <div className="grid grid-bot">
        <TypeList />
        <NodePanel />
      </div>

      <LogPanel />

      <SaveDialog />
    </main>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Workspace />
    </AppProvider>
  );
}
