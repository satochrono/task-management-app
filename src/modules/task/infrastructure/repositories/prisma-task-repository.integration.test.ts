import { beforeEach, describe, expect, it } from "vitest";

import { TaskNotFoundError } from "@/modules/task/domain/errors/task-not-found-error";
import type { TaskAccessScope } from "@/modules/task/domain/task-access-scope";
import { PrismaTaskRepository } from "@/modules/task/infrastructure/repositories/prisma-task-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

const USER_A_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const USER_B_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

const USER_A_EMAIL = "repository-user-a@example.com";
const USER_B_EMAIL = "repository-user-b@example.com";

const userAScope: TaskAccessScope = {
  kind: "OWNER",
  ownerId: USER_A_ID,
};

const adminScope: TaskAccessScope = {
  kind: "ALL",
};

describe("PrismaTaskRepository", () => {
  const repository = new PrismaTaskRepository(prisma);

  beforeEach(async () => {
    await prisma.task.deleteMany();

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [USER_A_EMAIL, USER_B_EMAIL],
        },
      },
    });

    await prisma.user.createMany({
      data: [
        {
          id: USER_A_ID,
          email: USER_A_EMAIL,
          name: "Repository User A",
          passwordHash: "integration-test-password-hash",
          role: "USER",
        },
        {
          id: USER_B_ID,
          email: USER_B_EMAIL,
          name: "Repository User B",
          passwordHash: "integration-test-password-hash",
          role: "USER",
        },
      ],
    });
  });

  it("creates and reads an owned task", async () => {
    const created = await repository.create(USER_A_ID, {
      title: "Integration task",
      description: "Repository integration test",
      status: "TODO",
      dueDate: null,
    });

    const found = await repository.findById(created.id, userAScope);

    expect(found).not.toBeNull();

    expect(found).toMatchObject({
      id: created.id,
      title: "Integration task",
      description: "Repository integration test",
      status: "TODO",
      dueDate: null,
      ownerId: USER_A_ID,
    });
  });

  it("assigns the supplied owner when creating a task", async () => {
    const created = await repository.create(USER_B_ID, {
      title: "User B task",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    expect(created.ownerId).toBe(USER_B_ID);

    const stored = await prisma.task.findUnique({
      where: {
        id: created.id,
      },
      select: {
        ownerId: true,
      },
    });

    expect(stored?.ownerId).toBe(USER_B_ID);
  });

  it("returns null for a missing task", async () => {
    const task = await repository.findById(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      userAScope,
    );

    expect(task).toBeNull();
  });

  it("does not return another user's task for an owner scope", async () => {
    const created = await repository.create(USER_B_ID, {
      title: "User B private task",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    const found = await repository.findById(created.id, userAScope);

    expect(found).toBeNull();
  });

  it("allows an ALL scope to read another user's task", async () => {
    const created = await repository.create(USER_B_ID, {
      title: "User B task",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    const found = await repository.findById(created.id, adminScope);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.ownerId).toBe(USER_B_ID);
  });

  it("returns only owned tasks for an owner scope", async () => {
    await repository.create(USER_A_ID, {
      title: "User A task",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    await repository.create(USER_B_ID, {
      title: "User B task",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    const tasks = await repository.findAll(userAScope);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.title).toBe("User A task");
    expect(tasks[0]?.ownerId).toBe(USER_A_ID);
  });

  it("returns all tasks in descending createdAt order for an ALL scope", async () => {
    await prisma.task.create({
      data: {
        id: "10000000-0000-4000-8000-000000000001",
        title: "Older",
        status: "TODO",
        ownerId: USER_A_ID,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    });

    await prisma.task.create({
      data: {
        id: "10000000-0000-4000-8000-000000000002",
        title: "Newer",
        status: "TODO",
        ownerId: USER_B_ID,
        createdAt: new Date("2026-08-02T00:00:00.000Z"),
      },
    });

    const tasks = await repository.findAll(adminScope);

    expect(tasks.map((task) => task.title)).toEqual(["Newer", "Older"]);
  });

  it("updates an owned task", async () => {
    const created = await repository.create(USER_A_ID, {
      title: "Before update",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    const updated = await repository.update(created.id, userAScope, {
      title: "After update",
      description: "Updated description",
      status: "IN_PROGRESS",
      dueDate: new Date("2026-09-01T00:00:00.000Z"),
    });

    expect(updated).toMatchObject({
      id: created.id,
      title: "After update",
      description: "Updated description",
      status: "IN_PROGRESS",
      ownerId: USER_A_ID,
    });

    expect(updated.dueDate?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("throws TaskNotFoundError when updating a missing task", async () => {
    await expect(
      repository.update("cccccccc-cccc-4ccc-8ccc-cccccccccccc", userAScope, {
        title: "Missing",
        description: null,
        status: "TODO",
        dueDate: null,
      }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("throws TaskNotFoundError when updating another user's task", async () => {
    const created = await repository.create(USER_B_ID, {
      title: "User B task",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    await expect(
      repository.update(created.id, userAScope, {
        title: "Unauthorized update",
        description: null,
        status: "IN_PROGRESS",
        dueDate: null,
      }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);

    const stored = await prisma.task.findUnique({
      where: {
        id: created.id,
      },
    });

    expect(stored?.title).toBe("User B task");
  });

  it("allows an ALL scope to update another user's task", async () => {
    const created = await repository.create(USER_B_ID, {
      title: "Before admin update",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    const updated = await repository.update(created.id, adminScope, {
      title: "After admin update",
      description: null,
      status: "IN_PROGRESS",
      dueDate: null,
    });

    expect(updated.title).toBe("After admin update");
    expect(updated.ownerId).toBe(USER_B_ID);
  });

  it("deletes an owned task", async () => {
    const created = await repository.create(USER_A_ID, {
      title: "Delete target",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    await repository.delete(created.id, userAScope);

    const found = await repository.findById(created.id, userAScope);

    expect(found).toBeNull();
  });

  it("throws TaskNotFoundError when deleting a missing task", async () => {
    await expect(
      repository.delete("cccccccc-cccc-4ccc-8ccc-cccccccccccc", userAScope),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("throws TaskNotFoundError when deleting another user's task", async () => {
    const created = await repository.create(USER_B_ID, {
      title: "User B protected task",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    await expect(
      repository.delete(created.id, userAScope),
    ).rejects.toBeInstanceOf(TaskNotFoundError);

    const stored = await prisma.task.findUnique({
      where: {
        id: created.id,
      },
    });

    expect(stored).not.toBeNull();
  });

  it("allows an ALL scope to delete another user's task", async () => {
    const created = await repository.create(USER_B_ID, {
      title: "Admin delete target",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    await repository.delete(created.id, adminScope);

    const stored = await prisma.task.findUnique({
      where: {
        id: created.id,
      },
    });

    expect(stored).toBeNull();
  });

  it("keeps owner unchanged when updating a task", async () => {
    const created = await repository.create(USER_A_ID, {
      title: "Ownership invariant",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    const updated = await repository.update(created.id, adminScope, {
      title: "Updated without ownership change",
      description: null,
      status: "IN_PROGRESS",
      dueDate: null,
    });

    expect(updated.ownerId).toBe(USER_A_ID);
  });
});
