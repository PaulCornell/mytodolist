**Me:** How do the tests use a fresh database each time and then delete it afterward?

---

**Claude:** Nothing is ever deleted, because the tests never create a database file. The whole database lives in memory and disappears when the process exits.

## The key piece: `":memory:"`

`src/db.ts:13–14`:
```ts
const dbPath = process.env.DB_PATH || path.join(import.meta.dirname, "..", "todos.db");
const db = new DatabaseSync(dbPath);
```

`":memory:"` is a special name in SQLite. It doesn't refer to a file. It tells SQLite to keep the whole database in the process's RAM. The `CREATE TABLE IF NOT EXISTS` on the next lines then builds an empty `tasks` table inside it. No file is written to disk.

## The lifecycle in `node:test`

```
node --test "test/**/*.test.ts"
  → starts a separate child process for api.test.ts
      → process.env.DB_PATH = ":memory:"          set first
      → await import("../src/app.ts")             app.ts imports db.ts,
                                                  which opens a new in-memory DB
      → await import("../src/db.ts")              returns the same db, cached
      → before:     app.listen(0)                 server on a random port
      → beforeEach: DELETE FROM tasks             empties the table before every test
      → tests run…
      → after:      server.close()
  → child process exits → its memory is freed → the database is gone
```

The parts that make this work:

1. **The environment variable is set before the database opens.** Static `import` statements run before any other code in the file. If `api.test.ts` imported `app.ts` statically, `db.ts` would open `todos.db` before `DB_PATH` was set. That's why the test sets the variable first and then uses `await import(...)`.

2. **The test and the app share one connection.** Each ES module runs only once and is then cached. When the test imports `db.ts` after `app.ts` has already loaded it, it gets the same `db` object the routes use, not a second database. That's what lets `beforeEach` empty the table the server is using.

3. **There are two kinds of "fresh":**
   - **Per test run:** each test file gets its own process, and so its own empty database. This comes from `":memory:"`.
   - **Per test:** within a file, all tests share that one database, so `beforeEach` runs `DELETE FROM tasks` to start each test empty. Without it, tasks from the POST tests would show up in the GET tests.

4. **Cleanup happens automatically.** The tests never call `db.close()` and don't need to. When the child process exits, the operating system frees its memory, and the database goes with it. There's no temporary file to forget about. If a test crashes partway through, nothing is left behind.

## In Playwright (if we add it)

It's the same idea, but the database lives in the server process instead of the test process:

```
playwright test
  → webServer starts: DB_PATH=:memory: PORT=3100 node src/server.ts
  → tests drive the browser against localhost:3100
      → beforeEach: delete all tasks through the API
  → at the end, Playwright stops the server → the database is gone
```

The Playwright tests run in a different process from the server, so they can't run `DELETE FROM tasks` directly. That's why they'd reset through the API instead.

## Your real data

`todos.db` is only opened when `DB_PATH` isn't set, which is how `npm start` runs. You can check this: its modified time hasn't changed through any of the test runs.
