/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskForm } from "@/modules/task/presentation/components/task-form";

const push = vi.fn();
const refresh = vi.fn();
const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
    back,
  }),
}));

describe("TaskForm", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    back.mockReset();

    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders create form", () => {
    render(<TaskForm mode="create" />);

    expect(screen.getByLabelText("タイトル")).toBeInTheDocument();

    expect(screen.getByLabelText("説明")).toBeInTheDocument();

    expect(screen.getByLabelText("状態")).toBeInTheDocument();

    expect(screen.getByLabelText("期限")).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "登録",
      }),
    ).toBeInTheDocument();
  });

  it("submits create request", async () => {
    const user = userEvent.setup();

    const fetchMock = vi.mocked(fetch);

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "10000000-0000-4000-8000-000000000001",
          },
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    render(<TaskForm mode="create" />);

    await user.type(screen.getByLabelText("タイトル"), "New task");

    await user.type(screen.getByLabelText("説明"), "Description");

    await user.click(
      screen.getByRole("button", {
        name: "登録",
      }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tasks",
      expect.objectContaining({
        method: "POST",
      }),
    );

    expect(push).toHaveBeenCalledWith("/tasks?success=created");

    expect(refresh).toHaveBeenCalled();
  });

  it("shows API error message", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "入力内容を確認してください。",
          },
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    render(<TaskForm mode="create" />);

    await user.type(screen.getByLabelText("タイトル"), "Task");

    await user.click(
      screen.getByRole("button", {
        name: "登録",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "入力内容を確認してください。",
    );

    expect(push).not.toHaveBeenCalled();
  });

  it("shows connection error", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockRejectedValue(new Error("network error"));

    render(<TaskForm mode="create" />);

    await user.type(screen.getByLabelText("タイトル"), "Task");

    await user.click(
      screen.getByRole("button", {
        name: "登録",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "サーバーへ接続できませんでした。",
    );
  });

  it("renders edit values", () => {
    render(
      <TaskForm
        mode="edit"
        task={{
          id: "10000000-0000-4000-8000-000000000001",
          title: "Existing task",
          description: "Existing description",
          status: "DONE",
          dueDate: null,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByLabelText("タイトル")).toHaveValue("Existing task");

    expect(screen.getByLabelText("説明")).toHaveValue("Existing description");

    expect(screen.getByLabelText("状態")).toHaveValue("DONE");

    expect(
      screen.getByRole("option", {
        name: "未着手",
      }),
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "更新",
      }),
    ).toBeInTheDocument();
  });
});
