'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INTERVAL_MS = 10_000;

/** Re-runs the dashboard's server queries every 10 seconds while switched on. */
export function LiveToggle() {
  const router = useRouter();
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => router.refresh(), INTERVAL_MS);
    return () => clearInterval(id);
  }, [on, router]);

  return (
    <button className={`live ${on ? 'on' : ''}`} onClick={() => setOn((v) => !v)} aria-pressed={on} title="Refresh the numbers every 10 seconds">
      <span className="live-dot" aria-hidden />
      {on ? 'Live · every 10s' : 'Paused'}
    </button>
  );
}
