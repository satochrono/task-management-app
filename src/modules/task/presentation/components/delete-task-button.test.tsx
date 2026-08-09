/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteTaskButton } from "@/modules/task/presentation/components/delete-task-button";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe("DeleteTaskButton", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();

    vi.stubGlobal("fetch", vi.fn());

    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("does not delete when confirmation is cancelled", async () => {
    const user = userEvent.setup();

    vi.mocked(window.confirm).mockReturnValue(false);

    render(
      <DeleteTaskButton
        taskId="10000000-0000-4000-8000-000000000001"
        taskTitle="Task"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "削除",
      }),
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it("deletes task", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    );

    render(
      <DeleteTaskButton
        taskId="10000000-0000-4000-8000-000000000001"
        taskTitle="Task"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "削除",
      }),
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/tasks/10000000-0000-4000-8000-000000000001",
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      },
    );

    expect(push).toHaveBeenCalledWith("/tasks?success=deleted");

    expect(refresh).toHaveBeenCalled();
  });

  it("shows API error", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "TASK_NOT_FOUND",
            message: "指定されたTaskは存在しません。",
          },
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    render(
      <DeleteTaskButton
        taskId="10000000-0000-4000-8000-000000000001"
        taskTitle="Task"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "削除",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "指定されたTaskは存在しません。",
    );
  });
});
