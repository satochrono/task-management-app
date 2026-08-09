import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { parseServerEnv } from "../src/env.schema";

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

async function main(): Promise<void> {
  for (const task of seedTasks) {
    await prisma.task.upsert({
      where: {
        id: task.id,
      },
      update: {
        title: task.title,
        description: task.description,
        status: task.status,
      },
      create: task,
    });
  }

  console.info(`Seed completed: ${seedTasks.length} tasks.`);
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed.");

    if (error instanceof Error) {
      console.error(error.name);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
