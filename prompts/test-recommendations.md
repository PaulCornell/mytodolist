**Me:** What tests do you recommend running at this point, and using which testing framework?

---

**Claude:** I'd use **Node's built-in test runner (`node:test`)** together with the built-in `fetch`, and add one Playwright smoke test later.

## Why `node:test`

- **No new dependencies or config.** You're on Node 26, which already runs your `.ts` files directly. `node --test` picks up `*.test.ts` files with no extra setup.
- **It fits your project.** The project is ESM and TypeScript with no bundler. Jest is awkward in that setup. Vitest would also work well, and it's the choice if you want watch mode and nicer output, but it isn't needed yet.
- **No Supertest needed.** You can start the app on a random port and call it with `fetch`, the same way the browser does.

## What to test first: the API (highest value)

Your logic lives in the five routes, so test them over HTTP against a throwaway database:

| Route | Tests |
|---|---|
| `GET /api/tasks` | empty list at first; tasks come back in `id` order; `completed` is a real boolean |
| `POST /api/tasks` | returns 201 with `{id, text, completed: false}`; trims whitespace; returns 400 for missing, empty or whitespace-only `text` |
| `PATCH /api/tasks/:id` | toggles `completed`; updates `text`; a partial body leaves the other field unchanged; returns 404 for an unknown id |
| `DELETE /api/tasks/:id` | returns 204 and the task is gone |
| `DELETE /api/tasks/completed` | removes only completed tasks. This also checks route order: it must match before `/:id`, or `"completed"` would be treated as an id |

Writing these would surface some real gaps that need decisions:
- **PATCH skips validation.** `{"text": ""}` saves an empty task, and the text isn't trimmed. POST does both.
- **PATCH turns any value into a boolean.** `!!"false"` is `true`, so `{"completed": "false"}` marks the task done.
- **DELETE on a missing id returns 204**, not 404. That might be what you intend, but a test should pin it down either way.

## A small refactor first

`src/server.ts` currently can't be tested cleanly, for two reasons:
1. It calls `app.listen(3000)` as soon as it's imported, so tests would clash with a running dev server.
2. `src/db.ts` always opens the real `todos.db`, so tests would write into your actual data.

The fix:
- Move the app setup into `src/app.ts` and export `app` from it. `src/server.ts` would then only import `app` and call `listen`.
- Have `src/db.ts` read the database path from an environment variable, such as `DB_PATH`, falling back to `todos.db`. Tests set it to `":memory:"` for a fresh database each run.

Then add a script: `"test": "node --test"`.

## Later: one end-to-end smoke test

Use **Playwright** for one test: load the page, add a task, check it, clear completed, reload, and confirm the change persisted. That covers the browser half of the call chain we traced (form submit, `fetch`, `render`). There's little point unit-testing `client/script.ts` on its own, because almost all of it is DOM code that a real browser tests better.

## Before every commit

`npm run typecheck` and `npm test`.
