'use client';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function TrafficChart({ data }: { data: { date: string; pageViews: number; uniqueVisitors: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={290}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#eef1f3" vertical={false} />
        <XAxis dataKey="date" tickFormatter={dayLabel} fontSize={12} tickLine={false} axisLine={false} minTickGap={24} stroke="#6b7a83" />
        <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} stroke="#6b7a83" />
        <Tooltip labelFormatter={(d) => dayLabel(String(d))} contentStyle={{ borderRadius: 8, border: '1px solid #e1e6ea', fontSize: 13 }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        <Area type="monotone" dataKey="pageViews" name="Page views" stroke="#0f766e" strokeWidth={2} fill="url(#fillViews)" dot={data.length === 1} />
        <Area type="monotone" dataKey="uniqueVisitors" name="Unique visitors" stroke="#1d4ed8" strokeWidth={2} fill="url(#fillVisitors)" dot={data.length === 1} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
