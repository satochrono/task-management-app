import { beforeEach, describe, expect, it } from "vitest";

import type { AuthorizationActor } from "@/auth/domain/authorization-actor";
import { TaskService } from "@/modules/task/application/task-service";
import { InvalidTaskStatusTransitionError } from "@/modules/task/domain/errors/invalid-task-status-transition-error";
import { TaskNotFoundError } from "@/modules/task/domain/errors/task-not-found-error";
import type { Task, TaskWriteData } from "@/modules/task/domain/task";
import type { TaskAccessScope } from "@/modules/task/domain/task-access-scope";
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

  findStoredById(id: string): Task | null {
    return this.tasks.get(id) ?? null;
  }

  private isAccessible(task: Task, scope: TaskAccessScope): boolean {
    if (scope.kind === "ALL") {
      return true;
    }

    return task.ownerId === scope.ownerId;
  }

  async findAll(scope: TaskAccessScope): Promise<Task[]> {
    return [...this.tasks.values()].filter((task) =>
      this.isAccessible(task, scope),
    );
  }

  async findById(id: string, scope: TaskAccessScope): Promise<Task | null> {
    const task = this.tasks.get(id);

    if (task === undefined) {
      return null;
    }

    return this.isAccessible(task, scope) ? task : null;
  }

  async create(ownerId: string, data: TaskWriteData): Promise<Task> {
    this.sequence += 1;

    const now = new Date("2026-08-08T00:00:00.000Z");

    const task: Task = {
      id: `10000000-0000-4000-8000-${this.sequence
        .toString()
        .padStart(12, "0")}`,
      ...data,
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);

    return task;
  }

  async update(
    id: string,
    scope: TaskAccessScope,
    data: TaskWriteData,
  ): Promise<Task> {
    const existing = this.tasks.get(id);

    if (existing === undefined || !this.isAccessible(existing, scope)) {
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

  async delete(id: string, scope: TaskAccessScope): Promise<void> {
    const existing = this.tasks.get(id);

    if (existing === undefined || !this.isAccessible(existing, scope)) {
      throw new TaskNotFoundError(id);
    }

    this.tasks.delete(id);
  }
}

const userActor: AuthorizationActor = {
  userId: "user-1",
  role: "USER",
};

const otherUserActor: AuthorizationActor = {
  userId: "user-2",
  role: "USER",
};

const adminActor: AuthorizationActor = {
  userId: "admin-1",
  role: "ADMIN",
};

const existingTask: Task = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Existing task",
  description: "Description",
  status: "TODO",
  dueDate: null,
  ownerId: userActor.userId,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
};

const otherUserTask: Task = {
  id: "20000000-0000-4000-8000-000000000001",
  title: "Other user's task",
  description: "Other description",
  status: "IN_PROGRESS",
  dueDate: null,
  ownerId: otherUserActor.userId,
  createdAt: new Date("2026-08-02T00:00:00.000Z"),
  updatedAt: new Date("2026-08-02T00:00:00.000Z"),
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
      const tasks = await service.listTasks(userActor);

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

    it("returns only owned tasks for a USER", async () => {
      repository.seed(existingTask, otherUserTask);

      const tasks = await service.listTasks(userActor);

      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.id).toBe(existingTask.id);
    });

    it("returns all tasks for an ADMIN", async () => {
      repository.seed(existingTask, otherUserTask);

      const tasks = await service.listTasks(adminActor);

      expect(tasks).toHaveLength(2);
      expect(tasks.map((task) => task.id)).toEqual([
        existingTask.id,
        otherUserTask.id,
      ]);
    });
  });

  describe("getTask", () => {
    it("returns existing task", async () => {
      const task = await service.getTask(userActor, existingTask.id);

      expect(task.id).toBe(existingTask.id);
    });

    it("throws TaskNotFoundError when missing", async () => {
      await expect(
        service.getTask(userActor, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      ).rejects.toBeInstanceOf(TaskNotFoundError);
    });

    it("throws TaskNotFoundError when a USER accesses another user's task", async () => {
      repository.seed(existingTask, otherUserTask);

      await expect(
        service.getTask(userActor, otherUserTask.id),
      ).rejects.toBeInstanceOf(TaskNotFoundError);
    });

    it("allows an ADMIN to access another user's task", async () => {
      repository.seed(existingTask, otherUserTask);

      const task = await service.getTask(adminActor, otherUserTask.id);

      expect(task.id).toBe(otherUserTask.id);
    });
  });

  describe("createTask", () => {
    it("creates task", async () => {
      const task = await service.createTask(userActor, {
        title: "Created task",
        description: null,
        status: "TODO",
        dueDate: null,
      });

      expect(task.title).toBe("Created task");
      expect(task.status).toBe("TODO");
    });

    it("assigns the authenticated user as the task owner", async () => {
      const task = await service.createTask(userActor, {
        title: "Owned task",
        description: null,
        status: "TODO",
        dueDate: null,
      });

      const storedTask = repository.findStoredById(task.id);

      expect(storedTask?.ownerId).toBe(userActor.userId);
    });
  });

  describe("updateTask", () => {
    it("updates task", async () => {
      const task = await service.updateTask(userActor, existingTask.id, {
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
        service.updateTask(userActor, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
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
        service.updateTask(userActor, existingTask.id, {
          title: existingTask.title,
          description: existingTask.description,
          status: "TODO",
          dueDate: null,
        }),
      ).rejects.toBeInstanceOf(InvalidTaskStatusTransitionError);
    });

    it("throws TaskNotFoundError when a USER updates another user's task", async () => {
      repository.seed(existingTask, otherUserTask);

      await expect(
        service.updateTask(userActor, otherUserTask.id, {
          title: "Unauthorized update",
          description: null,
          status: "DONE",
          dueDate: null,
        }),
      ).rejects.toBeInstanceOf(TaskNotFoundError);
    });
  });

  describe("deleteTask", () => {
    it("deletes existing task", async () => {
      await service.deleteTask(userActor, existingTask.id);

      await expect(
        service.getTask(userActor, existingTask.id),
      ).rejects.toBeInstanceOf(TaskNotFoundError);
    });

    it("throws TaskNotFoundError when missing", async () => {
      await expect(
        service.deleteTask(userActor, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      ).rejects.toBeInstanceOf(TaskNotFoundError);
    });

    it("throws TaskNotFoundError when a USER deletes another user's task", async () => {
      repository.seed(existingTask, otherUserTask);

      await expect(
        service.deleteTask(userActor, otherUserTask.id),
      ).rejects.toBeInstanceOf(TaskNotFoundError);

      expect(repository.findStoredById(otherUserTask.id)).not.toBeNull();
    });
  });
});
