'use client';
import { track } from '@acme/browser-sdk';
import { MENU } from '../../lib/menu';
import { useCart } from '../../lib/cart';

const CATEGORIES = ['Starters', 'Mains', 'Desserts'] as const;

export default function MenuPage() {
  const { add } = useCart();
  return (
    <main>
      <h1>Menu</h1>
      {CATEGORIES.map((category) => (
        <section key={category}>
          <h2>{category}</h2>
          {MENU.filter((m) => m.category === category).map((item) => (
            <div className="item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="price">${item.price.toFixed(2)}</span>
                <button
                  className="btn"
                  onClick={() => {
                    add(item.id);
                    track('add_to_cart', { itemId: item.id, name: item.name, price: item.price });
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
