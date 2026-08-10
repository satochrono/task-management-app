import { describe, expect, it } from "vitest";

import { AuthenticateUser } from "./authenticate-user";

import type { PasswordHasher } from "../domain/password-hasher";
import type {
  AuthenticationUserRecord,
  UserRepository,
} from "../domain/user-repository";

class FakeUserRepository implements UserRepository {
  constructor(private readonly user: AuthenticationUserRecord | null) {}

  async findByEmail(email: string): Promise<AuthenticationUserRecord | null> {
    void email;

    return this.user;
  }
}

class FakePasswordHasher implements PasswordHasher {
  constructor(private readonly matches: boolean) {}

  async compare(plainText: string, passwordHash: string): Promise<boolean> {
    void plainText;
    void passwordHash;

    return this.matches;
  }
}

describe("AuthenticateUser", () => {
  it("returns the authenticated user when credentials are valid", async () => {
    const service = new AuthenticateUser(
      new FakeUserRepository({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        passwordHash: "hash",
      }),
      new FakePasswordHasher(true),
    );

    await expect(
      service.execute({
        email: " USER@EXAMPLE.COM ",
        password: "password",
      }),
    ).resolves.toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });
  });

  it("returns null when the user does not exist", async () => {
    const service = new AuthenticateUser(
      new FakeUserRepository(null),
      new FakePasswordHasher(true),
    );

    await expect(
      service.execute({
        email: "missing@example.com",
        password: "password",
      }),
    ).resolves.toBeNull();
  });

  it("returns null when the password is invalid", async () => {
    const service = new AuthenticateUser(
      new FakeUserRepository({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        passwordHash: "hash",
      }),
      new FakePasswordHasher(false),
    );

    await expect(
      service.execute({
        email: "user@example.com",
        password: "wrong-password",
      }),
    ).resolves.toBeNull();
  });
});
