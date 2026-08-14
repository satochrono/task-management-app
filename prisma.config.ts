import "dotenv/config";

import { defineConfig } from "prisma/config";

const datasourceUrl =
  process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl,
  },
});
