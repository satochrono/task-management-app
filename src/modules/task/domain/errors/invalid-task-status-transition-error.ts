export class InvalidTaskStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid task status transition: ${from} -> ${to}`);
    this.name = "InvalidTaskStatusTransitionError";
  }
}
