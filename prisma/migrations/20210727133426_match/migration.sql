/*
  Warnings:

  - You are about to drop the column `matches` on the `map` table. All the data in the column will be lost.
  - You are about to drop the column `matches` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `map` DROP COLUMN `matches`,
    ADD COLUMN `matchesPlayed` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `matches`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `matchesPlayed` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `match` (
    `matchId` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `result` ENUM('ONGOING', 'WIN', 'RESIGN', 'TIMEOUT') NOT NULL DEFAULT 'ONGOING',
    `userId` INTEGER NOT NULL,
    `mapId` INTEGER NOT NULL,
    `mapRate` DOUBLE NOT NULL,

    INDEX `Match.userId_index`(`userId`),
    INDEX `Match.mapId_mapRate_index`(`mapId`, `mapRate`),
    PRIMARY KEY (`matchId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `match` ADD FOREIGN KEY (`userId`) REFERENCES `user`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match` ADD FOREIGN KEY (`mapId`, `mapRate`) REFERENCES `map`(`mapId`, `mapRate`) ON DELETE CASCADE ON UPDATE CASCADE;
