import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { parseServerEnv } from "../src/env.schema";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";

const env = parseServerEnv(process.env);

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const seedTasks = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    title: "要件を確認する",
    description: "業務要件と受入条件を確認する。",
    status: "TODO" as const,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    title: "設計レビューを実施する",
    description: "アプリケーション設計とDB設計をレビューする。",
    status: "IN_PROGRESS" as const,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    title: "初期環境を構築する",
    description: "TypeScriptフルスタック開発環境を構築する。",
    status: "DONE" as const,
  },
];

function validatePassword(name: string, password: string): void {
  const passwordByteLength = new TextEncoder().encode(password).length;

  if (passwordByteLength > 72) {
    throw new Error(`${name} must be at most 72 UTF-8 bytes.`);
  }
}

async function main(): Promise<void> {
  const seedUserEmail = process.env.SEED_USER_EMAIL?.trim().toLowerCase();

  const seedUserPassword = process.env.SEED_USER_PASSWORD;

  if (!seedUserEmail || !seedUserPassword) {
    throw new Error(
      "SEED_USER_EMAIL and SEED_USER_PASSWORD are required for seeding.",
    );
  }

  validatePassword("SEED_USER_PASSWORD", seedUserPassword);

  const passwordHash = await bcrypt.hash(seedUserPassword, 12);

  const user = await prisma.user.upsert({
    where: {
      email: seedUserEmail,
    },
    update: {
      name: "Development User",
      passwordHash,
      role: UserRole.USER,
    },
    create: {
      email: seedUserEmail,
      name: "Development User",
      passwordHash,
      role: UserRole.USER,
    },
  });

  const secondUserEmail =
    process.env.SEED_SECOND_USER_EMAIL?.trim().toLowerCase();

  const secondUserPassword = process.env.SEED_SECOND_USER_PASSWORD;

  const hasSecondUserEmail = Boolean(secondUserEmail);

  const hasSecondUserPassword = Boolean(secondUserPassword);

  if (hasSecondUserEmail !== hasSecondUserPassword) {
    throw new Error(
      "SEED_SECOND_USER_EMAIL and SEED_SECOND_USER_PASSWORD must be provided together.",
    );
  }

  let seededUserCount = 1;

  if (secondUserEmail && secondUserPassword) {
    if (secondUserEmail === seedUserEmail) {
      throw new Error(
        "SEED_SECOND_USER_EMAIL must differ from SEED_USER_EMAIL.",
      );
    }

    validatePassword("SEED_SECOND_USER_PASSWORD", secondUserPassword);

    const secondPasswordHash = await bcrypt.hash(secondUserPassword, 12);

    await prisma.user.upsert({
      where: {
        email: secondUserEmail,
      },
      update: {
        name: "Second Development User",
        passwordHash: secondPasswordHash,
        role: UserRole.USER,
      },
      create: {
        email: secondUserEmail,
        name: "Second Development User",
        passwordHash: secondPasswordHash,
        role: UserRole.USER,
      },
    });

    seededUserCount = 2;
  }

  for (const task of seedTasks) {
    await prisma.task.upsert({
      where: {
        id: task.id,
      },
      update: {
        title: task.title,
        description: task.description,
        status: task.status,
        ownerId: user.id,
      },
      create: {
        ...task,
        ownerId: user.id,
      },
    });
  }

  console.info(
    `Seed completed: ${seededUserCount} user(s) and ${seedTasks.length} tasks.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed.");

    if (error instanceof Error) {
      console.error(error.message);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
