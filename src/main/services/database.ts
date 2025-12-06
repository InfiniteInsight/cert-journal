import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import type { Template, CreateTemplateInput, UpdateTemplateInput } from '../../shared/types';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'cert-journal.db');

  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      requestor TEXT,
      location TEXT,
      distribution_group TEXT,
      notes TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
    CREATE INDEX IF NOT EXISTS idx_templates_is_default ON templates(is_default);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submission_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cn TEXT NOT NULL,
      page_title TEXT NOT NULL,
      template_id INTEGER,
      submitted_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (template_id) REFERENCES templates(id)
    );
  `);
}

// Template CRUD operations
export function getAllTemplates(): Template[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, name, description, requestor, location,
           distribution_group as distributionGroup, notes,
           is_default as isDefault, created_at as createdAt,
           updated_at as updatedAt
    FROM templates
    ORDER BY name
  `).all() as Template[];

  return rows.map((row) => ({
    ...row,
    isDefault: Boolean(row.isDefault),
  }));
}

export function getTemplateById(id: number): Template | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT id, name, description, requestor, location,
           distribution_group as distributionGroup, notes,
           is_default as isDefault, created_at as createdAt,
           updated_at as updatedAt
    FROM templates
    WHERE id = ?
  `).get(id) as Template | undefined;

  if (!row) return null;

  return {
    ...row,
    isDefault: Boolean(row.isDefault),
  };
}

export function createTemplate(input: CreateTemplateInput): Template {
  const db = getDatabase();

  // If this template is set as default, unset other defaults
  if (input.isDefault) {
    db.prepare('UPDATE templates SET is_default = 0').run();
  }

  const result = db.prepare(`
    INSERT INTO templates (name, description, requestor, location, distribution_group, notes, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.name,
    input.description || null,
    input.requestor || null,
    input.location || null,
    input.distributionGroup || null,
    input.notes || null,
    input.isDefault ? 1 : 0
  );

  return getTemplateById(result.lastInsertRowid as number)!;
}

export function updateTemplate(input: UpdateTemplateInput): Template | null {
  const db = getDatabase();
  const existing = getTemplateById(input.id);

  if (!existing) return null;

  // If this template is being set as default, unset other defaults
  if (input.isDefault) {
    db.prepare('UPDATE templates SET is_default = 0').run();
  }

  db.prepare(`
    UPDATE templates
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        requestor = COALESCE(?, requestor),
        location = COALESCE(?, location),
        distribution_group = COALESCE(?, distribution_group),
        notes = COALESCE(?, notes),
        is_default = COALESCE(?, is_default),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    input.name,
    input.description,
    input.requestor,
    input.location,
    input.distributionGroup,
    input.notes,
    input.isDefault !== undefined ? (input.isDefault ? 1 : 0) : null,
    input.id
  );

  return getTemplateById(input.id);
}

export function deleteTemplate(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  return result.changes > 0;
}

export function setDefaultTemplate(id: number): boolean {
  const db = getDatabase();

  // First, unset all defaults
  db.prepare('UPDATE templates SET is_default = 0').run();

  // Set the new default
  const result = db.prepare('UPDATE templates SET is_default = 1 WHERE id = ?').run(id);
  return result.changes > 0;
}

// Settings operations
export function getSetting(key: string): string | null {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value || null;
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `).run(key, value, value);
}

export function deleteSetting(key: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  return result.changes > 0;
}

// Submission history
export function recordSubmission(cn: string, pageTitle: string, templateId?: number): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO submission_history (cn, page_title, template_id)
    VALUES (?, ?, ?)
  `).run(cn, pageTitle, templateId || null);
}
