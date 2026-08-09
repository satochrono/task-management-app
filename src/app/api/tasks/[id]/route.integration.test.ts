import { describe, expect, it } from "vitest";

import { DELETE, GET, PUT } from "@/app/api/tasks/[id]/route";
import { prisma } from "@/shared/infrastructure/database/prisma";

function context(id: string) {
  return {
    params: Promise.resolve({
      id,
    }),
  };
}

describe("/api/tasks/[id]", () => {
  it("returns task detail", async () => {
    const task = await prisma.task.create({
      data: {
        title: "Detail task",
        status: "TODO",
      },
    });

    const request = new Request(`http://localhost:3000/api/tasks/${task.id}`);

    const response = await GET(request, context(task.id));

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      data: {
        id: string;
        title: string;
      };
    };

    expect(body.data.id).toBe(task.id);

    expect(body.data.title).toBe("Detail task");
  });

  it("returns 404 when task does not exist", async () => {
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

    const request = new Request(`http://localhost:3000/api/tasks/${id}`);

    const response = await GET(request, context(id));

    expect(response.status).toBe(404);
  });

  it("updates task", async () => {
    const task = await prisma.task.create({
      data: {
        title: "Before",
        status: "TODO",
      },
    });

    const request = new Request(`http://localhost:3000/api/tasks/${task.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "After",
        description: null,
        status: "IN_PROGRESS",
        dueDate: null,
      }),
    });

    const response = await PUT(request, context(task.id));

    expect(response.status).toBe(200);

    const saved = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
    });

    expect(saved?.title).toBe("After");

    expect(saved?.status).toBe("IN_PROGRESS");
  });

  it("returns 409 for invalid business transition", async () => {
    const task = await prisma.task.create({
      data: {
        title: "Completed",
        status: "DONE",
      },
    });

    const request = new Request(`http://localhost:3000/api/tasks/${task.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: task.title,
        description: null,
        status: "TODO",
        dueDate: null,
      }),
    });

    const response = await PUT(request, context(task.id));

    expect(response.status).toBe(409);
  });

  it("deletes task", async () => {
    const task = await prisma.task.create({
      data: {
        title: "Delete target",
        status: "TODO",
      },
    });

    const request = new Request(`http://localhost:3000/api/tasks/${task.id}`, {
      method: "DELETE",
    });

    const response = await DELETE(request, context(task.id));

    expect(response.status).toBe(204);

    const saved = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
    });

    expect(saved).toBeNull();
  });
});
