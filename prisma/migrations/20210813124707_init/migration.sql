-- CreateTable
CREATE TABLE `User` (
    `userId` INTEGER NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `avatarUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `rating` DOUBLE NOT NULL DEFAULT 1500,
    `rd` DOUBLE NOT NULL DEFAULT 200,
    `sigma` DOUBLE NOT NULL DEFAULT 0.06,
    `wins` INTEGER NOT NULL DEFAULT 0,
    `matchesPlayed` INTEGER NOT NULL DEFAULT 0,
    `banned` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `User.rating_index`(`rating`),
    INDEX `User.rd_index`(`rd`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Map` (
    `mapId` INTEGER NOT NULL,
    `mapsetId` INTEGER NOT NULL,
    `mapRate` DOUBLE NOT NULL DEFAULT 1.0,
    `artist` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `difficultyName` VARCHAR(191) NOT NULL,
    `creator` VARCHAR(191) NOT NULL,
    `difficulty` DOUBLE NOT NULL,
    `rating` DOUBLE NOT NULL DEFAULT 1500,
    `rd` DOUBLE NOT NULL DEFAULT 200,
    `sigma` DOUBLE NOT NULL DEFAULT 0.06,
    `wins` INTEGER NOT NULL DEFAULT 0,
    `matchesPlayed` INTEGER NOT NULL DEFAULT 0,

    INDEX `Map.mapId_mapRate_index`(`mapId`, `mapRate`),
    INDEX `Map.rating_index`(`rating`),
    INDEX `Map.rd_index`(`rd`),
    PRIMARY KEY (`mapId`, `mapRate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Match` (
    `matchId` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `result` ENUM('ONGOING', 'PROCESSING', 'WIN', 'RESIGN', 'TIMEOUT') NOT NULL DEFAULT 'ONGOING',
    `userId` INTEGER NOT NULL,
    `mapId` INTEGER NOT NULL,
    `mapRate` DOUBLE NOT NULL,

    INDEX `Match.userId_index`(`userId`),
    INDEX `Match.mapId_mapRate_index`(`mapId`, `mapRate`),
    PRIMARY KEY (`matchId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Match` ADD FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD FOREIGN KEY (`mapId`, `mapRate`) REFERENCES `Map`(`mapId`, `mapRate`) ON DELETE CASCADE ON UPDATE CASCADE;
