/*
  Warnings:

  - You are about to drop the column `signa` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `signa`,
    ADD COLUMN `sigma` DOUBLE NOT NULL DEFAULT 0.06;
