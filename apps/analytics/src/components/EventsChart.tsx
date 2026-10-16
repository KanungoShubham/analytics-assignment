'use client';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = ['#3e63dd', '#12a594', '#e5484d', '#f76b15', '#8e4ec6', '#0090ff', '#ab6400', '#d6409f'];

export function EventsChart({ names, series }: { names: string[]; series: Record<string, string | number>[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#eef0f3" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={12} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip />
        <Legend />
        {names.map((name, i) => (
          <Bar key={name} dataKey={name} stackId="events" fill={COLORS[i % COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
