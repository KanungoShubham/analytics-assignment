import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';
import { upsertProject } from './projects';

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  public_key      TEXT NOT NULL UNIQUE,
  secret_key_hash TEXT NOT NULL UNIQUE,
  allowed_origins TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id     TEXT NOT NULL,
  project_id   TEXT NOT NULL REFERENCES projects(id),
  type         TEXT NOT NULL,
  name         TEXT NOT NULL,
  source       TEXT NOT NULL,
  anonymous_id TEXT,
  user_id      TEXT,
  session_id   TEXT,
  url          TEXT,
  title        TEXT,
  referrer     TEXT,
  user_agent   TEXT,
  properties   TEXT NOT NULL DEFAULT '{}',
  occurred_at  TEXT NOT NULL,
  received_at  TEXT NOT NULL,
  UNIQUE (project_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_events_project_time ON events (project_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_project_name_time ON events (project_id, name, occurred_at);
`;

export function openDb(file: string): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA);
  return db;
}

// Cached on globalThis so Next.js hot reloads reuse one connection.
const globalForDb = globalThis as unknown as { __analyticsDb?: DB };

export function getDb(): DB {
  if (!globalForDb.__analyticsDb) {
    const db = openDb(config.dbPath);
    upsertProject(db, config.demoProject);
    globalForDb.__analyticsDb = db;
  }
  return globalForDb.__analyticsDb;
}

export function setDb(db?: DB): void {
  globalForDb.__analyticsDb = db;
}
