import type { UserRole } from "./user-role";

export type AuthorizationActor = Readonly<{
  userId: string;
  role: UserRole;
}>;
