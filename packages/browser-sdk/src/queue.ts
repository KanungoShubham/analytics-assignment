import type { AnalyticsEvent } from '@acme/shared';
import { storage } from './storage';

/** FIFO queue mirrored to storage so events survive reloads and offline periods. */
export class PersistentQueue {
  private items: AnalyticsEvent[];

  constructor(private readonly key: string, private readonly max = 500) {
    this.items = this.load();
  }

  private load(): AnalyticsEvent[] {
    try {
      const parsed = JSON.parse(storage.get(this.key) ?? '[]');
      return Array.isArray(parsed) ? parsed.slice(-this.max) : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    storage.set(this.key, JSON.stringify(this.items));
  }

  push(event: AnalyticsEvent): void {
    this.items.push(event);
    if (this.items.length > this.max) this.items.splice(0, this.items.length - this.max); // drop oldest
    this.save();
  }

  peek(n: number): AnalyticsEvent[] {
    return this.items.slice(0, n);
  }

  remove(eventIds: string[]): void {
    const ids = new Set(eventIds);
    this.items = this.items.filter((e) => !ids.has(e.event_id));
    this.save();
  }

  clear(): void {
    this.items = [];
    this.save();
  }

  get size(): number {
    return this.items.length;
  }
}
