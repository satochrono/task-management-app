import { describe, expect, it } from "vitest";

import {
  taskIdSchema,
  taskWriteSchema,
} from "@/modules/task/presentation/schemas/task-schema";

describe("taskIdSchema", () => {
  it("accepts valid UUID", () => {
    const result = taskIdSchema.safeParse(
      "10000000-0000-4000-8000-000000000001",
    );

    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const result = taskIdSchema.safeParse("not-a-uuid");

    expect(result.success).toBe(false);
  });
});

describe("taskWriteSchema", () => {
  const validInput = {
    title: "Task title",
    description: "Description",
    status: "TODO",
    dueDate: null,
  } as const;

  it("accepts valid input", () => {
    const result = taskWriteSchema.safeParse(validInput);

    expect(result.success).toBe(true);
  });

  it("trims title", () => {
    const result = taskWriteSchema.parse({
      ...validInput,
      title: "  Task title  ",
    });

    expect(result.title).toBe("Task title");
  });

  it("rejects empty title", () => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      title: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only title", () => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      title: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("accepts title with exactly 200 characters", () => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      title: "a".repeat(200),
    });

    expect(result.success).toBe(true);
  });

  it("rejects title longer than 200 characters", () => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      title: "a".repeat(201),
    });

    expect(result.success).toBe(false);
  });

  it("accepts null description", () => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      description: null,
    });

    expect(result.success).toBe(true);
  });

  it("accepts description with exactly 4000 characters", () => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      description: "a".repeat(4000),
    });

    expect(result.success).toBe(true);
  });

  it("rejects description longer than 4000 characters", () => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      description: "a".repeat(4001),
    });

    expect(result.success).toBe(false);
  });

  it.each(["TODO", "IN_PROGRESS", "DONE"])("accepts status %s", (status) => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      status,
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown status", () => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      status: "CANCELLED",
    });

    expect(result.success).toBe(false);
  });

  it("accepts ISO datetime with offset", () => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      dueDate: "2026-08-08T10:00:00+09:00",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid datetime", () => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      dueDate: "2026-99-99",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = taskWriteSchema.safeParse({
      ...validInput,
      unexpected: "value",
    });

    expect(result.success).toBe(false);
  });
});
