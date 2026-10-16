import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <h1>Trattoria Demo</h1>
        <p className="note">Fresh pasta, wood-fired pizza and a tiramisu worth the trip.</p>
        <p><Link className="btn" href="/menu">See the menu</Link></p>
      </section>
    </main>
  );
}
