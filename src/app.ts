import path from "path";
import express, { type Request, type Response } from "express";
import db, { type TaskRow } from "./db.ts";

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

interface TaskBody {
  text?: string;
  completed?: boolean;
}

const app = express();

app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, "..", "public")));

function toTask(row: TaskRow): Task {
  return { id: row.id, text: row.text, completed: !!row.completed };
}

function getTask(id: number | bigint | string): TaskRow | undefined {
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
}

app.get("/api/tasks", (req: Request, res: Response) => {
  const rows = db.prepare("SELECT * FROM tasks ORDER BY id").all() as unknown as TaskRow[];
  res.json(rows.map(toTask));
});

app.post("/api/tasks", (req: Request<{}, unknown, TaskBody>, res: Response) => {
  const text = (req.body.text || "").trim();
  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }
  const result = db.prepare("INSERT INTO tasks (text) VALUES (?)").run(text);
  const row = getTask(result.lastInsertRowid)!;
  res.status(201).json(toTask(row));
});

app.patch("/api/tasks/:id", (req: Request<{ id: string }, unknown, TaskBody>, res: Response) => {
  const row = getTask(req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });

  let text = row.text;
  if (req.body.text !== undefined) {
    text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }
  }

  let completed = !!row.completed;
  if (req.body.completed !== undefined) {
    if (typeof req.body.completed !== "boolean") {
      return res.status(400).json({ error: "completed must be a boolean" });
    }
    completed = req.body.completed;
  }

  db.prepare("UPDATE tasks SET text = ?, completed = ? WHERE id = ?").run(text, completed ? 1 : 0, row.id);

  const updated = getTask(row.id)!;
  res.json(toTask(updated));
});

app.delete("/api/tasks/completed", (req: Request, res: Response) => {
  db.prepare("DELETE FROM tasks WHERE completed = 1").run();
  res.status(204).end();
});

app.delete("/api/tasks/:id", (req: Request<{ id: string }>, res: Response) => {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default app;
