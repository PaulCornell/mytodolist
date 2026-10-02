import path from "path";
import { DatabaseSync } from "node:sqlite";

export interface TaskRow {
  id: number;
  text: string;
  completed: number;
  created_at: string;
}

// By default the database file lives in the project root, one level above src/.
// Set DB_PATH to override it (tests use ":memory:").
const dbPath = process.env.DB_PATH || path.join(import.meta.dirname, "..", "todos.db");
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export default db;
