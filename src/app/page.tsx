import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Task Management</p>

        <h1>Task Management Application</h1>

        <p>業務Taskの登録、参照、更新、削除を行います。</p>

        <Link className="button button-primary" href="/tasks">
          Task一覧を開く
        </Link>
      </section>
    </main>
  );
}
