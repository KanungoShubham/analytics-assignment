'use client';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Fixed colours for the demo's known events, so the same event keeps its colour across ranges.
const KNOWN: Record<string, string> = {
  add_to_cart: '#0f766e',
  checkout_started: '#1d4ed8',
  order_created: '#b45309',
  remove_from_cart: '#94a3b8',
};
const EXTRA = ['#6d28d9', '#be185d', '#0369a1', '#4d7c0f'];

const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const pretty = (name: string) => name.replace(/_/g, ' ');

export function EventsChart({ names, series }: { names: string[]; series: Record<string, string | number>[] }) {
  let extra = 0;
  const color = (name: string) => KNOWN[name] ?? EXTRA[extra++ % EXTRA.length];
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke="#eef1f3" vertical={false} />
        <XAxis dataKey="date" tickFormatter={dayLabel} fontSize={12} tickLine={false} axisLine={false} minTickGap={24} stroke="#6b7a83" />
        <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} stroke="#6b7a83" />
        <Tooltip labelFormatter={(d) => dayLabel(String(d))} formatter={(v, n) => [v, pretty(String(n))]} contentStyle={{ borderRadius: 8, border: '1px solid #e1e6ea', fontSize: 13 }} cursor={{ fill: '#f4f6f8' }} />
        <Legend iconType="circle" formatter={(n) => pretty(String(n))} wrapperStyle={{ fontSize: 13 }} />
        {names.map((name, i) => (
          <Bar key={name} dataKey={name} stackId="events" fill={color(name)} radius={i === names.length - 1 ? [3, 3, 0, 0] : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
