import { describe, expect, it } from "vitest";

import type { AuthorizationActor } from "@/auth/domain/authorization-actor";
import { createTaskAccessScope } from "@/modules/task/domain/task-access-scope";

describe("createTaskAccessScope", () => {
  it("creates an owner scope for a USER", () => {
    const actor: AuthorizationActor = {
      userId: "user-1",
      role: "USER",
    };

    expect(createTaskAccessScope(actor)).toEqual({
      kind: "OWNER",
      ownerId: "user-1",
    });
  });

  it("creates an all scope for an ADMIN", () => {
    const actor: AuthorizationActor = {
      userId: "admin-1",
      role: "ADMIN",
    };

    expect(createTaskAccessScope(actor)).toEqual({
      kind: "ALL",
    });
  });
});
