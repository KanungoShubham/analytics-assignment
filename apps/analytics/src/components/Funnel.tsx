import type { FunnelStep } from '../lib/stats';

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = steps[0]?.visitors ?? 0;
  if (top === 0) return <div className="empty">No visitors in this range yet.</div>;
  const ordered = steps[steps.length - 1].visitors;

  return (
    <div>
      <div className="funnel">
        {steps.map((step, i) => (
          <div key={step.key} className={`funnel-step ${i === steps.length - 1 ? 'final' : ''}`}>
            <span className="funnel-name">
              {step.label}
              {i > 0 && <span className="funnel-drop">{pct(step.visitors, steps[i - 1].visitors)}% of previous step</span>}
            </span>
            <span className="funnel-count">{step.visitors.toLocaleString('en-US')}</span>
            <div className="funnel-bar">
              <div className="funnel-fill" style={{ width: `${Math.max(2, pct(step.visitors, top))}%`, animationDelay: `${i * 90}ms` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="funnel-total">
        <span>Visitors who ordered</span>
        <strong>{pct(ordered, top)}%</strong>
      </div>
    </div>
  );
}
