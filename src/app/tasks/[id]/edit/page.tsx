import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { TaskNotFoundError } from "@/modules/task/domain/errors/task-not-found-error";
import { taskService } from "@/modules/task/infrastructure/task-container";
import { TaskForm } from "@/modules/task/presentation/components/task-form";
import { taskIdSchema } from "@/modules/task/presentation/schemas/task-schema";

interface EditTaskPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  await connection();

  const { id } = await params;

  const idResult = taskIdSchema.safeParse(id);

  if (!idResult.success) {
    notFound();
  }

  let task;

  try {
    task = await taskService.getTask(idResult.data);
  } catch (error: unknown) {
    if (error instanceof TaskNotFoundError) {
      notFound();
    }

    throw error;
  }

  return (
    <main className="page page-top">
      <section className="content content-narrow">
        <div className="page-header">
          <div>
            <p className="eyebrow">Task Management</p>
            <h1>Task編集</h1>
          </div>

          <Link className="button button-secondary" href={`/tasks/${task.id}`}>
            詳細へ戻る
          </Link>
        </div>

        <TaskForm mode="edit" task={task} />
      </section>
    </main>
  );
}
