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

import { NextResponse } from "next/server";

import { requireAuthentication } from "@/shared/presentation/http/require-authentication";

function toTaskWriteData(input: TaskWriteInput): TaskWriteData {
  return {
    title: input.title,
    description: input.description,
    status: input.status,
    dueDate: input.dueDate === null ? null : new Date(input.dueDate),
  };
}

export async function GET(): Promise<Response> {
  const session = await requireAuthentication();

  if (session === null) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const tasks = await taskService.listTasks();

    return Response.json({
      data: tasks,
    });
  } catch (error: unknown) {
    return taskErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireAuthentication();

  if (session === null) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const jsonResult = await readJsonBody(request);

  if (!jsonResult.ok) {
    return jsonResult.response;
  }

  const validationResult = taskWriteSchema.safeParse(jsonResult.value);

  if (!validationResult.success) {
    return validationErrorResponse(validationResult.error);
  }

  try {
    const task = await taskService.createTask(
      toTaskWriteData(validationResult.data),
    );

    return Response.json(
      {
        data: task,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    return taskErrorResponse(error);
  }
}
