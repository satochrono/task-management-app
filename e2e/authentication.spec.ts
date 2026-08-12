import { expect, test } from "@playwright/test";

import { signInForE2E } from "./support/auth";
import {
  e2ePrisma,
  getSeedUser,
  resetE2eDatabase,
  TaskStatus,
  UserRole,
} from "./support/database";

const OTHER_USER_ID = "40000000-0000-4000-8000-000000000001";

const OTHER_USER_EMAIL = "other-e2e-user@example.com";

async function createOtherUser() {
  return e2ePrisma.user.upsert({
    where: {
      email: OTHER_USER_EMAIL,
    },
    update: {
      id: OTHER_USER_ID,
      name: "Other E2E User",
      role: UserRole.USER,
    },
    create: {
      id: OTHER_USER_ID,
      email: OTHER_USER_EMAIL,
      name: "Other E2E User",
      passwordHash: "e2e-other-user-password-hash",
      role: UserRole.USER,
    },
  });
}

test.beforeEach(async ({ page }) => {
  await signInForE2E(page);
});

test.beforeEach(async () => {
  await resetE2eDatabase();
});

test.afterAll(async () => {
  await e2ePrisma.$disconnect();
});

test("allows a USER to access an owned task", async ({ page }) => {
  const seedUser = await getSeedUser();

  const task = await e2ePrisma.task.create({
    data: {
      title: "自分のOwnership Task",
      description: "自分が所有するTaskです。",
      status: TaskStatus.TODO,
      ownerId: seedUser.id,
    },
  });

  await page.goto(`/tasks/${task.id}`);

  await expect(
    page.getByRole("heading", {
      name: "自分のOwnership Task",
    }),
  ).toBeVisible();

  await expect(page.getByText("自分が所有するTaskです。")).toBeVisible();
});

test("does not show another user's task in the task list", async ({ page }) => {
  const seedUser = await getSeedUser();
  const otherUser = await createOtherUser();

  await e2ePrisma.task.create({
    data: {
      title: "自分の一覧Task",
      status: TaskStatus.TODO,
      ownerId: seedUser.id,
    },
  });

  await e2ePrisma.task.create({
    data: {
      title: "他人の一覧Task",
      status: TaskStatus.TODO,
      ownerId: otherUser.id,
    },
  });

  await page.goto("/tasks");

  await expect(page.getByText("自分の一覧Task")).toBeVisible();
  await expect(page.getByText("他人の一覧Task")).toHaveCount(0);
});

test("returns not found for another user's task detail page", async ({
  page,
}) => {
  const otherUser = await createOtherUser();

  const task = await e2ePrisma.task.create({
    data: {
      title: "他人の詳細Task",
      status: TaskStatus.TODO,
      ownerId: otherUser.id,
    },
  });

  await page.goto(`/tasks/${task.id}`);

  await expect(page.getByText("Taskが見つかりません")).toBeVisible();
});

test("returns not found for another user's task edit page", async ({
  page,
}) => {
  const otherUser = await createOtherUser();

  const task = await e2ePrisma.task.create({
    data: {
      title: "他人の編集Task",
      status: TaskStatus.TODO,
      ownerId: otherUser.id,
    },
  });

  await page.goto(`/tasks/${task.id}/edit`);

  await expect(page.getByText("Taskが見つかりません")).toBeVisible();
});

test("returns 404 when GET API targets another user's task", async ({
  page,
}) => {
  const otherUser = await createOtherUser();

  const task = await e2ePrisma.task.create({
    data: {
      title: "他人のAPI GET Task",
      status: TaskStatus.TODO,
      ownerId: otherUser.id,
    },
  });

  const response = await page.context().request.get(`/api/tasks/${task.id}`);

  expect(response.status()).toBe(404);
});

test("returns 404 when PUT API targets another user's task", async ({
  page,
}) => {
  const otherUser = await createOtherUser();

  const task = await e2ePrisma.task.create({
    data: {
      title: "他人のAPI PUT Task",
      status: TaskStatus.TODO,
      ownerId: otherUser.id,
    },
  });

  const response = await page.context().request.put(`/api/tasks/${task.id}`, {
    data: {
      title: "不正更新",
      description: null,
      status: "IN_PROGRESS",
      dueDate: null,
    },
  });

  expect(response.status()).toBe(404);

  const stored = await e2ePrisma.task.findUnique({
    where: {
      id: task.id,
    },
  });

  expect(stored?.title).toBe("他人のAPI PUT Task");
  expect(stored?.status).toBe(TaskStatus.TODO);
  expect(stored?.ownerId).toBe(otherUser.id);
});

test("returns 404 when DELETE API targets another user's task", async ({
  page,
}) => {
  const otherUser = await createOtherUser();

  const task = await e2ePrisma.task.create({
    data: {
      title: "他人のAPI DELETE Task",
      status: TaskStatus.TODO,
      ownerId: otherUser.id,
    },
  });

  const response = await page.context().request.delete(`/api/tasks/${task.id}`);

  expect(response.status()).toBe(404);

  const stored = await e2ePrisma.task.findUnique({
    where: {
      id: task.id,
    },
  });

  expect(stored).not.toBeNull();
  expect(stored?.ownerId).toBe(otherUser.id);
});
