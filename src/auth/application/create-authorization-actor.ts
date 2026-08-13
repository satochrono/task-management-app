import type { AuthorizationActor } from "@/auth/domain/authorization-actor";
import type { UserRole } from "@/auth/domain/user-role";

type SessionUser = Readonly<{
  id: string;
  role: UserRole;
}>;

export function createAuthorizationActor(
  user: SessionUser,
): AuthorizationActor {
  return {
    userId: user.id,
    role: user.role,
  };
}
