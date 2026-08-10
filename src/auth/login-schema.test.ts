import { describe, expect, it } from "vitest";

import { loginSchema } from "./login-schema";

describe("loginSchema", () => {
  it("normalizes email addresses", () => {
    const result = loginSchema.parse({
      email: " USER@EXAMPLE.COM ",
      password: "password",
    });

    expect(result.email).toBe("user@example.com");
  });

  it("rejects invalid email addresses", () => {
    const result = loginSchema.safeParse({
      email: "invalid",
      password: "password",
    });

    expect(result.success).toBe(false);
  });

  it("rejects passwords longer than bcrypt UTF-8 limit", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "あ".repeat(25),
    });

    expect(result.success).toBe(false);
  });
});
