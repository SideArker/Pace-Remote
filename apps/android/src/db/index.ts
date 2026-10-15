import * as SQLite from 'expo-sqlite';
import type { Project, Snapshot } from '@pace-remote/protocol';

let opened: Promise<SQLite.SQLiteDatabase> | undefined;
async function database() {
  if (!opened) opened = SQLite.openDatabaseAsync('pace-remote.db').then(async db => {
    await db.execAsync(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, payload TEXT NOT NULL, cursor TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS sessions_project_updated ON sessions(project_id, updated_at DESC);
      CREATE TABLE IF NOT EXISTS drafts (project_id TEXT NOT NULL, session_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(project_id, session_id));
      PRAGMA user_version=1;`);
    return db;
  });
  return opened;
}
export async function saveProjects(items: Project[]) {
  const db = await database();
  await db.withExclusiveTransactionAsync(async tx => {
    for (const item of items) await tx.runAsync('INSERT OR REPLACE INTO projects(id,payload,updated_at) VALUES(?,?,?)', item.id, JSON.stringify(item), new Date().toISOString());
  });
}
export async function readProjects(): Promise<Project[]> {
  const db = await database();
  return (await db.getAllAsync<{ payload: string }>('SELECT payload FROM projects ORDER BY updated_at DESC')).map(row => JSON.parse(row.payload) as Project);
}
export async function saveSnapshot(projectId: string, snapshot: Snapshot) {
  const db = await database();
  await db.runAsync('INSERT OR REPLACE INTO sessions(id,project_id,payload,cursor,updated_at) VALUES(?,?,?,?,?)', snapshot.session.id, projectId, JSON.stringify(snapshot), snapshot.cursor, new Date().toISOString());
}
export async function readSnapshot(projectId: string, sessionId: string): Promise<Snapshot | undefined> {
  const db = await database();
  const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM sessions WHERE project_id=? AND id=?', projectId, sessionId);
  return row ? JSON.parse(row.payload) as Snapshot : undefined;
}
export async function saveDraft(projectId: string, sessionId: string, draft: string) {
  const db = await database();
  await db.runAsync('INSERT OR REPLACE INTO drafts(project_id,session_id,payload,updated_at) VALUES(?,?,?,?)', projectId, sessionId, JSON.stringify({ version: 1, text: draft }), new Date().toISOString());
}
export async function readDraft(projectId: string, sessionId: string): Promise<string> {
  const db = await database();
  const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM drafts WHERE project_id=? AND session_id=?', projectId, sessionId);
  if (!row) return '';
  const value = JSON.parse(row.payload) as { version: number; text?: unknown };
  return value.version === 1 && typeof value.text === 'string' ? value.text : '';
}
