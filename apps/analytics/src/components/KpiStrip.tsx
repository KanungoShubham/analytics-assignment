'use client';
import { useEffect, useState, type ReactNode } from 'react';

export interface Kpi {
  label: string;
  value: number;
  previous: number;
  format?: 'number' | 'money';
  icon: ReactNode;
  tint: string;
}

const fmt = (n: number, format: Kpi['format']) =>
  format === 'money' ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : Math.round(n).toLocaleString('en-US');

function Delta({ value, previous }: { value: number; previous: number }) {
  if (previous === 0) {
    return value === 0 ? <span className="delta flat">no change</span> : <span className="delta up">new</span>;
  }
  const pct = ((value - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return <span className="delta flat">0%</span>;
  const up = pct > 0;
  return (
    <span className={`delta ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%
    </span>
  );
}

/** Counts up from 0 once, on first render only; later refreshes jump straight to the new value. */
function useCountUp(target: number) {
  const [shown, setShown] = useState(target);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    if (animated) {
      setShown(target);
      return;
    }
    setAnimated(true);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || target === 0) return;
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return shown;
}

function KpiCell({ kpi }: { kpi: Kpi }) {
  const shown = useCountUp(kpi.value);
  return (
    <div className={`kpi ${kpi.format === 'money' ? 'money' : ''}`}>
      <div className="kpi-label">
        <span className="kpi-icon" style={{ background: kpi.tint }} aria-hidden>{kpi.icon}</span>
        {kpi.label}
      </div>
      <div className="kpi-value">{fmt(shown, kpi.format)}</div>
      <Delta value={kpi.value} previous={kpi.previous} />
      <span className="delta-note">vs previous period</span>
    </div>
  );
}

export function KpiStrip({ kpis }: { kpis: Kpi[] }) {
  return (
    <section className="kpis" aria-label="Key numbers">
      {kpis.map((k) => (
        <KpiCell key={k.label} kpi={k} />
      ))}
    </section>
  );
}
