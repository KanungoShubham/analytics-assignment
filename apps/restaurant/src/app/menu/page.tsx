'use client';
import { useEffect, useRef, useState } from 'react';
import { track } from '@acme/browser-sdk';
import { CATEGORIES, MENU, formatPrice, type MenuItem } from '../../lib/menu';
import { useCart } from '../../lib/cart';

export default function MenuPage() {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function addToCart(item: MenuItem) {
    add(item.id);
    track('add_to_cart', { itemId: item.id, name: item.name, price: item.price });
    setJustAdded(item.id);
    setToast(`${item.name} added to your cart`);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setJustAdded(null);
      setToast(null);
    }, 1600);
  }

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <h1>Menu</h1>
          <p>Everything is cooked to order. Prices include tax.</p>
        </div>

        <nav className="tabs" aria-label="Menu sections">
          {CATEGORIES.map((c) => (
            <a key={c.name} className="tab" href={`#${c.name.toLowerCase()}`}>{c.name}</a>
          ))}
        </nav>

        {CATEGORIES.map((category) => (
          <section key={category.name} id={category.name.toLowerCase()} className="menu-section">
            <h2>{category.name}</h2>
            <p className="section-note">{category.note}</p>
            {MENU.filter((m) => m.category === category.name).map((item) => (
              <div className="dish" key={item.id}>
                <div className="dish-line">
                  <span className="dish-name">
                    {item.name}
                    {item.tag && <span className="dish-tag">{item.tag}</span>}
                  </span>
                  <span className="leader" aria-hidden />
                  <span className="dish-price">{formatPrice(item.price)}</span>
                </div>
                <p className="dish-desc">{item.description}</p>
                <button
                  className={`btn btn-primary btn-sm add-btn ${justAdded === item.id ? 'added' : ''}`}
                  onClick={() => addToCart(item)}
                  aria-label={`Add ${item.name} to cart`}
                >
                  {justAdded === item.id ? 'Added ✓' : 'Add'}
                </button>
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </main>
  );
}
