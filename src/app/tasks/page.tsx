import Link from "next/link";
import { connection } from "next/server";

import { taskService } from "@/modules/task/infrastructure/task-container";
import { DeleteTaskButton } from "@/modules/task/presentation/components/delete-task-button";

interface TasksPageProps {
  searchParams: Promise<{
    success?: string | string[];
  }>;
}

const statusLabels = {
  TODO: "未着手",
  IN_PROGRESS: "進行中",
  DONE: "完了",
} as const;

function successMessage(value: string | string[] | undefined): string | null {
  if (value === "created") {
    return "Taskを登録しました。";
  }

  if (value === "deleted") {
    return "Taskを削除しました。";
  }

  return null;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  await connection();

  const [tasks, resolvedSearchParams] = await Promise.all([
    taskService.listTasks(),
    searchParams,
  ]);

  const message = successMessage(resolvedSearchParams.success);

  return (
    <main className="page page-top">
      <section className="content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Task Management</p>
            <h1>Task一覧</h1>
          </div>

          <Link className="button button-primary" href="/tasks/new">
            新規登録
          </Link>
        </div>

        {message !== null ? (
          <div className="alert alert-success" role="status">
            {message}
          </div>
        ) : null}

        {tasks.length === 0 ? (
          <div className="empty-state">
            <h2>Taskはありません</h2>
            <p>最初のTaskを登録してください。</p>

            <Link className="button button-primary" href="/tasks/new">
              Taskを登録
            </Link>
          </div>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <article className="task-item" key={task.id}>
                <div className="task-main">
                  <div className="task-heading">
                    <Link href={`/tasks/${task.id}`}>{task.title}</Link>

                    <span className="status-badge">
                      {statusLabels[task.status]}
                    </span>
                  </div>

                  {task.description !== null ? <p>{task.description}</p> : null}

                  <p className="task-meta">
                    期限:{" "}
                    {task.dueDate === null
                      ? "未設定"
                      : formatDateTime(task.dueDate)}
                  </p>
                </div>

                <div className="task-actions">
                  <Link
                    className="button button-secondary"
                    href={`/tasks/${task.id}/edit`}
                  >
                    編集
                  </Link>

                  <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
