import { afterEach, describe, expect, it, vi } from "vitest";

import { InvalidTaskStatusTransitionError } from "@/modules/task/domain/errors/invalid-task-status-transition-error";
import { TaskNotFoundError } from "@/modules/task/domain/errors/task-not-found-error";
import { taskErrorResponse } from "@/modules/task/presentation/http/task-http";
import { logger } from "@/shared/infrastructure/logging/logger";

describe("taskErrorResponse", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 404 and logs task access not found when request metadata is available", async () => {
    const warnSpy = vi
      .spyOn(logger, "warn")
      .mockImplementation(() => undefined);

    const errorSpy = vi.spyOn(logger, "error");

    const taskId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

    const response = taskErrorResponse(
      new TaskNotFoundError(taskId),
      {
        requestId: "request-404",
      },
      {
        userId: "user-1",
        role: "USER",
        taskId,
        method: "GET",
      },
    );

    expect(response.status).toBe(404);

    expect(warnSpy).toHaveBeenCalledOnce();

    expect(warnSpy).toHaveBeenCalledWith(
      "task_access_not_found",
      "Task access resulted in not found.",
      {
        requestId: "request-404",
        userId: "user-1",
        role: "USER",
        taskId,
        method: "GET",
      },
    );

    expect(errorSpy).not.toHaveBeenCalled();

    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "TASK_NOT_FOUND",
      },
    });
  });

  it("returns 404 without a warning when request metadata is unavailable", async () => {
    const warnSpy = vi.spyOn(logger, "warn");
    const errorSpy = vi.spyOn(logger, "error");

    const response = taskErrorResponse(
      new TaskNotFoundError("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      {
        requestId: "request-404",
      },
    );

    expect(response.status).toBe(404);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "TASK_NOT_FOUND",
      },
    });
  });

  it("returns 409 without error logging for a business conflict", async () => {
    const warnSpy = vi.spyOn(logger, "warn");
    const errorSpy = vi.spyOn(logger, "error");

    const response = taskErrorResponse(
      new InvalidTaskStatusTransitionError("DONE", "TODO"),
      {
        requestId: "request-409",
      },
    );

    expect(response.status).toBe(409);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVALID_STATUS_TRANSITION",
      },
    });
  });

  it("logs an unexpected error with the request id and returns 500", async () => {
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);

    const response = taskErrorResponse(
      new Error("Database connection failed"),
      {
        requestId: "request-500",
      },
    );

    expect(response.status).toBe(500);

    expect(errorSpy).toHaveBeenCalledOnce();

    expect(errorSpy).toHaveBeenCalledWith(
      "task_request_failed",
      "Unhandled task request error.",
      {
        requestId: "request-500",
        errorName: "Error",
      },
    );

    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "システムエラーが発生しました。",
      },
    });
  });

  it("does not expose the internal error message in the response", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => undefined);

    const response = taskErrorResponse(new Error("Sensitive database detail"), {
      requestId: "request-redaction",
    });

    const body = JSON.stringify(await response.json());

    expect(body).not.toContain("Sensitive database detail");
    expect(body).toContain("システムエラーが発生しました。");
  });
});
