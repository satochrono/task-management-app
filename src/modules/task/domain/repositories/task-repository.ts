import type { Task, TaskWriteData } from "@/modules/task/domain/task";
import type { TaskAccessScope } from "@/modules/task/domain/task-access-scope";

export interface TaskRepository {
  findAll(scope: TaskAccessScope): Promise<Task[]>;

  findById(id: string, scope: TaskAccessScope): Promise<Task | null>;

  create(ownerId: string, data: TaskWriteData): Promise<Task>;

  update(
    id: string,
    scope: TaskAccessScope,
    data: TaskWriteData,
  ): Promise<Task>;

  delete(id: string, scope: TaskAccessScope): Promise<void>;
}
