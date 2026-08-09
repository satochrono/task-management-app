export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task was not found: ${taskId}`);
    this.name = "TaskNotFoundError";
  }
}
