import type { AuthorizationActor } from "@/auth/domain/authorization-actor";

export type TaskAccessScope =
  | Readonly<{
      kind: "ALL";
    }>
  | Readonly<{
      kind: "OWNER";
      ownerId: string;
    }>;

export function createTaskAccessScope(
  actor: AuthorizationActor,
): TaskAccessScope {
  if (actor.role === "ADMIN") {
    return {
      kind: "ALL",
    };
  }

  return {
    kind: "OWNER",
    ownerId: actor.userId,
  };
}
