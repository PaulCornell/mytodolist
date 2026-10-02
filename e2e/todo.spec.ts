import { test, expect, type Page } from "@playwright/test";

// Every test shares one server and in-memory database, and there's no reset
// endpoint, so delete all tasks through the API before each test.
test.beforeEach(async ({ request, page }) => {
  const res = await request.get("/api/tasks");
  for (const task of (await res.json()) as { id: number }[]) {
    await request.delete(`/api/tasks/${task.id}`);
  }
  await page.goto("/");
});

async function addTask(page: Page, text: string): Promise<void> {
  await page.getByPlaceholder("What needs doing?").fill(text);
  await page.getByPlaceholder("What needs doing?").press("Enter");
  await expect(taskItem(page, text)).toBeVisible();
}

function taskItem(page: Page, text: string) {
  return page.getByRole("listitem").filter({ hasText: text });
}

test("adds a task and keeps it after a reload", async ({ page }) => {
  await expect(page.getByText("No tasks yet. Add one above!")).toBeVisible();

  await addTask(page, "Buy milk");

  await expect(page.getByText("1 item left")).toBeVisible();
  const input = page.getByPlaceholder("What needs doing?");
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();

  await page.reload();
  await expect(taskItem(page, "Buy milk")).toBeVisible();
});

test("completes, filters, and clears completed tasks", async ({ page }) => {
  await addTask(page, "Buy milk");
  await addTask(page, "Walk dog");
  await expect(page.getByText("2 items left")).toBeVisible();

  await taskItem(page, "Buy milk").getByRole("checkbox").check();
  await expect(taskItem(page, "Buy milk")).toHaveClass(/completed/);
  await expect(page.getByText("1 item left")).toBeVisible();

  await page.getByRole("button", { name: "Active" }).click();
  await expect(page.getByRole("listitem")).toHaveText(["Walk dog✕"]);

  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.getByRole("listitem")).toHaveText(["Buy milk✕"]);

  await page.getByRole("button", { name: "All" }).click();
  await page.getByRole("button", { name: "Clear completed" }).click();
  await expect(taskItem(page, "Buy milk")).toHaveCount(0);

  await page.reload();
  await expect(taskItem(page, "Walk dog")).toBeVisible();
  await expect(taskItem(page, "Buy milk")).toHaveCount(0);
});

test("deletes a task", async ({ page }) => {
  await addTask(page, "Buy milk");
  await addTask(page, "Walk dog");

  await taskItem(page, "Buy milk").getByRole("button", { name: "Delete task" }).click();
  await expect(taskItem(page, "Buy milk")).toHaveCount(0);
  await expect(taskItem(page, "Walk dog")).toBeVisible();

  await page.reload();
  await expect(taskItem(page, "Buy milk")).toHaveCount(0);
  await expect(taskItem(page, "Walk dog")).toBeVisible();
});

test("ignores blank input and shows empty states", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST") posts.push(req.url());
  });

  const input = page.getByPlaceholder("What needs doing?");
  await input.press("Enter");
  await input.fill("   ");
  await input.press("Enter");

  expect(posts).toEqual([]);
  await expect(page.getByText("No tasks yet. Add one above!")).toBeVisible();

  await addTask(page, "Buy milk");
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.getByText("Nothing to show here.")).toBeVisible();
});
