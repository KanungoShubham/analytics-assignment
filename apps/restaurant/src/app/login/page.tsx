'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../../lib/user';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUser();
  const [name, setName] = useState('');
  return (
    <main className="page">
      <div className="wrap">
        <form
          className="login-card"
          onSubmit={(e) => {
            e.preventDefault();
            login(name);
            router.push('/menu');
          }}
        >
          <h1 style={{ fontSize: '2rem' }}>Log in</h1>
          <p>This is a demo login: any name works. Your earlier visits on this device are linked to your account.</p>
          <div className="field">
            <label htmlFor="login-name">Your name</label>
            <input id="login-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} autoComplete="given-name" autoFocus />
          </div>
          <button className="btn btn-primary" type="submit">Log in</button>
        </form>
      </div>
    </main>
  );
}
