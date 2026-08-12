import type { UserRole } from "./user-role";

export type AuthenticationUserRecord = Readonly<{
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: UserRole;
}>;

export interface UserRepository {
  findByEmail(email: string): Promise<AuthenticationUserRecord | null>;
}
