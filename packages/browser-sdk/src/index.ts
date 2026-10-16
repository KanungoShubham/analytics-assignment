import { AnalyticsClient, type BrowserConfig } from './client';

export { AnalyticsClient };
export type { BrowserConfig };

let client: AnalyticsClient | null = null;
let debug = false;

/** Every public function goes through here so the SDK can never break the host page. */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (err) {
    if (debug) console.warn('[acme-analytics] internal error', err);
    return fallback;
  }
}

export function init(config: BrowserConfig): void {
  safe(() => {
    if (typeof window === 'undefined' || client) return; // no-op during SSR or when already initialised
    debug = !!config.debug;
    client = new AnalyticsClient(config);
    client.start();
  }, undefined);
}

export const track = (name: string, properties?: Record<string, unknown>) => safe(() => client?.track(name, properties), undefined);
export const page = (properties?: Record<string, unknown>) => safe(() => client?.page(properties), undefined);
export const identify = (userId: string, traits?: Record<string, unknown>) => safe(() => client?.identify(userId, traits), undefined);
export const reset = () => safe(() => client?.reset(), undefined);
export const optOut = () => safe(() => client?.optOut(), undefined);
export const optIn = () => safe(() => client?.optIn(), undefined);
export const getAnonymousId = (): string | null => safe(() => client?.getAnonymousId() ?? null, null);
export const flush = (): Promise<void> =>
  safe(() => (client ? client.flush().catch(() => undefined) : Promise.resolve()), Promise.resolve());

/** Test helper. */
export function __resetForTests(): void {
  client?.stop();
  client = null;
}
