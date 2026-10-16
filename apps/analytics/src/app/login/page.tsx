export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login-wrap">
      <form className="login" method="post" action="/api/login">
        <span className="logo-mark" style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center' }} aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
        </span>
        <h1>Sign in to analytics</h1>
        <p>See traffic, visitors and orders for the Trattoria demo.</p>
        {error === '1' && <div className="alert" role="alert">That password is not correct. Try again.</div>}
        {error === 'rate' && <div className="alert" role="alert">Too many attempts. Wait a minute, then try again.</div>}
        <label htmlFor="password">Password</label>
        <input id="password" type="password" name="password" required autoFocus autoComplete="current-password" />
        <button className="btn" type="submit">Sign in</button>
        <div className="hint">Local demo password: admin. Change it with DASHBOARD_PASSWORD.</div>
      </form>
    </main>
  );
}
