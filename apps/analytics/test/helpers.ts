import { openDb, type DB } from '../src/lib/db';
import { upsertProject } from '../src/lib/projects';

export const TEST_PROJECT = {
  id: 'demo',
  name: 'Test',
  publicKey: 'pk_test',
  secretKey: 'sk_test',
  allowedOrigins: ['http://localhost:3001'],
};

export function createTestDb(): DB {
  const db = openDb(':memory:');
  upsertProject(db, TEST_PROJECT);
  return db;
}
