// 烟花型号清单

import { useApp } from "../state/AppContext";

export default function TypeList() {
  const { state } = useApp();
  const { types, nodes } = state;

  return (
    <section className="panel type-panel">
      <div className="heading">
        <div>
          <p>型号清单</p>
          <h2>烟花型号</h2>
        </div>
      </div>
      <div className="type-grid">
        {types.map((t) => {
          const count = nodes.filter((n) => n.typeId === t.id).length;
          return (
            <article key={t.id} className="type-card">
              <div className="type-head">
                <strong>{t.name}</strong>
                <span className="type-cat">{t.category}</span>
              </div>
              <dl className="type-specs">
                <div>
                  <dt>口径</dt>
                  <dd>{t.caliber}mm</dd>
                </div>
                <div>
                  <dt>安全距离</dt>
                  <dd>{t.safetyDistance}m</dd>
                </div>
                <div>
                  <dt>持续时间</dt>
                  <dd>{t.effectDuration}s</dd>
                </div>
                <div>
                  <dt>已用</dt>
                  <dd>{count} 点</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
