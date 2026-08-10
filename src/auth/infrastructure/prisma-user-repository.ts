import "server-only";

import type {
  AuthenticationUserRecord,
  UserRepository,
} from "../domain/user-repository";

import { prisma } from "@/shared/infrastructure/database/prisma";

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<AuthenticationUserRecord | null> {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
      },
    });

    if (user === null) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
    };
  }
}
