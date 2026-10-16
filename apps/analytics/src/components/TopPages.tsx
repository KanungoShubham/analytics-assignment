import type { TopPage } from '../lib/stats';

export function TopPages({ pages }: { pages: TopPage[] }) {
  if (pages.length === 0) return <div className="empty">No page views in this range.</div>;
  const max = pages[0].views;
  return (
    <table className="pages">
      <thead>
        <tr>
          <th>Page</th>
          <th className="r">Views</th>
          <th className="r">Visitors</th>
        </tr>
      </thead>
      <tbody>
        {pages.map((p) => (
          <tr key={p.url}>
            <td className="page-cell">
              <div className="page-bar" style={{ width: `${(p.views / max) * 100}%` }} aria-hidden />
              <span>{p.url}</span>
            </td>
            <td className="r">{p.views.toLocaleString('en-US')}</td>
            <td className="r">{p.uniqueVisitors.toLocaleString('en-US')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
