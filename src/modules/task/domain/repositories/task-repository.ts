import type { Task, TaskWriteData } from "@/modules/task/domain/task";

export interface TaskRepository {
  findAll(): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  create(data: TaskWriteData): Promise<Task>;
  update(id: string, data: TaskWriteData): Promise<Task>;
  delete(id: string): Promise<void>;
}
