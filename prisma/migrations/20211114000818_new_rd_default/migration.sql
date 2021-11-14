-- DropForeignKey
ALTER TABLE `Match` DROP FOREIGN KEY `match_ibfk_2`;

-- DropForeignKey
ALTER TABLE `Match` DROP FOREIGN KEY `match_ibfk_1`;

-- AlterTable
ALTER TABLE `Map` MODIFY `rd` DOUBLE NOT NULL DEFAULT 150;

-- AlterTable
ALTER TABLE `User` MODIFY `rd` DOUBLE NOT NULL DEFAULT 150;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_mapId_mapRate_fkey` FOREIGN KEY (`mapId`, `mapRate`) REFERENCES `Map`(`mapId`, `mapRate`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Map` RENAME INDEX `Map.mapId_mapRate_index` TO `Map_mapId_mapRate_idx`;

-- RenameIndex
ALTER TABLE `Map` RENAME INDEX `Map.rating_index` TO `Map_rating_idx`;

-- RenameIndex
ALTER TABLE `Map` RENAME INDEX `Map.rd_index` TO `Map_rd_idx`;

-- RenameIndex
ALTER TABLE `MapHistory` RENAME INDEX `MapHistory.mapId_mapRate_index` TO `MapHistory_mapId_mapRate_idx`;

-- RenameIndex
ALTER TABLE `Match` RENAME INDEX `Match.mapId_mapRate_index` TO `Match_mapId_mapRate_idx`;

-- RenameIndex
ALTER TABLE `Match` RENAME INDEX `Match.userId_index` TO `Match_userId_idx`;

-- RenameIndex
ALTER TABLE `User` RENAME INDEX `User.rating_index` TO `User_rating_idx`;

-- RenameIndex
ALTER TABLE `User` RENAME INDEX `User.rd_index` TO `User_rd_idx`;

-- RenameIndex
ALTER TABLE `UserHistory` RENAME INDEX `UserHistory.userId_index` TO `UserHistory_userId_idx`;
