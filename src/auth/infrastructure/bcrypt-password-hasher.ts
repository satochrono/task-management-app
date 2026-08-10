import "server-only";

import bcrypt from "bcryptjs";

import type { PasswordHasher } from "../domain/password-hasher";

export class BcryptPasswordHasher implements PasswordHasher {
  async compare(plainText: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainText, passwordHash);
  }
}
