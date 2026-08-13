import { NextResponse } from "next/server";

import { createAuthorizationActor } from "@/auth/application/create-authorization-actor";
import type { TaskWriteData } from "@/modules/task/domain/task";
import { taskService } from "@/modules/task/infrastructure/task-container";
import {
  readJsonBody,
  taskErrorResponse,
  validationErrorResponse,
} from "@/modules/task/presentation/http/task-http";
import {
  taskWriteSchema,
  type TaskWriteInput,
} from "@/modules/task/presentation/schemas/task-schema";
import { requireAuthentication } from "@/shared/presentation/http/require-authentication";
import {
  createRequestContext,
  withRequestId,
} from "@/shared/presentation/http/request-context";

function toTaskWriteData(input: TaskWriteInput): TaskWriteData {
  return {
    title: input.title,
    description: input.description,
    status: input.status,
    dueDate: input.dueDate === null ? null : new Date(input.dueDate),
  };
}

export async function GET(request: Request): Promise<Response> {
  const context = createRequestContext(request);

  const session = await requireAuthentication();

  if (session === null) {
    return withRequestId(
      NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      ),
      context,
    );
  }

  const actor = createAuthorizationActor(session.user);

  try {
    const tasks = await taskService.listTasks(actor);

    return withRequestId(
      Response.json({
        data: tasks,
      }),
      context,
    );
  } catch (error: unknown) {
    return withRequestId(taskErrorResponse(error, context), context);
  }
}

export async function POST(request: Request): Promise<Response> {
  const context = createRequestContext(request);

  const session = await requireAuthentication();

  if (session === null) {
    return withRequestId(
      NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      ),
      context,
    );
  }

  const actor = createAuthorizationActor(session.user);

  const jsonResult = await readJsonBody(request);

  if (!jsonResult.ok) {
    return withRequestId(jsonResult.response, context);
  }

  const validationResult = taskWriteSchema.safeParse(jsonResult.value);

  if (!validationResult.success) {
    return withRequestId(
      validationErrorResponse(validationResult.error),
      context,
    );
  }

  try {
    const task = await taskService.createTask(
      actor,
      toTaskWriteData(validationResult.data),
    );

    return withRequestId(
      Response.json(
        {
          data: task,
        },
        {
          status: 201,
        },
      ),
      context,
    );
  } catch (error: unknown) {
    return withRequestId(taskErrorResponse(error, context), context);
  }
}
