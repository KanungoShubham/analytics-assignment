import type { DishStats } from '../lib/behaviour';

/** Which dishes people add and actually order. */
export function PopularDishes({ dishes }: { dishes: DishStats[] }) {
  if (dishes.length === 0) return <div className="empty">No dishes added to a cart in this range.</div>;
  const max = Math.max(...dishes.map((d) => d.addedToCart), 1);
  return (
    <table className="pages dishes">
      <thead>
        <tr>
          <th>Dish</th>
          <th className="r" title="Times added to a cart">Added</th>
          <th className="r" title="Different visitors who added it">People</th>
          <th className="r" title="Orders that included it">Ordered</th>
        </tr>
      </thead>
      <tbody>
        {dishes.map((d) => (
          <tr key={d.itemId}>
            <td className="page-cell">
              <div className="page-bar" style={{ width: `${(d.addedToCart / max) * 100}%` }} aria-hidden />
              <span className="dish-name">{d.name}</span>
            </td>
            <td className="r">{d.addedToCart}</td>
            <td className="r">{d.visitors}</td>
            <td className="r ordered">{d.ordered}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
