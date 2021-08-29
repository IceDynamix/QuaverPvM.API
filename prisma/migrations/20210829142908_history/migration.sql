-- CreateTable
CREATE TABLE `UserHistory` (
    `userId` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `rating` DOUBLE NOT NULL,
    `rd` DOUBLE NOT NULL,
    `wins` INTEGER NOT NULL,
    `matchesPlayed` INTEGER NOT NULL,

    INDEX `UserHistory.userId_index`(`userId`),
    PRIMARY KEY (`userId`, `timestamp`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MapHistory` (
    `mapId` INTEGER NOT NULL,
    `mapRate` DOUBLE NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `rating` DOUBLE NOT NULL,
    `rd` DOUBLE NOT NULL,
    `wins` INTEGER NOT NULL,
    `matchesPlayed` INTEGER NOT NULL,

    INDEX `MapHistory.mapId_mapRate_index`(`mapId`, `mapRate`),
    PRIMARY KEY (`mapId`, `mapRate`, `timestamp`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
