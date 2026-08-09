import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/tasks/route";
import { prisma } from "@/shared/infrastructure/database/prisma";

describe("/api/tasks", () => {
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

  it("returns task list", async () => {
    await prisma.task.create({
      data: {
        title: "Listed task",
        status: "TODO",
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
