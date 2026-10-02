import path from "path";
import { DatabaseSync } from "node:sqlite";

export interface TaskRow {
  id: number;
  text: string;
  completed: number;
  created_at: string;
}

// The database file lives in the project root, one level above src/.
const db = new DatabaseSync(path.join(import.meta.dirname, "..", "todos.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export default db;
