-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('DEVICES', 'TOOLS', 'BOOKS', 'LEISURE', 'APPAREL');

-- AlterTable
ALTER TABLE "Item"
ADD COLUMN "category" "ItemCategory" NOT NULL DEFAULT 'DEVICES',
ADD COLUMN "locationDetail" TEXT;
