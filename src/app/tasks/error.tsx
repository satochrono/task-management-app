"use client";

import Link from "next/link";
import { useEffect } from "react";

interface TasksErrorProps {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}

export default function TasksError({ error, reset }: TasksErrorProps) {
  useEffect(() => {
    console.error("Task page rendering failed.", {
      digest: error.digest,
    });
  }, [error.digest]);

  return (
    <main className="page page-top">
      <section className="content content-narrow">
        <div className="empty-state">
          <h1>システムエラーが発生しました</h1>

          <p>一時的な問題の可能性があります。</p>

          <div className="form-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={reset}
            >
              再試行
            </button>

            <Link className="button button-secondary" href="/">
              ホームへ戻る
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
