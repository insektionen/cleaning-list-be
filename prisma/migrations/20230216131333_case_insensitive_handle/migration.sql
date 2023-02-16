/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/

CREATE EXTENSION citext;

-- DropForeignKey
ALTER TABLE "List" DROP CONSTRAINT "List_createdByHandle_fkey";

-- DropForeignKey
ALTER TABLE "ResetToken" DROP CONSTRAINT "ResetToken_userHandle_fkey";

-- DropForeignKey
ALTER TABLE "Secret" DROP CONSTRAINT "Secret_generatedByHandle_fkey";

-- DropForeignKey
ALTER TABLE "UserToken" DROP CONSTRAINT "UserToken_userHandle_fkey";

-- AlterTable
ALTER TABLE "List" ALTER COLUMN "createdByHandle" SET DATA TYPE CITEXT;

-- AlterTable
ALTER TABLE "ResetToken" ALTER COLUMN "userHandle" SET DATA TYPE CITEXT;

-- AlterTable
ALTER TABLE "Secret" ALTER COLUMN "generatedByHandle" SET DATA TYPE CITEXT;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "handle" SET DATA TYPE CITEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("handle");

-- AlterTable
ALTER TABLE "UserToken" ALTER COLUMN "userHandle" SET DATA TYPE CITEXT;

-- AddForeignKey
ALTER TABLE "UserToken" ADD CONSTRAINT "UserToken_userHandle_fkey" FOREIGN KEY ("userHandle") REFERENCES "User"("handle") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_createdByHandle_fkey" FOREIGN KEY ("createdByHandle") REFERENCES "User"("handle") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secret" ADD CONSTRAINT "Secret_generatedByHandle_fkey" FOREIGN KEY ("generatedByHandle") REFERENCES "User"("handle") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResetToken" ADD CONSTRAINT "ResetToken_userHandle_fkey" FOREIGN KEY ("userHandle") REFERENCES "User"("handle") ON DELETE CASCADE ON UPDATE CASCADE;
