import Link from 'next/link';
import { findMenuItem, formatPrice } from '../lib/menu';

const SPECIALS = ['margherita', 'carbonara', 'tiramisu'].map((id) => findMenuItem(id)!);

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="wrap">
          <div>
            <h1>Pasta made this morning, pizza from the wood oven.</h1>
            <p className="hero-lead">
              A small Italian kitchen with a short menu. Pick your dishes, place the order, and we start cooking.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/menu">Browse the menu</Link>
              <Link className="btn btn-ghost" href="/login">Log in to order faster</Link>
            </div>
            <div className="hero-facts">
              <span><strong>7</strong>dishes, all made here</span>
              <span><strong>20 min</strong>average cooking time</span>
              <span><strong>$6.50</strong>dishes from</span>
            </div>
          </div>

          <div className="chalkboard">
            <h2>Today in the kitchen</h2>
            <p className="note">Chef&apos;s picks, written up at 9 this morning</p>
            {SPECIALS.map((dish) => (
              <div key={dish.id}>
                <div className="special">
                  <span className="special-name">{dish.name}</span>
                  <span className="leader" aria-hidden />
                  <span className="special-price">{formatPrice(dish.price)}</span>
                </div>
                <div className="special-desc">{dish.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>How ordering works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h3>Choose your dishes</h3>
              <p>Add anything from the menu. Your cart is saved on this device.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>Place the order</h3>
              <p>Enter the name for the order. Prices are checked by our kitchen system.</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>We start cooking</h3>
              <p>You get an order number straight away. Most dishes are ready in 20 minutes.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
