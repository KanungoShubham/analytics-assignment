import { describe, it, expect } from 'vitest';
import { createTestDb, TEST_PROJECT } from './helpers';
import { findProjectByPublicKey, findProjectBySecretKey, upsertProject } from '../src/lib/projects';

describe('projects', () => {
  it('finds a project by public key', () => {
    const db = createTestDb();
    expect(findProjectByPublicKey(db, 'pk_test')).toEqual({
      id: 'demo', name: 'Test', publicKey: 'pk_test', allowedOrigins: ['http://localhost:3001'],
    });
    expect(findProjectByPublicKey(db, 'nope')).toBeNull();
  });
  it('finds a project by secret key and stores only its hash', () => {
    const db = createTestDb();
    expect(findProjectBySecretKey(db, 'sk_test')?.id).toBe('demo');
    expect(findProjectBySecretKey(db, 'pk_test')).toBeNull();
    const row = db.prepare('SELECT secret_key_hash FROM projects').get() as { secret_key_hash: string };
    expect(row.secret_key_hash).not.toContain('sk_test');
    expect(row.secret_key_hash).toHaveLength(64);
  });
  it('upsert is repeatable and updates fields', () => {
    const db = createTestDb();
    upsertProject(db, { ...TEST_PROJECT, allowedOrigins: ['https://shop.example'] });
    expect(findProjectByPublicKey(db, 'pk_test')?.allowedOrigins).toEqual(['https://shop.example']);
  });
});
