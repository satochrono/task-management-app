import { beforeEach, describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/tasks/route";
import { prisma } from "@/shared/infrastructure/database/prisma";

const INTEGRATION_USER_ID = "30000000-0000-4000-8000-000000000001";

const INTEGRATION_USER_EMAIL = "integration@example.com";

describe("/api/tasks", () => {
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

  it("creates task", async () => {
    const request = new Request("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "API integration task",
        description: null,
        status: "TODO",
        dueDate: null,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);

    const body = (await response.json()) as {
      data: {
        id: string;
        title: string;
        status: string;
      };
    };

    expect(body.data.title).toBe("API integration task");

    const saved = await prisma.task.findUnique({
      where: {
        id: body.data.id,
      },
    });

    expect(saved).not.toBeNull();
    expect(saved?.ownerId).toBe(INTEGRATION_USER_ID);
  });

  it("returns 400 for invalid input", async () => {
    const request = new Request("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "",
        description: null,
        status: "TODO",
        dueDate: null,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 when ownerId is injected into create input", async () => {
    const injectedOwnerId = "40000000-0000-4000-8000-000000000001";

    const request = new Request("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Ownership injection attempt",
        description: null,
        status: "TODO",
        dueDate: null,
        ownerId: injectedOwnerId,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    const saved = await prisma.task.findFirst({
      where: {
        title: "Ownership injection attempt",
      },
    });

    expect(saved).toBeNull();
  });

  it("returns task list", async () => {
    await prisma.task.create({
      data: {
        title: "Listed task",
        status: "TODO",
        ownerId: INTEGRATION_USER_ID,
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      data: Array<{
        title: string;
      }>;
    };

    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.title).toBe("Listed task");
  });
});
