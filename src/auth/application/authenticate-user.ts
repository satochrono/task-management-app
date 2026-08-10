import type { AuthenticatedUser } from "../domain/authenticated-user";
import type { PasswordHasher } from "../domain/password-hasher";
import type { UserRepository } from "../domain/user-repository";

export type AuthenticateUserInput = {
  email: string;
  password: string;
};

export class AuthenticateUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    input: AuthenticateUserInput,
  ): Promise<AuthenticatedUser | null> {
    const email = input.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(email);

    if (user === null) {
      return null;
    }

    const matches = await this.passwordHasher.compare(
      input.password,
      user.passwordHash,
    );

    if (!matches) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
