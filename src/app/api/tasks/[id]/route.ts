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
  taskIdSchema,
  taskWriteSchema,
  type TaskWriteInput,
} from "@/modules/task/presentation/schemas/task-schema";
import { requireAuthentication } from "@/shared/presentation/http/require-authentication";
import {
  createRequestContext,
  withRequestId,
} from "@/shared/presentation/http/request-context";

interface TaskRouteContext {
  params: Promise<{
    id: string;
  }>;
}

function toTaskWriteData(input: TaskWriteInput): TaskWriteData {
  return {
    title: input.title,
    description: input.description,
    status: input.status,
    dueDate: input.dueDate === null ? null : new Date(input.dueDate),
  };
}

export async function GET(
  request: Request,
  context: TaskRouteContext,
): Promise<Response> {
  const requestContext = createRequestContext(request);

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
      requestContext,
    );
  }

  const actor = createAuthorizationActor(session.user);

  const { id } = await context.params;

  const idResult = taskIdSchema.safeParse(id);

  if (!idResult.success) {
    return withRequestId(
      validationErrorResponse(idResult.error),
      requestContext,
    );
  }

  try {
    const task = await taskService.getTask(actor, idResult.data);

    return withRequestId(
      Response.json({
        data: task,
      }),
      requestContext,
    );
  } catch (error: unknown) {
    return withRequestId(
      taskErrorResponse(error, requestContext, {
        userId: actor.userId,
        role: actor.role,
        taskId: idResult.data,
        method: "GET",
      }),
      requestContext,
    );
  }
}

export async function PUT(
  request: Request,
  context: TaskRouteContext,
): Promise<Response> {
  const requestContext = createRequestContext(request);

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
      requestContext,
    );
  }

  const actor = createAuthorizationActor(session.user);

  const { id } = await context.params;

  const idResult = taskIdSchema.safeParse(id);

  if (!idResult.success) {
    return withRequestId(
      validationErrorResponse(idResult.error),
      requestContext,
    );
  }

  const jsonResult = await readJsonBody(request);

  if (!jsonResult.ok) {
    return withRequestId(jsonResult.response, requestContext);
  }

  const validationResult = taskWriteSchema.safeParse(jsonResult.value);

  if (!validationResult.success) {
    return withRequestId(
      validationErrorResponse(validationResult.error),
      requestContext,
    );
  }

  try {
    const task = await taskService.updateTask(
      actor,
      idResult.data,
      toTaskWriteData(validationResult.data),
    );

    return withRequestId(
      Response.json({
        data: task,
      }),
      requestContext,
    );
  } catch (error: unknown) {
    return withRequestId(
      taskErrorResponse(error, requestContext, {
        userId: actor.userId,
        role: actor.role,
        taskId: idResult.data,
        method: "PUT",
      }),
      requestContext,
    );
  }
}

export async function DELETE(
  request: Request,
  context: TaskRouteContext,
): Promise<Response> {
  const requestContext = createRequestContext(request);

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
      requestContext,
    );
  }

  const actor = createAuthorizationActor(session.user);

  const { id } = await context.params;

  const idResult = taskIdSchema.safeParse(id);

  if (!idResult.success) {
    return withRequestId(
      validationErrorResponse(idResult.error),
      requestContext,
    );
  }

  try {
    await taskService.deleteTask(actor, idResult.data);

    return withRequestId(
      new Response(null, {
        status: 204,
      }),
      requestContext,
    );
  } catch (error: unknown) {
    return withRequestId(
      taskErrorResponse(error, requestContext, {
        userId: actor.userId,
        role: actor.role,
        taskId: idResult.data,
        method: "DELETE",
      }),
      requestContext,
    );
  }
}
