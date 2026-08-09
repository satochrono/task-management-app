import "dotenv/config";

import { beforeEach } from "vitest";

import { prisma } from "@/shared/infrastructure/database/prisma";
import { assertTestDatabaseUrl } from "@/shared/infrastructure/database/test-database";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined) {
  throw new Error("DATABASE_URL is required for integration tests.");
}

assertTestDatabaseUrl(databaseUrl);

beforeEach(async () => {
  await prisma.task.deleteMany();
});
