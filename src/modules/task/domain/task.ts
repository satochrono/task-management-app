import { InvalidTaskStatusTransitionError } from "@/modules/task/domain/errors/invalid-task-status-transition-error";

export const taskStatuses = ["TODO", "IN_PROGRESS", "DONE"] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWriteData {
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: Date | null;
}

export function assertTaskStatusTransition(
  currentStatus: TaskStatus,
  nextStatus: TaskStatus,
): void {
  if (currentStatus === "DONE" && nextStatus === "TODO") {
    throw new InvalidTaskStatusTransitionError(currentStatus, nextStatus);
  }
}
