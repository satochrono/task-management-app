import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { createAuthorizationActor } from "@/auth/application/create-authorization-actor";
import { auth } from "@/auth";
import { TaskNotFoundError } from "@/modules/task/domain/errors/task-not-found-error";
import { taskService } from "@/modules/task/infrastructure/task-container";
import { DeleteTaskButton } from "@/modules/task/presentation/components/delete-task-button";
import { taskIdSchema } from "@/modules/task/presentation/schemas/task-schema";

interface TaskDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    success?: string | string[];
  }>;
}

const statusLabels = {
  TODO: "未着手",
  IN_PROGRESS: "進行中",
  DONE: "完了",
} as const;

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

export default async function TaskDetailPage({
  params,
  searchParams,
}: TaskDetailPageProps) {
  await connection();

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const actor = createAuthorizationActor(session.user);

  const { id } = await params;

  const idResult = taskIdSchema.safeParse(id);

  if (!idResult.success) {
    notFound();
  }

  let task;

  try {
    task = await taskService.getTask(actor, idResult.data);
  } catch (error: unknown) {
    if (error instanceof TaskNotFoundError) {
      notFound();
    }

    throw error;
  }

  const resolvedSearchParams = await searchParams;

  return (
    <main className="page page-top">
      <section className="content content-narrow">
        <div className="page-header">
          <div>
            <p className="eyebrow">Task Management</p>
            <h1>{task.title}</h1>
          </div>

          <Link className="button button-secondary" href="/tasks">
            一覧へ戻る
          </Link>
        </div>

        {resolvedSearchParams.success === "updated" ? (
          <div className="alert alert-success" role="status">
            Taskを更新しました。
          </div>
        ) : null}

        <dl className="detail-list">
          <div>
            <dt>状態</dt>
            <dd>{statusLabels[task.status]}</dd>
          </div>

          <div>
            <dt>説明</dt>
            <dd>{task.description ?? "未設定"}</dd>
          </div>

          <div>
            <dt>期限</dt>
            <dd>
              {task.dueDate === null ? "未設定" : formatDateTime(task.dueDate)}
            </dd>
          </div>

          <div>
            <dt>作成日時</dt>
            <dd>{formatDateTime(task.createdAt)}</dd>
          </div>

          <div>
            <dt>更新日時</dt>
            <dd>{formatDateTime(task.updatedAt)}</dd>
          </div>
        </dl>

        <div className="form-actions">
          <Link
            className="button button-primary"
            href={`/tasks/${task.id}/edit`}
          >
            編集
          </Link>

          <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
        </div>
      </section>
    </main>
  );
}
