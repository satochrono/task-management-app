export type AuthenticationUserRecord = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
};

export interface UserRepository {
  findByEmail(email: string): Promise<AuthenticationUserRecord | null>;
}
