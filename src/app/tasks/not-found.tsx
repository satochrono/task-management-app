import Link from "next/link";

export default function TaskNotFound() {
  return (
    <main className="page page-top">
      <section className="content content-narrow">
        <div className="empty-state">
          <h1>Taskが見つかりません</h1>

          <p>指定されたTaskは存在しないか、 すでに削除されています。</p>

          <Link className="button button-primary" href="/tasks">
            Task一覧へ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
