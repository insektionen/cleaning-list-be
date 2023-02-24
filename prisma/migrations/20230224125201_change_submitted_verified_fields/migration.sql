/*
  Warnings:

  - You are about to drop the column `submitted` on the `List` table. All the data in the column will be lost.
  - You are about to drop the column `verified` on the `List` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "List" DROP COLUMN "submitted",
DROP COLUMN "verified",
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ListVerification" (
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listId" INTEGER NOT NULL,
    "userHandle" CITEXT NOT NULL,

    CONSTRAINT "ListVerification_pkey" PRIMARY KEY ("listId")
);

-- AddForeignKey
ALTER TABLE "ListVerification" ADD CONSTRAINT "ListVerification_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListVerification" ADD CONSTRAINT "ListVerification_userHandle_fkey" FOREIGN KEY ("userHandle") REFERENCES "User"("handle") ON DELETE CASCADE ON UPDATE CASCADE;
