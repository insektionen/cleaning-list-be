-- AlterTable
ALTER TABLE "List" ADD COLUMN     "ownedByHandle" CITEXT;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_ownedByHandle_fkey" FOREIGN KEY ("ownedByHandle") REFERENCES "User"("handle") ON DELETE SET NULL ON UPDATE CASCADE;
