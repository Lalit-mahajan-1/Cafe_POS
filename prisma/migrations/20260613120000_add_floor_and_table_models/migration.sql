-- CreateEnum
CREATE TYPE "TableShape" AS ENUM ('round', 'square', 'booth');

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main Floor',
    "rows" INTEGER NOT NULL,
    "cols" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 4,
    "width" INTEGER NOT NULL DEFAULT 2,
    "height" INTEGER NOT NULL DEFAULT 2,
    "shape" "TableShape" NOT NULL DEFAULT 'round',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "floorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
