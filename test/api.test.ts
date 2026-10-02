import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

// Use a throwaway in-memory database. This must be set before src/db.ts is
// loaded, so the app is imported dynamically below rather than with a static
// import (static imports run before any code in this file).
process.env.DB_PATH = ":memory:";
const { default: app } = await import("../src/app.ts");
const { default: db } = await import("../src/db.ts");

let server: Server;
let baseUrl: string;

before(async () => {
  // Port 0 lets the OS pick a free port, so tests never clash with `npm start`.
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

beforeEach(() => {
  db.exec("DELETE FROM tasks");
});

function request(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(baseUrl + path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function createTask(text: string): Promise<{ id: number; text: string; completed: boolean }> {
  const res = await request("POST", "/api/tasks", { text });
  assert.equal(res.status, 201);
  return res.json();
}

async function listTasks(): Promise<unknown[]> {
  const res = await request("GET", "/api/tasks");
  assert.equal(res.status, 200);
  return res.json();
}

describe("GET /api/tasks", () => {
  test("returns an empty list when there are no tasks", async () => {
    assert.deepEqual(await listTasks(), []);
  });

  test("returns tasks in creation order with boolean completed", async () => {
    const a = await createTask("first");
    const b = await createTask("second");
    assert.deepEqual(await listTasks(), [
      { id: a.id, text: "first", completed: false },
      { id: b.id, text: "second", completed: false },
    ]);
  });
});

describe("POST /api/tasks", () => {
  test("creates a task and returns 201 with the new task", async () => {
    const res = await request("POST", "/api/tasks", { text: "Buy milk" });
    assert.equal(res.status, 201);
    const task = await res.json();
    assert.equal(typeof task.id, "number");
    assert.deepEqual(task, { id: task.id, text: "Buy milk", completed: false });
    assert.deepEqual(await listTasks(), [task]);
  });

  test("trims surrounding whitespace from text", async () => {
    const task = await createTask("  Buy milk  ");
    assert.equal(task.text, "Buy milk");
  });

  for (const [name, body] of [
    ["missing text", {}],
    ["empty text", { text: "" }],
    ["whitespace-only text", { text: "   " }],
  ] as const) {
    test(`returns 400 for ${name}`, async () => {
      const res = await request("POST", "/api/tasks", body);
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: "text is required" });
      assert.deepEqual(await listTasks(), []);
    });
  }
});

describe("PATCH /api/tasks/:id", () => {
  test("marks a task completed and back again", async () => {
    const task = await createTask("Buy milk");

    let res = await request("PATCH", `/api/tasks/${task.id}`, { completed: true });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ...task, completed: true });

    res = await request("PATCH", `/api/tasks/${task.id}`, { completed: false });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ...task, completed: false });
  });

  test("updates text without changing completed", async () => {
    const task = await createTask("Buy milk");
    await request("PATCH", `/api/tasks/${task.id}`, { completed: true });

    const res = await request("PATCH", `/api/tasks/${task.id}`, { text: "Buy oat milk" });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { id: task.id, text: "Buy oat milk", completed: true });
  });

  test("leaves the task unchanged when the body is empty", async () => {
    const task = await createTask("Buy milk");
    const res = await request("PATCH", `/api/tasks/${task.id}`, {});
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), task);
  });

  test("returns 404 for an unknown id", async () => {
    const res = await request("PATCH", "/api/tasks/9999", { completed: true });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "not found" });
  });

  test("trims surrounding whitespace from text", async () => {
    const task = await createTask("Buy milk");
    const res = await request("PATCH", `/api/tasks/${task.id}`, { text: "  Buy oat milk  " });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).text, "Buy oat milk");
  });

  for (const [name, body] of [
    ["empty text", { text: "" }],
    ["whitespace-only text", { text: "   " }],
    ["non-string text", { text: 123 }],
  ] as const) {
    test(`returns 400 for ${name} and leaves the task unchanged`, async () => {
      const task = await createTask("Buy milk");
      const res = await request("PATCH", `/api/tasks/${task.id}`, body);
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: "text is required" });
      assert.deepEqual(await listTasks(), [task]);
    });
  }

  for (const [name, body] of [
    ['the string "false"', { completed: "false" }],
    ["a number", { completed: 1 }],
    ["null", { completed: null }],
  ] as const) {
    test(`returns 400 when completed is ${name} and leaves the task unchanged`, async () => {
      const task = await createTask("Buy milk");
      const res = await request("PATCH", `/api/tasks/${task.id}`, body);
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: "completed must be a boolean" });
      assert.deepEqual(await listTasks(), [task]);
    });
  }
});

describe("DELETE /api/tasks/:id", () => {
  test("deletes the task and returns 204", async () => {
    const keep = await createTask("keep");
    const remove = await createTask("remove");

    const res = await request("DELETE", `/api/tasks/${remove.id}`);
    assert.equal(res.status, 204);
    assert.deepEqual(await listTasks(), [keep]);
  });
});

describe("DELETE /api/tasks/completed", () => {
  test("deletes only completed tasks", async () => {
    const active = await createTask("active");
    const done = await createTask("done");
    await request("PATCH", `/api/tasks/${done.id}`, { completed: true });

    const res = await request("DELETE", "/api/tasks/completed");
    assert.equal(res.status, 204);
    assert.deepEqual(await listTasks(), [active]);
  });
});
