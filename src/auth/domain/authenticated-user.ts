import type { UserRole } from "./user-role";

export type AuthenticatedUser = Readonly<{
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}>;
