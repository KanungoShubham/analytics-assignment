import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eventSchema, batchSchema } from '../src';

const valid = () => ({
  event_id: randomUUID(),
  type: 'track',
  name: 'add_to_cart',
  anonymous_id: 'anon_1',
  timestamp: '2026-10-16T10:00:00.000Z',
  properties: { item: 'Pizza' },
});

describe('eventSchema', () => {
  it('accepts a valid event', () => {
    expect(eventSchema.safeParse(valid()).success).toBe(true);
  });
  it('defaults properties to an empty object', () => {
    const { properties: _ignored, ...rest } = valid();
    const parsed = eventSchema.parse(rest);
    expect(parsed.properties).toEqual({});
  });
  it('rejects names with spaces or over 100 chars', () => {
    expect(eventSchema.safeParse({ ...valid(), name: 'add to cart' }).success).toBe(false);
    expect(eventSchema.safeParse({ ...valid(), name: 'a'.repeat(101) }).success).toBe(false);
  });
  it('requires anonymous_id or user_id', () => {
    expect(eventSchema.safeParse({ ...valid(), anonymous_id: null }).success).toBe(false);
    expect(eventSchema.safeParse({ ...valid(), anonymous_id: null, user_id: 'u1' }).success).toBe(true);
  });
  it('rejects properties larger than 8 KB', () => {
    expect(eventSchema.safeParse({ ...valid(), properties: { blob: 'x'.repeat(9000) } }).success).toBe(false);
  });
  it('rejects non-uuid event_id, bad timestamp and array properties', () => {
    expect(eventSchema.safeParse({ ...valid(), event_id: '123' }).success).toBe(false);
    expect(eventSchema.safeParse({ ...valid(), timestamp: 'yesterday' }).success).toBe(false);
    expect(eventSchema.safeParse({ ...valid(), properties: [1, 2] }).success).toBe(false);
  });
});

describe('batchSchema', () => {
  it('requires 1 to 50 events', () => {
    expect(batchSchema.safeParse({ events: [] }).success).toBe(false);
    expect(batchSchema.safeParse({ events: new Array(51).fill({}) }).success).toBe(false);
    expect(batchSchema.safeParse({ events: [{}] }).success).toBe(true);
  });
});
