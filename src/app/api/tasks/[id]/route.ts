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
  _request: Request,
  context: TaskRouteContext,
): Promise<Response> {
  const { id } = await context.params;

  const idResult = taskIdSchema.safeParse(id);

  if (!idResult.success) {
    return validationErrorResponse(idResult.error);
  }

  try {
    const task = await taskService.getTask(idResult.data);

    return Response.json({
      data: task,
    });
  } catch (error: unknown) {
    return taskErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: TaskRouteContext,
): Promise<Response> {
  const { id } = await context.params;

  const idResult = taskIdSchema.safeParse(id);

  if (!idResult.success) {
    return validationErrorResponse(idResult.error);
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
    const task = await taskService.updateTask(
      idResult.data,
      toTaskWriteData(validationResult.data),
    );

    return Response.json({
      data: task,
    });
  } catch (error: unknown) {
    return taskErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: TaskRouteContext,
): Promise<Response> {
  const { id } = await context.params;

  const idResult = taskIdSchema.safeParse(id);

  if (!idResult.success) {
    return validationErrorResponse(idResult.error);
  }

  try {
    await taskService.deleteTask(idResult.data);

    return new Response(null, {
      status: 204,
    });
  } catch (error: unknown) {
    return taskErrorResponse(error);
  }
}
