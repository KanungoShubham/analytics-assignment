'use client';
import { useEffect, useRef, useState } from 'react';
import { getAnonymousId, track } from '@acme/browser-sdk';
import { CATEGORIES, MENU, findMenuItem, formatPrice, type MenuItem } from '../../lib/menu';
import { useCart } from '../../lib/cart';
import { useUser } from '../../lib/user';
import type { Favourites } from '../../lib/favourites';

/** Loads this visitor's favourite dishes once the analytics SDK has an anonymous id. */
function useFavourites(userId: string | null) {
  const [favourites, setFavourites] = useState<Favourites>({ visits: 0, items: [] });
  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 0) => {
      const anonymousId = getAnonymousId();
      if (!anonymousId && attempt < 5) {
        setTimeout(() => void load(attempt + 1), 100); // SDK initialises in the layout
        return;
      }
      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anonymousId, userId }),
        });
        if (res.ok && !cancelled) setFavourites(await res.json());
      } catch {
        /* personalisation is optional */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return favourites;
}

export default function MenuPage() {
  const { add } = useCart();
  const { user } = useUser();
  const favourites = useFavourites(user?.id ?? null);
  const usual = new Set(favourites.items);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function addToCart(item: MenuItem, from: 'menu' | 'favourites') {
    add(item.id);
    track('add_to_cart', { itemId: item.id, name: item.name, price: item.price, from });
    setJustAdded(item.id);
    setToast(`${item.name} added to your cart`);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setJustAdded(null);
      setToast(null);
    }, 1600);
  }

  const favouriteItems = favourites.items.map((id) => findMenuItem(id)!).filter(Boolean);

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <h1>Menu</h1>
          <p>Everything is cooked to order. Prices include tax.</p>
        </div>

        {favouriteItems.length > 0 && (
          <section className="welcome" aria-label="Your favourite dishes">
            <div>
              <h2>Welcome back{user ? `, ${user.name}` : ''}</h2>
              <p>Your usual picks, one tap away.</p>
            </div>
            <div className="welcome-items">
              {favouriteItems.map((item) => (
                <button key={item.id} className="usual-btn" onClick={() => addToCart(item, 'favourites')}>
                  {justAdded === item.id ? 'Added ✓' : `+ ${item.name}`} <span>{formatPrice(item.price)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <nav className="tabs" aria-label="Menu sections">
          {CATEGORIES.map((c) => (
            <a key={c.name} className="tab" href={`#${c.name.toLowerCase()}`} onClick={() => track('menu_section_clicked', { section: c.name })}>
              {c.name}
            </a>
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
                    {usual.has(item.id) && <span className="dish-tag usual">Your usual</span>}
                    {item.tag && <span className="dish-tag">{item.tag}</span>}
                  </span>
                  <span className="leader" aria-hidden />
                  <span className="dish-price">{formatPrice(item.price)}</span>
                </div>
                <p className="dish-desc">{item.description}</p>
                <button
                  className={`btn btn-primary btn-sm add-btn ${justAdded === item.id ? 'added' : ''}`}
                  onClick={() => addToCart(item, 'menu')}
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
