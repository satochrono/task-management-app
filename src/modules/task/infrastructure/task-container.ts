import "server-only";

import { TaskService } from "@/modules/task/application/task-service";
import { PrismaTaskRepository } from "@/modules/task/infrastructure/repositories/prisma-task-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

const taskRepository = new PrismaTaskRepository(prisma);

export const taskService = new TaskService(taskRepository);
