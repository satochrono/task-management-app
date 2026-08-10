import "server-only";

import { AuthenticateUser } from "./application/authenticate-user";
import { BcryptPasswordHasher } from "./infrastructure/bcrypt-password-hasher";
import { PrismaUserRepository } from "./infrastructure/prisma-user-repository";

const userRepository = new PrismaUserRepository();
const passwordHasher = new BcryptPasswordHasher();

export const authenticateUser = new AuthenticateUser(
  userRepository,
  passwordHasher,
);
