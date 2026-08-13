import { afterEach, describe, expect, it, vi } from "vitest";

import {
  logAuthenticationFailed,
  logAuthenticationSucceeded,
} from "@/auth/infrastructure/authentication-event-logger";
import { logger } from "@/shared/infrastructure/logging/logger";

describe("authentication event logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs successful authentication without sensitive credentials", () => {
    const infoSpy = vi
      .spyOn(logger, "info")
      .mockImplementation(() => undefined);

    logAuthenticationSucceeded({
      id: "user-1",
      role: "USER",
    });

    expect(infoSpy).toHaveBeenCalledOnce();

    expect(infoSpy).toHaveBeenCalledWith(
      "authentication_succeeded",
      "User authentication succeeded.",
      {
        userId: "user-1",
        role: "USER",
      },
    );

    const serializedCall = JSON.stringify(infoSpy.mock.calls);

    expect(serializedCall).not.toContain("password");
    expect(serializedCall).not.toContain("email");
  });

  it("logs failed authentication without identifying credentials", () => {
    const warnSpy = vi
      .spyOn(logger, "warn")
      .mockImplementation(() => undefined);

    logAuthenticationFailed();

    expect(warnSpy).toHaveBeenCalledOnce();

    expect(warnSpy).toHaveBeenCalledWith(
      "authentication_failed",
      "User authentication failed.",
    );

    const serializedCall = JSON.stringify(warnSpy.mock.calls);

    expect(serializedCall).not.toContain("password");
    expect(serializedCall).not.toContain("email");
  });
});
