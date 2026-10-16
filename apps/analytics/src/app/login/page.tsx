export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <form className="card login" method="post" action="/api/login">
      <h1 style={{ margin: 0, fontSize: 20 }}>Analytics dashboard</h1>
      {error === '1' && <div className="error">Wrong password.</div>}
      {error === 'rate' && <div className="error">Too many attempts. Wait a minute.</div>}
      <label>
        Password
        <input type="password" name="password" required autoFocus style={{ width: '100%' }} />
      </label>
      <button type="submit">Sign in</button>
      <small style={{ color: 'var(--muted)' }}>Local default password: admin (set DASHBOARD_PASSWORD)</small>
    </form>
  );
}
