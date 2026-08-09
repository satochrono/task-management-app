import Link from "next/link";

import { TaskForm } from "@/modules/task/presentation/components/task-form";

export default function NewTaskPage() {
  return (
    <main className="page page-top">
      <section className="content content-narrow">
        <div className="page-header">
          <div>
            <p className="eyebrow">Task Management</p>
            <h1>Task新規登録</h1>
          </div>

          <Link className="button button-secondary" href="/tasks">
            一覧へ戻る
          </Link>
        </div>

        <TaskForm mode="create" />
      </section>
    </main>
  );
}
