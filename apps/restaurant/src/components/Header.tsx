'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../lib/cart';
import { useUser } from '../lib/user';

export function Header() {
  const pathname = usePathname();
  const { count } = useCart();
  const { user, logout } = useUser();
  const [bump, setBump] = useState(false);
  const previous = useRef(count);

  // Bump the badge only when items are added, not on first render.
  useEffect(() => {
    if (count > previous.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 400);
      previous.current = count;
      return () => clearTimeout(t);
    }
    previous.current = count;
  }, [count]);

  const current = (href: string) => (pathname === href ? 'page' : undefined);

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand">
          <span className="brand-name">Trattoria</span>
          <span className="brand-sub">pasta · pizza · since this morning</span>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/menu" className="nav-link" aria-current={current('/menu')}>Menu</Link>
          {user ? (
            <span className="user-chip">
              <span className="avatar" aria-hidden>{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="hide-sm">{user.name}</span>
              <button className="link-btn" onClick={logout}>Log out</button>
            </span>
          ) : (
            <Link href="/login" className="nav-link hide-sm" aria-current={current('/login')}>Log in</Link>
          )}
          <Link href="/cart" className="cart-pill" aria-label={`Cart, ${count} items`}>
            Cart <span className={`cart-count ${bump ? 'bump' : ''}`}>{count}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
