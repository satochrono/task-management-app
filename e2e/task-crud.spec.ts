import { expect, test } from "@playwright/test";

import { e2ePrisma, resetE2eDatabase, TaskStatus } from "./support/database";

test.beforeEach(async () => {
  await resetE2eDatabase();
});

test.afterAll(async () => {
  await e2ePrisma.$disconnect();
});

test("shows an empty task list", async ({ page }) => {
  await page.goto("/tasks");

  await expect(
    page.getByRole("heading", {
      name: "Task一覧",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "削除",
    }),
  ).toHaveCount(0);
});

test("creates a task from the UI", async ({ page }) => {
  await page.goto("/tasks/new");

  await page.getByLabel("タイトル").fill("Playwright新規Task");

  await page.getByLabel("説明").fill("E2Eテストで登録したTaskです。");

  await page.getByLabel("状態").selectOption("TODO");

  await page
    .getByRole("button", {
      name: "登録",
    })
    .click();

  await expect(page).toHaveURL(/\/tasks\?success=created$/);

  await expect(page.getByText("Playwright新規Task")).toBeVisible();

  const savedTask = await e2ePrisma.task.findFirst({
    where: {
      title: "Playwright新規Task",
    },
  });

  expect(savedTask).not.toBeNull();

  expect(savedTask?.status).toBe(TaskStatus.TODO);
});

test("shows task detail", async ({ page }) => {
  const task = await e2ePrisma.task.create({
    data: {
      title: "詳細確認Task",
      description: "Playwright詳細確認",
      status: TaskStatus.TODO,
    },
  });

  await page.goto(`/tasks/${task.id}`);

  await expect(page.getByText("詳細確認Task")).toBeVisible();

  await expect(page.getByText("Playwright詳細確認")).toBeVisible();
});

test("updates a task from the UI", async ({ page }) => {
  const task = await e2ePrisma.task.create({
    data: {
      title: "更新前Task",
      description: null,
      status: TaskStatus.TODO,
    },
  });

  await page.goto(`/tasks/${task.id}/edit`);

  await page.getByLabel("タイトル").fill("更新後Task");

  await page.getByLabel("状態").selectOption("IN_PROGRESS");

  await page
    .getByRole("button", {
      name: "更新",
    })
    .click();

  await expect(page).toHaveURL(
    new RegExp(`/tasks/${task.id}\\?success=updated$`),
  );

  await expect(page.getByText("更新後Task")).toBeVisible();

  const updatedTask = await e2ePrisma.task.findUnique({
    where: {
      id: task.id,
    },
  });

  expect(updatedTask?.status).toBe(TaskStatus.IN_PROGRESS);
});

test("prevents DONE task from directly selecting TODO", async ({ page }) => {
  const task = await e2ePrisma.task.create({
    data: {
      title: "完了済みTask",
      status: TaskStatus.DONE,
    },
  });

  await page.goto(`/tasks/${task.id}/edit`);

  const todoOption = page.getByRole("option", {
    name: "未着手",
  });

  await expect(todoOption).toBeDisabled();

  await expect(page.getByLabel("状態")).toHaveValue("DONE");
});

test("deletes a task from the UI", async ({ page }) => {
  const task = await e2ePrisma.task.create({
    data: {
      title: "削除対象Task",
      status: TaskStatus.TODO,
    },
  });

  await page.goto(`/tasks/${task.id}`);

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });

  await page
    .getByRole("button", {
      name: "削除",
    })
    .click();

  await expect(page).toHaveURL(/\/tasks\?success=deleted$/);

  await expect(page.getByText("削除対象Task")).toHaveCount(0);

  const deletedTask = await e2ePrisma.task.findUnique({
    where: {
      id: task.id,
    },
  });

  expect(deletedTask).toBeNull();
});

test("shows not found for a missing task", async ({ page }) => {
  const missingId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  await page.goto(`/tasks/${missingId}`);

  await expect(page.getByText("Taskが見つかりません")).toBeVisible();
});
