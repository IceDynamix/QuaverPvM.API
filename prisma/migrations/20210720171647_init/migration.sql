-- CreateTable
CREATE TABLE `User` (
    `quaverId` INTEGER NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `rating` DOUBLE NOT NULL DEFAULT 1500,
    `rd` DOUBLE NOT NULL DEFAULT 300,
    `signa` DOUBLE NOT NULL DEFAULT 0.06,
    `wins` INTEGER NOT NULL DEFAULT 0,
    `matches` INTEGER NOT NULL DEFAULT 0,
    INDEX `User.rating_index`(`rating`),
    INDEX `User.rd_index`(`rd`),
    PRIMARY KEY (`quaverId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CreateTable
CREATE TABLE `Map` (
    `mapId` INTEGER NOT NULL,
    `mapsetId` INTEGER NOT NULL,
    `artist` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `difficultyName` VARCHAR(191) NOT NULL,
    `creator` VARCHAR(191) NOT NULL,
    `difficulty` DOUBLE NOT NULL,
    `mapRate` DOUBLE NOT NULL DEFAULT 1.0,
    `rating` DOUBLE NOT NULL DEFAULT 1500,
    `rd` DOUBLE NOT NULL DEFAULT 300,
    `sigma` DOUBLE NOT NULL DEFAULT 0.06,
    `wins` INTEGER NOT NULL DEFAULT 0,
    `matches` INTEGER NOT NULL DEFAULT 0,
    INDEX `Map.mapId_mapRate_index`(`mapId`, `mapRate`),
    INDEX `Map.rating_index`(`rating`),
    INDEX `Map.rd_index`(`rd`),
    PRIMARY KEY (`mapId`, `mapRate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- DropIndex
DROP INDEX `Map.mapId_mapRate_unique` ON `map`;
