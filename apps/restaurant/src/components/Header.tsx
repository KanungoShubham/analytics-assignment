'use client';
import Link from 'next/link';
import { useCart } from '../lib/cart';
import { useUser } from '../lib/user';

export function Header() {
  const { count } = useCart();
  const { user, logout } = useUser();
  return (
    <header className="site-header">
      <Link href="/" className="brand">Trattoria Demo</Link>
      <nav>
        <Link href="/menu">Menu</Link>
        <Link href="/cart">Cart ({count})</Link>
        {user ? (
          <button className="link" onClick={logout}>Log out {user.name}</button>
        ) : (
          <Link href="/login">Log in</Link>
        )}
      </nav>
    </header>
  );
}
