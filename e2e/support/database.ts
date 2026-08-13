import { PrismaPg } from "@prisma/adapter-pg";

import {
  PrismaClient,
  TaskStatus,
  UserRole,
} from "../../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined) {
  throw new Error("DATABASE_URL is required for E2E tests.");
}

let parsedUrl: URL;

try {
  parsedUrl = new URL(databaseUrl);
} catch {
  throw new Error("Invalid E2E DATABASE_URL.");
}

const databaseName = parsedUrl.pathname.replace(/^\//, "");

if (databaseName !== "task_management_e2e") {
  throw new Error("E2E database must be task_management_e2e.");
}

if (parsedUrl.hostname !== "127.0.0.1" && parsedUrl.hostname !== "localhost") {
  throw new Error("Local E2E database must use localhost PostgreSQL.");
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

export const e2ePrisma = new PrismaClient({
  adapter,
});

export { TaskStatus, UserRole };

export async function resetE2eDatabase(): Promise<void> {
  await e2ePrisma.task.deleteMany();
}

export async function getSeedUser() {
  const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error("SEED_USER_EMAIL is required for E2E tests.");
  }

  const user = await e2ePrisma.user.findUnique({
    where: {
      email,
    },
  });

  if (user === null) {
    throw new Error(`E2E seed user does not exist: ${email}`);
  }

  return user;
}
