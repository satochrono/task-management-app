import type { ZodError } from "zod";

import type { UserRole } from "@/auth/domain/user-role";
import { InvalidTaskStatusTransitionError } from "@/modules/task/domain/errors/invalid-task-status-transition-error";
import { TaskNotFoundError } from "@/modules/task/domain/errors/task-not-found-error";
import type {
  ApiErrorResponse,
  ApiValidationIssue,
} from "@/modules/task/presentation/http/api-types";
import { logger } from "@/shared/infrastructure/logging/logger";
import type { RequestContext } from "@/shared/presentation/http/request-context";

interface TaskRequestLogContext {
  userId: string;
  role: UserRole;
  taskId: string;
  method: "GET" | "PUT" | "DELETE";
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  issues?: ApiValidationIssue[],
): Response {
  const body: ApiErrorResponse =
    issues === undefined
      ? {
          error: {
            code,
            message,
          },
        }
      : {
          error: {
            code,
            message,
            issues,
          },
        };

  return Response.json(body, {
    status,
  });
}

export function malformedJsonResponse(): Response {
  return errorResponse(400, "INVALID_JSON", "JSON形式が正しくありません。");
}

export function validationErrorResponse(error: ZodError): Response {
  return errorResponse(
    400,
    "VALIDATION_ERROR",
    "入力内容を確認してください。",
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  );
}

export function taskErrorResponse(
  error: unknown,
  context?: RequestContext,
  taskRequestContext?: TaskRequestLogContext,
): Response {
  if (error instanceof TaskNotFoundError) {
    if (taskRequestContext !== undefined) {
      logger.warn(
        "task_access_not_found",
        "Task access resulted in not found.",
        {
          requestId: context?.requestId ?? null,
          userId: taskRequestContext.userId,
          role: taskRequestContext.role,
          taskId: taskRequestContext.taskId,
          method: taskRequestContext.method,
        },
      );
    }

    return errorResponse(
      404,
      "TASK_NOT_FOUND",
      "指定されたTaskは存在しません。",
    );
  }

  if (error instanceof InvalidTaskStatusTransitionError) {
    return errorResponse(
      409,
      "INVALID_STATUS_TRANSITION",
      "完了済みTaskを直接「未着手」へ戻すことはできません。「進行中」を経由してください。",
    );
  }

  logger.error("task_request_failed", "Unhandled task request error.", {
    requestId: context?.requestId ?? null,
    errorName: error instanceof Error ? error.name : "UnknownError",
  });

  return errorResponse(
    500,
    "INTERNAL_SERVER_ERROR",
    "システムエラーが発生しました。",
  );
}

export async function readJsonBody(request: Request): Promise<
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      response: Response;
    }
> {
  try {
    return {
      ok: true,
      value: await request.json(),
    };
  } catch {
    return {
      ok: false,
      response: malformedJsonResponse(),
    };
  }
}
