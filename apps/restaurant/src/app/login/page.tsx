'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../../lib/user';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUser();
  const [name, setName] = useState('');
  return (
    <main>
      <h1>Log in</h1>
      <p className="note">Demo login: just enter a name. This calls <code>identify()</code> so later events are linked to you.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          login(name);
          router.push('/menu');
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required maxLength={50} />
        <button className="btn" type="submit">Log in</button>
      </form>
    </main>
  );
}
