import type { AuthorizationActor } from "@/auth/domain/authorization-actor";
import {
  toTaskDto,
  type TaskDto,
} from "@/modules/task/application/dto/task-dto";
import { TaskNotFoundError } from "@/modules/task/domain/errors/task-not-found-error";
import {
  assertTaskStatusTransition,
  type TaskWriteData,
} from "@/modules/task/domain/task";
import { createTaskAccessScope } from "@/modules/task/domain/task-access-scope";
import type { TaskRepository } from "@/modules/task/domain/repositories/task-repository";

export class TaskService {
  constructor(private readonly taskRepository: TaskRepository) {}

  async listTasks(actor: AuthorizationActor): Promise<TaskDto[]> {
    const scope = createTaskAccessScope(actor);

    const tasks = await this.taskRepository.findAll(scope);

    return tasks.map(toTaskDto);
  }

  async getTask(actor: AuthorizationActor, id: string): Promise<TaskDto> {
    const scope = createTaskAccessScope(actor);

    const task = await this.taskRepository.findById(id, scope);

    if (task === null) {
      throw new TaskNotFoundError(id);
    }

    return toTaskDto(task);
  }

  async createTask(
    actor: AuthorizationActor,
    data: TaskWriteData,
  ): Promise<TaskDto> {
    const task = await this.taskRepository.create(actor.userId, data);

    return toTaskDto(task);
  }

  async updateTask(
    actor: AuthorizationActor,
    id: string,
    data: TaskWriteData,
  ): Promise<TaskDto> {
    const scope = createTaskAccessScope(actor);

    const existingTask = await this.taskRepository.findById(id, scope);

    if (existingTask === null) {
      throw new TaskNotFoundError(id);
    }

    assertTaskStatusTransition(existingTask.status, data.status);

    const updatedTask = await this.taskRepository.update(id, scope, data);

    return toTaskDto(updatedTask);
  }

  async deleteTask(actor: AuthorizationActor, id: string): Promise<void> {
    const scope = createTaskAccessScope(actor);

    const existingTask = await this.taskRepository.findById(id, scope);

    if (existingTask === null) {
      throw new TaskNotFoundError(id);
    }

    await this.taskRepository.delete(id, scope);
  }
}
