import {
  Prisma,
  PrismaClient,
  TaskStatus as PrismaTaskStatus,
} from "@/generated/prisma/client";
import { TaskNotFoundError } from "@/modules/task/domain/errors/task-not-found-error";
import type {
  Task,
  TaskStatus,
  TaskWriteData,
} from "@/modules/task/domain/task";
import type { TaskRepository } from "@/modules/task/domain/repositories/task-repository";

function toDomainStatus(status: PrismaTaskStatus): TaskStatus {
  switch (status) {
    case PrismaTaskStatus.TODO:
      return "TODO";
    case PrismaTaskStatus.IN_PROGRESS:
      return "IN_PROGRESS";
    case PrismaTaskStatus.DONE:
      return "DONE";
  }
}

function toPrismaStatus(status: TaskStatus): PrismaTaskStatus {
  switch (status) {
    case "TODO":
      return PrismaTaskStatus.TODO;
    case "IN_PROGRESS":
      return PrismaTaskStatus.IN_PROGRESS;
    case "DONE":
      return PrismaTaskStatus.DONE;
  }
}

function toDomainTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: PrismaTaskStatus;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: toDomainStatus(task.status),
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<Task[]> {
    const tasks = await this.prisma.task.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return tasks.map(toDomainTask);
  }

  async findById(id: string): Promise<Task | null> {
    const task = await this.prisma.task.findUnique({
      where: {
        id,
      },
    });

    return task === null ? null : toDomainTask(task);
  }

  async create(data: TaskWriteData): Promise<Task> {
    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: toPrismaStatus(data.status),
        dueDate: data.dueDate,
      },
    });

    return toDomainTask(task);
  }

  async update(id: string, data: TaskWriteData): Promise<Task> {
    try {
      const task = await this.prisma.task.update({
        where: {
          id,
        },
        data: {
          title: data.title,
          description: data.description,
          status: toPrismaStatus(data.status),
          dueDate: data.dueDate,
        },
      });

      return toDomainTask(task);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new TaskNotFoundError(id);
      }

      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.task.delete({
        where: {
          id,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new TaskNotFoundError(id);
      }

      throw error;
    }
  }
}
