import { createHash } from 'node:crypto';
import type { DB } from './db';

export interface Project {
  id: string;
  name: string;
  publicKey: string;
  allowedOrigins: string[];
}

export interface ProjectInput extends Project {
  secretKey: string;
}

interface ProjectRow {
  id: string;
  name: string;
  public_key: string;
  allowed_origins: string;
}

// Secret keys are long random strings, so a plain SHA-256 is enough (no need for bcrypt).
export const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

const toProject = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  publicKey: row.public_key,
  allowedOrigins: JSON.parse(row.allowed_origins) as string[],
});

export function upsertProject(db: DB, p: ProjectInput): void {
  db.prepare(
    `INSERT INTO projects (id, name, public_key, secret_key_hash, allowed_origins, created_at)
     VALUES (@id, @name, @publicKey, @secretHash, @origins, @now)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       public_key = excluded.public_key,
       secret_key_hash = excluded.secret_key_hash,
       allowed_origins = excluded.allowed_origins`,
  ).run({
    id: p.id,
    name: p.name,
    publicKey: p.publicKey,
    secretHash: hashSecret(p.secretKey),
    origins: JSON.stringify(p.allowedOrigins),
    now: new Date().toISOString(),
  });
}

const SELECT = 'SELECT id, name, public_key, allowed_origins FROM projects';

export function findProjectByPublicKey(db: DB, publicKey: string): Project | null {
  const row = db.prepare(`${SELECT} WHERE public_key = ?`).get(publicKey) as ProjectRow | undefined;
  return row ? toProject(row) : null;
}

export function findProjectBySecretKey(db: DB, secretKey: string): Project | null {
  const row = db.prepare(`${SELECT} WHERE secret_key_hash = ?`).get(hashSecret(secretKey)) as ProjectRow | undefined;
  return row ? toProject(row) : null;
}
