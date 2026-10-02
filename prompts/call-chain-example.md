**Me:** Give me the complete call chain from app start.

---

**Claude:** Here's the full sequence, from `npm start` to a new task showing up on screen. It falls into five phases.

## Phase 1: Build (`npm start`)

`package.json` runs `prestart` automatically before `start`:

```
npm start
  → prestart: npm run build
      → tsc -p client           compiles client/script.ts → public/script.js
                                (outDir "../public" in client/tsconfig.json)
  → start: node src/server.ts   Node runs the .ts file directly by stripping the types
```

## Phase 2: Server startup (runs once)

```
node src/server.ts
  → ES module imports are resolved first, deepest first:
    server.ts imports app.ts, which imports db.ts, so they run in the order
    db.ts → app.ts → server.ts
  → src/db.ts runs:
      → dbPath = DB_PATH env var, or ".../todos.db"   :13  (tests set ":memory:")
      → new DatabaseSync(dbPath)                 :14  opens/creates the file
      → db.exec("CREATE TABLE IF NOT EXISTS …")  :16  makes sure the table exists
      → export default db
  → src/app.ts runs:
      → const app = express()                    :16
      → app.use(express.json())                  :18  middleware #1: parses JSON bodies
      → app.use(express.static(".../public"))    :19  middleware #2: serves files
      → app.get    ("/api/tasks", …)             :29  ┐
      → app.post   ("/api/tasks", …)             :34  │ register route handlers
      → app.patch  ("/api/tasks/:id", …)         :44  │ (they are saved here,
      → app.delete ("/api/tasks/completed", …)   :70  │  not run)
      → app.delete ("/api/tasks/:id", …)         :75  ┘
      → export default app                       :80
  → src/server.ts runs:
      → app.listen(3000, …)                      :5   starts accepting connections
          → logs "mytodolist server running at http://localhost:3000"
```

At this point the server sits idle and waits for requests.

## Phase 3: Page load (browser)

```
User opens http://localhost:3000
  → GET /             → express.static serves public/index.html
  → browser parses the HTML, sees <script src="script.js"> (index.html:32)
  → GET /script.js    → express.static serves public/script.js
  → script runs top to bottom (shown here with client/script.ts line numbers):
      → getElementById(...) for the form, input, list, etc.   :9–14
      → let tasks = []                                        :16
      → addForm.addEventListener("submit", …)                 :109  ← sets up the POST path
      → clearCompletedBtn / filterBtns listeners              :118–127
      → fetchTasks()                                          :129
          → fetch("/api/tasks")  ── GET ──► server
              → express.json() (no body, so it passes through)
              → express.static (no matching file, so it passes through)
              → app.get handler runs SELECT * FROM tasks      app.ts:29
              → res.json(rows.map(toTask))
          → tasks = await res.json()
          → render()  draws the list
```

The `<script>` tag is at the end of `<body>`, so the form and list elements already exist when `getElementById` runs.

## Phase 4: User adds a task (the POST path)

```
User types "Buy milk" and presses Enter
  → form "submit" event fires
  → listener runs                                   client/script.ts:109
      → e.preventDefault()        stops the browser's normal form submit/page reload
      → text = taskInput.value.trim()
      → addTask("Buy milk")                         :113
          → fetch("/api/tasks", { method: "POST",   :26
                 headers: Content-Type: application/json,
                 body: '{"text":"Buy milk"}' })
              ── network ──►
```

## Phase 5: Server handles the POST

```
Express gets POST /api/tasks and runs its middleware/routes in registration order:
  → express.json()                  sees the JSON content type and parses the body
                                    → req.body = { text: "Buy milk" }
  → express.static                  POST isn't GET/HEAD, so it passes through
  → app.get "/api/tasks"            method doesn't match, so it's skipped
  → app.post "/api/tasks"           matches → your handler runs   app.ts:34
      → text = "Buy milk"           passes the empty-text check
      → db.prepare("INSERT …").run(text)   → SQLite assigns an id; completed defaults to 0
      → getTask(lastInsertRowid)    → SELECT the new row back      :25
      → toTask(row)                 → { id, text, completed: false } :21
      → res.status(201).json(...)
              ◄── network ──
  back in addTask (client):
      → task = await res.json()
      → tasks.push(task)
      → render()                    the new task appears in the list
  back in the submit listener:
      → taskInput.value = ""; taskInput.focus()
```

`addTask(text)` at `:113` isn't awaited. The input is cleared right after the request is sent, before the server answers, so `render()` runs a moment after the field empties.
