**Me:** When/how is @playwright.config.ts invoked?

---

**Claude:** It's never invoked directly. `playwright.config.ts` is a module that the Playwright test command loads. The file itself only exports an object, and `playwright test` reads that object to decide what to do.

## When it runs

Only when you start Playwright's test runner:

```
npm run test:e2e        → runs "playwright test" (package.json script)
npx playwright test     → same thing, run directly
```

`npm test` doesn't load it, because that runs `node --test`, a separate runner that knows nothing about Playwright.

## How Playwright finds it

When `playwright test` starts, it looks in the current folder for a file named `playwright.config` with any of these extensions: `.ts`, `.js`, `.mts`, `.mjs`, `.cts` or `.cjs`. You never point to it, because the name follows the convention. To use a different file, pass `--config` (or `-c`):

```
npx playwright test --config=other.config.ts
```

Playwright compiles the TypeScript itself, so this doesn't depend on Node's type stripping or on `tsc`.

## What happens to it

```ts
export default defineConfig({ ... });
```

`defineConfig` doesn't do anything at runtime. It returns the object you pass in, unchanged. It's there so your editor can type-check and autocomplete the options. Playwright imports the module and reads its `default` export, much like `server.ts` imports `app` from `app.ts`.

## Sequence

```
npx playwright test
  → finds and loads playwright.config.ts        the code at the top of the file runs here
      → PORT = 3100; process.env.CI is read
  → collects test files from testDir: "e2e"     → e2e/todo.spec.ts
  → webServer: runs the command with env, polls url until it responds
  → starts worker processes (workers: 1)
      → each worker loads the config again, then runs the spec files
      → each test gets fixtures (page, request) built from use: { baseURL, trace, … }
  → stops the web server, prints the report (reporter: "list")
```

The config file can run more than once, in the main process and again in each worker. Keep it to plain settings with no side effects. Don't start servers or write files in it; that's what `webServer` and `globalSetup` are for.

## Other tools that load it

- **The Playwright VS Code extension** reads the same file to list and run tests from the editor's Testing panel.
- **`npx playwright show-report`** and **`npx playwright test --ui`** also start from this config.
