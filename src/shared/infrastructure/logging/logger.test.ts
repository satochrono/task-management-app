import { afterEach, describe, expect, it, vi } from "vitest";

import {
  logger,
  sanitizeLogFields,
} from "@/shared/infrastructure/logging/logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes a structured JSON info log", () => {
    const infoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);

    logger.info("test_event", "Test message.", {
      requestId: "request-1",
      status: 200,
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);

    const serialized = infoSpy.mock.calls[0]?.[0];

    expect(typeof serialized).toBe("string");

    const parsed = JSON.parse(serialized as string) as Record<string, unknown>;

    expect(parsed).toMatchObject({
      level: "info",
      event: "test_event",
      message: "Test message.",
      requestId: "request-1",
      status: 200,
    });

    expect(typeof parsed.timestamp).toBe("string");
  });

  it("uses the matching console method for each level", () => {
    const infoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);

    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    logger.info("info_event", "Info.");
    logger.warn("warn_event", "Warn.");
    logger.error("error_event", "Error.");

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("redacts sensitive values recursively", () => {
    const fields = sanitizeLogFields({
      password: "password-value",
      passwordHash: "hash-value",
      AUTH_SECRET: "auth-secret-value",
      DATABASE_URL: "database-url-value",
      headers: {
        authorization: "Bearer secret-token",
        cookie: "session=value",
      },
      nested: {
        csrfToken: "csrf-value",
        safeValue: "visible",
      },
    });

    expect(fields).toEqual({
      password: "[REDACTED]",
      passwordHash: "[REDACTED]",
      AUTH_SECRET: "[REDACTED]",
      DATABASE_URL: "[REDACTED]",
      headers: {
        authorization: "[REDACTED]",
        cookie: "[REDACTED]",
      },
      nested: {
        csrfToken: "[REDACTED]",
        safeValue: "visible",
      },
    });
  });

  it("serializes errors without exposing stack traces", () => {
    const fields = sanitizeLogFields({
      error: new Error("Test failure"),
    });

    expect(fields).toEqual({
      error: {
        name: "Error",
        message: "Test failure",
      },
    });
  });

  it("handles circular values safely", () => {
    const circular: Record<string, unknown> = {
      value: "safe",
    };

    circular.self = circular;

    const fields = sanitizeLogFields({
      circular,
    });

    expect(fields).toEqual({
      circular: {
        value: "safe",
        self: "[Circular]",
      },
    });
  });

  it("does not emit sensitive raw values in serialized logs", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    logger.error("security_test", "Security logging test.", {
      password: "super-secret-password",
      passwordHash: "hashed-password-value",
      AUTH_SECRET: "auth-secret-value",
      DATABASE_URL: "postgresql://user:database-password@localhost:5432/app",
      headers: {
        authorization: "Bearer top-secret-token",
        cookie: "session=top-secret-session",
      },
      csrfToken: "csrf-secret-value",
      nested: {
        accessToken: "access-token-value",
        refreshToken: "refresh-token-value",
      },
      safeValue: "visible-value",
    });

    expect(errorSpy).toHaveBeenCalledOnce();

    const serialized = errorSpy.mock.calls[0]?.[0];

    expect(typeof serialized).toBe("string");

    const output = serialized as string;

    expect(output).not.toContain("super-secret-password");
    expect(output).not.toContain("hashed-password-value");
    expect(output).not.toContain("auth-secret-value");
    expect(output).not.toContain("database-password");
    expect(output).not.toContain("top-secret-token");
    expect(output).not.toContain("top-secret-session");
    expect(output).not.toContain("csrf-secret-value");
    expect(output).not.toContain("access-token-value");
    expect(output).not.toContain("refresh-token-value");

    expect(output).toContain("[REDACTED]");
    expect(output).toContain("visible-value");
  });
});
