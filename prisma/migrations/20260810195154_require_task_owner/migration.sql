/*
  Warnings:

  - Made the column `owner_id` on table `tasks` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "owner_id" SET NOT NULL;
