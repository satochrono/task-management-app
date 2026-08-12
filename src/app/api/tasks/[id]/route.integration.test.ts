import { beforeEach, describe, expect, it } from "vitest";

import { DELETE, GET, PUT } from "@/app/api/tasks/[id]/route";
import { prisma } from "@/shared/infrastructure/database/prisma";

const INTEGRATION_USER_ID = "30000000-0000-4000-8000-000000000001";

const INTEGRATION_USER_EMAIL = "integration@example.com";

function context(id: string) {
  return {
    params: Promise.resolve({
      id,
    }),
  };
}

describe("/api/tasks/[id]", () => {
  beforeEach(async () => {
    await prisma.task.deleteMany();

    await prisma.user.upsert({
      where: {
        email: INTEGRATION_USER_EMAIL,
      },
      update: {
        id: INTEGRATION_USER_ID,
        name: "Integration User",
        role: "ADMIN",
      },
      create: {
        id: INTEGRATION_USER_ID,
        email: INTEGRATION_USER_EMAIL,
        name: "Integration User",
        passwordHash: "integration-test-password-hash",
        role: "ADMIN",
      },
    });
  });

  it("returns task detail", async () => {
    const task = await prisma.task.create({
      data: {
        title: "Detail task",
        status: "TODO",
        ownerId: INTEGRATION_USER_ID,
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
        ownerId: INTEGRATION_USER_ID,
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
    expect(saved?.ownerId).toBe(INTEGRATION_USER_ID);
  });

  it("returns 400 when ownerId is injected into update input", async () => {
    const injectedOwnerId = "40000000-0000-4000-8000-000000000001";

    const task = await prisma.task.create({
      data: {
        title: "Before ownership injection",
        status: "TODO",
        ownerId: INTEGRATION_USER_ID,
      },
    });

    const request = new Request(`http://localhost:3000/api/tasks/${task.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "After ownership injection",
        description: null,
        status: "IN_PROGRESS",
        dueDate: null,
        ownerId: injectedOwnerId,
      }),
    });

    const response = await PUT(request, context(task.id));

    expect(response.status).toBe(400);

    const saved = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
    });

    expect(saved).not.toBeNull();
    expect(saved?.title).toBe("Before ownership injection");
    expect(saved?.status).toBe("TODO");
    expect(saved?.ownerId).toBe(INTEGRATION_USER_ID);
  });

  it("returns 409 for invalid business transition", async () => {
    const task = await prisma.task.create({
      data: {
        title: "Completed",
        status: "DONE",
        ownerId: INTEGRATION_USER_ID,
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
        ownerId: INTEGRATION_USER_ID,
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
