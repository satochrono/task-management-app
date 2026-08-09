"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ApiErrorResponse } from "@/modules/task/presentation/http/api-types";

interface DeleteTaskButtonProps {
  taskId: string;
  taskTitle: string;
}

function getErrorMessage(value: unknown): string {
  if (typeof value === "object" && value !== null && "error" in value) {
    const response = value as Partial<ApiErrorResponse>;

    if (
      response.error !== undefined &&
      typeof response.error.message === "string"
    ) {
      return response.error.message;
    }
  }

  return "削除に失敗しました。";
}

export function DeleteTaskButton({ taskId, taskTitle }: DeleteTaskButtonProps) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    const confirmed = window.confirm(`「${taskTitle}」を削除しますか？`);

    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const responseBody: unknown = await response.json().catch(() => null);

        setErrorMessage(getErrorMessage(responseBody));
        return;
      }

      router.push("/tasks?success=deleted");
      router.refresh();
    } catch {
      setErrorMessage("サーバーへ接続できませんでした。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="delete-action">
      <button
        className="button button-danger"
        type="button"
        disabled={isDeleting}
        onClick={() => {
          void handleDelete();
        }}
      >
        {isDeleting ? "削除中..." : "削除"}
      </button>

      {errorMessage !== null ? (
        <p className="inline-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
