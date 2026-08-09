"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { TaskDto } from "@/modules/task/application/dto/task-dto";
import type { TaskStatus } from "@/modules/task/domain/task";
import type { ApiErrorResponse } from "@/modules/task/presentation/http/api-types";

type TaskFormProps =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      task: TaskDto;
    };

function toLocalDateTimeValue(value: string | null): string {
  if (value === null) {
    return "";
  }

  const date = new Date(value);
  const offsetMilliseconds = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offsetMilliseconds)
    .toISOString()
    .slice(0, 16);
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

  return "処理に失敗しました。";
}

export function TaskForm(props: TaskFormProps) {
  const router = useRouter();

  const initialTask = props.mode === "edit" ? props.task : null;

  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [description, setDescription] = useState(
    initialTask?.description ?? "",
  );
  const [status, setStatus] = useState<TaskStatus>(
    initialTask?.status ?? "TODO",
  );
  const [dueDate, setDueDate] = useState(
    toLocalDateTimeValue(initialTask?.dueDate ?? null),
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage(null);
    setIsSubmitting(true);

    const body = {
      title,
      description: description.trim() === "" ? null : description,
      status,
      dueDate: dueDate === "" ? null : new Date(dueDate).toISOString(),
    };

    const url =
      props.mode === "create" ? "/api/tasks" : `/api/tasks/${props.task.id}`;

    const method = props.mode === "create" ? "POST" : "PUT";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const responseBody: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(getErrorMessage(responseBody));
        return;
      }

      if (props.mode === "create") {
        router.push("/tasks?success=created");
      } else {
        router.push(`/tasks/${props.task.id}?success=updated`);
      }

      router.refresh();
    } catch {
      setErrorMessage("サーバーへ接続できませんでした。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      {errorMessage !== null ? (
        <div className="alert alert-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="form-field">
        <label htmlFor="title">タイトル</label>

        <input
          id="title"
          name="title"
          type="text"
          maxLength={200}
          required
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
      </div>

      <div className="form-field">
        <label htmlFor="description">説明</label>

        <textarea
          id="description"
          name="description"
          rows={6}
          maxLength={4000}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
        />
      </div>

      <div className="form-field">
        <label htmlFor="status">状態</label>

        <select
          id="status"
          name="status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as TaskStatus);
          }}
        >
          <option value="TODO" disabled={initialTask?.status === "DONE"}>
            未着手
          </option>

          <option value="IN_PROGRESS">進行中</option>

          <option value="DONE">完了</option>
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="dueDate">期限</label>

        <input
          id="dueDate"
          name="dueDate"
          type="datetime-local"
          value={dueDate}
          onChange={(event) => {
            setDueDate(event.target.value);
          }}
        />
      </div>

      <div className="form-actions">
        <button
          className="button button-primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "保存中..."
            : props.mode === "create"
              ? "登録"
              : "更新"}
        </button>

        <button
          className="button button-secondary"
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            router.back();
          }}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
