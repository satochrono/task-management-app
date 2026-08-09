import { z } from "zod";

import { taskStatuses } from "@/modules/task/domain/task";

export const taskIdSchema = z.string().uuid();

export const taskWriteSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "タイトルは必須です。")
      .max(200, "タイトルは200文字以内で入力してください。"),
    description: z
      .string()
      .trim()
      .max(4000, "説明は4000文字以内で入力してください。")
      .nullable(),
    status: z.enum(taskStatuses),
    dueDate: z
      .string()
      .datetime({
        offset: true,
      })
      .nullable(),
  })
  .strict();

export type TaskWriteInput = z.infer<typeof taskWriteSchema>;
