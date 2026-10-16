'use client';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function TrafficChart({ data }: { data: { date: string; pageViews: number; uniqueVisitors: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#eef0f3" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={12} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="pageViews" name="Page views" stroke="#3e63dd" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="uniqueVisitors" name="Unique visitors" stroke="#12a594" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
