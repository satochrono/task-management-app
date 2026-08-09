import { beforeEach, describe, expect, it } from "vitest";

import { TaskService } from "@/modules/task/application/task-service";
import { InvalidTaskStatusTransitionError } from "@/modules/task/domain/errors/invalid-task-status-transition-error";
import { TaskNotFoundError } from "@/modules/task/domain/errors/task-not-found-error";
import type { Task, TaskWriteData } from "@/modules/task/domain/task";
import type { TaskRepository } from "@/modules/task/domain/repositories/task-repository";

class FakeTaskRepository implements TaskRepository {
  private tasks = new Map<string, Task>();

  private sequence = 0;

  seed(...tasks: Task[]): void {
    this.tasks.clear();

    for (const task of tasks) {
      this.tasks.set(task.id, task);
    }
  }

  async findAll(): Promise<Task[]> {
    return [...this.tasks.values()];
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }

  async create(data: TaskWriteData): Promise<Task> {
    this.sequence += 1;

    const now = new Date("2026-08-08T00:00:00.000Z");

    const task: Task = {
      id: `10000000-0000-4000-8000-${this.sequence
        .toString()
        .padStart(12, "0")}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);

    return task;
  }

  async update(id: string, data: TaskWriteData): Promise<Task> {
    const existing = this.tasks.get(id);

    if (existing === undefined) {
      throw new TaskNotFoundError(id);
    }

    const updated: Task = {
      ...existing,
      ...data,
      updatedAt: new Date("2026-08-08T01:00:00.000Z"),
    };

    this.tasks.set(id, updated);

    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.tasks.has(id)) {
      throw new TaskNotFoundError(id);
    }

    this.tasks.delete(id);
  }
}

const existingTask: Task = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Existing task",
  description: "Description",
  status: "TODO",
  dueDate: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
};

describe("TaskService", () => {
  let repository: FakeTaskRepository;
  let service: TaskService;

  beforeEach(() => {
    repository = new FakeTaskRepository();
    repository.seed(existingTask);

    service = new TaskService(repository);
  });

  describe("listTasks", () => {
    it("returns DTOs", async () => {
      const tasks = await service.listTasks();

      expect(tasks).toEqual([
        {
          id: existingTask.id,
          title: existingTask.title,
          description: existingTask.description,
          status: existingTask.status,
          dueDate: null,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ]);
    });
  });

  describe("getTask", () => {
    it("returns existing task", async () => {
      const task = await service.getTask(existingTask.id);

      expect(task.id).toBe(existingTask.id);
    });

    it("throws TaskNotFoundError when missing", async () => {
      await expect(
        service.getTask("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      ).rejects.toBeInstanceOf(TaskNotFoundError);
    });
  });

  describe("createTask", () => {
    it("creates task", async () => {
      const task = await service.createTask({
        title: "Created task",
        description: null,
        status: "TODO",
        dueDate: null,
      });

      expect(task.title).toBe("Created task");

      expect(task.status).toBe("TODO");
    });
  });

  describe("updateTask", () => {
    it("updates task", async () => {
      const task = await service.updateTask(existingTask.id, {
        title: "Updated task",
        description: null,
        status: "IN_PROGRESS",
        dueDate: null,
      });

      expect(task.title).toBe("Updated task");

      expect(task.status).toBe("IN_PROGRESS");
    });

    it("throws TaskNotFoundError when missing", async () => {
      await expect(
        service.updateTask("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
          title: "Updated",
          description: null,
          status: "TODO",
          dueDate: null,
        }),
      ).rejects.toBeInstanceOf(TaskNotFoundError);
    });

    it("rejects DONE -> TODO", async () => {
      repository.seed({
        ...existingTask,
        status: "DONE",
      });

      await expect(
        service.updateTask(existingTask.id, {
          title: existingTask.title,
          description: existingTask.description,
          status: "TODO",
          dueDate: null,
        }),
      ).rejects.toBeInstanceOf(InvalidTaskStatusTransitionError);
    });
  });

  describe("deleteTask", () => {
    it("deletes existing task", async () => {
      await service.deleteTask(existingTask.id);

      await expect(service.getTask(existingTask.id)).rejects.toBeInstanceOf(
        TaskNotFoundError,
      );
    });

    it("throws TaskNotFoundError when missing", async () => {
      await expect(
        service.deleteTask("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      ).rejects.toBeInstanceOf(TaskNotFoundError);
    });
  });
});
