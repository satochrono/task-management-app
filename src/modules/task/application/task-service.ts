import {
  assertTaskStatusTransition,
  type TaskWriteData,
} from "@/modules/task/domain/task";
import { TaskNotFoundError } from "@/modules/task/domain/errors/task-not-found-error";
import type { TaskRepository } from "@/modules/task/domain/repositories/task-repository";
import {
  toTaskDto,
  type TaskDto,
} from "@/modules/task/application/dto/task-dto";

export class TaskService {
  constructor(private readonly taskRepository: TaskRepository) {}

  async listTasks(): Promise<TaskDto[]> {
    const tasks = await this.taskRepository.findAll();

    return tasks.map(toTaskDto);
  }

  async getTask(id: string): Promise<TaskDto> {
    const task = await this.taskRepository.findById(id);

    if (task === null) {
      throw new TaskNotFoundError(id);
    }

    return toTaskDto(task);
  }

  async createTask(data: TaskWriteData): Promise<TaskDto> {
    const task = await this.taskRepository.create(data);

    return toTaskDto(task);
  }

  async updateTask(id: string, data: TaskWriteData): Promise<TaskDto> {
    const existingTask = await this.taskRepository.findById(id);

    if (existingTask === null) {
      throw new TaskNotFoundError(id);
    }

    assertTaskStatusTransition(existingTask.status, data.status);

    const updatedTask = await this.taskRepository.update(id, data);

    return toTaskDto(updatedTask);
  }

  async deleteTask(id: string): Promise<void> {
    const existingTask = await this.taskRepository.findById(id);

    if (existingTask === null) {
      throw new TaskNotFoundError(id);
    }

    await this.taskRepository.delete(id);
  }
}
