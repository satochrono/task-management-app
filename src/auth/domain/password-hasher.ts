export interface PasswordHasher {
  compare(plainText: string, passwordHash: string): Promise<boolean>;
}
