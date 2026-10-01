const path = require("path");
const express = require("express");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function toTask(row) {
  return { id: row.id, text: row.text, completed: !!row.completed };
}

app.get("/api/tasks", (req, res) => {
  const rows = db.prepare("SELECT * FROM tasks ORDER BY id").all();
  res.json(rows.map(toTask));
});

app.post("/api/tasks", (req, res) => {
  const text = (req.body.text || "").trim();
  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }
  const result = db.prepare("INSERT INTO tasks (text) VALUES (?)").run(text);
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(toTask(row));
});

app.patch("/api/tasks/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });

  const completed = req.body.completed !== undefined ? !!req.body.completed : !!row.completed;
  const text = req.body.text !== undefined ? req.body.text : row.text;
  db.prepare("UPDATE tasks SET text = ?, completed = ? WHERE id = ?").run(text, completed ? 1 : 0, row.id);

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(row.id);
  res.json(toTask(updated));
});

app.delete("/api/tasks/completed", (req, res) => {
  db.prepare("DELETE FROM tasks WHERE completed = 1").run();
  res.status(204).end();
});

app.delete("/api/tasks/:id", (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.status(204).end();
});


app.listen(PORT, () => {
  console.log(`mytodolist server running at http://localhost:${PORT}`);
});
