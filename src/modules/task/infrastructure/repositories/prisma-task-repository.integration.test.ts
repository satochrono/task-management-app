import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/shared/infrastructure/database/prisma";
import { TaskNotFoundError } from "@/modules/task/domain/errors/task-not-found-error";
import { PrismaTaskRepository } from "@/modules/task/infrastructure/repositories/prisma-task-repository";

describe("PrismaTaskRepository", () => {
  const repository = new PrismaTaskRepository(prisma);

  beforeEach(async () => {
    await prisma.task.deleteMany();
  });

  it("creates and reads task", async () => {
    const created = await repository.create({
      title: "Integration task",
      description: "Repository integration test",
      status: "TODO",
      dueDate: null,
    });

    const found = await repository.findById(created.id);

    expect(found).not.toBeNull();

    expect(found).toMatchObject({
      id: created.id,
      title: "Integration task",
      description: "Repository integration test",
      status: "TODO",
      dueDate: null,
    });
  });

  it("returns null for missing task", async () => {
    const task = await repository.findById(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );

    expect(task).toBeNull();
  });

  it("returns tasks in descending createdAt order", async () => {
    await prisma.task.create({
      data: {
        id: "10000000-0000-4000-8000-000000000001",
        title: "Older",
        status: "TODO",
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    });

    await prisma.task.create({
      data: {
        id: "10000000-0000-4000-8000-000000000002",
        title: "Newer",
        status: "TODO",
        createdAt: new Date("2026-08-02T00:00:00.000Z"),
      },
    });

    const tasks = await repository.findAll();

    expect(tasks.map((task) => task.title)).toEqual(["Newer", "Older"]);
  });

  it("updates task", async () => {
    const created = await repository.create({
      title: "Before update",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    const updated = await repository.update(created.id, {
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
    });

    expect(updated.dueDate?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("throws TaskNotFoundError when updating missing task", async () => {
    await expect(
      repository.update("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
        title: "Missing",
        description: null,
        status: "TODO",
        dueDate: null,
      }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("deletes task", async () => {
    const created = await repository.create({
      title: "Delete target",
      description: null,
      status: "TODO",
      dueDate: null,
    });

    await repository.delete(created.id);

    const found = await repository.findById(created.id);

    expect(found).toBeNull();
  });

  it("throws TaskNotFoundError when deleting missing task", async () => {
    await expect(
      repository.delete("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});
