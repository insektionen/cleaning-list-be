-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MOD', 'MANAGER', 'BASE');

-- CreateTable
CREATE TABLE "User" (
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'BASE',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("handle")
);

-- CreateTable
CREATE TABLE "UserToken" (
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userHandle" TEXT NOT NULL,

    CONSTRAINT "UserToken_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "List" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "fields" JSONB NOT NULL,
    "colors" JSONB,
    "responsible" TEXT,
    "phoneNumber" TEXT,
    "eventDate" TEXT,
    "comment" TEXT,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByHandle" TEXT NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secret" (
    "id" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "generatedByHandle" TEXT NOT NULL,

    CONSTRAINT "Secret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResetToken" (
    "resetToken" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "userHandle" TEXT NOT NULL,

    CONSTRAINT "ResetToken_pkey" PRIMARY KEY ("resetToken")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserToken_userHandle_key" ON "UserToken"("userHandle");

-- CreateIndex
CREATE UNIQUE INDEX "ResetToken_userHandle_key" ON "ResetToken"("userHandle");

-- AddForeignKey
ALTER TABLE "UserToken" ADD CONSTRAINT "UserToken_userHandle_fkey" FOREIGN KEY ("userHandle") REFERENCES "User"("handle") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_createdByHandle_fkey" FOREIGN KEY ("createdByHandle") REFERENCES "User"("handle") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secret" ADD CONSTRAINT "Secret_generatedByHandle_fkey" FOREIGN KEY ("generatedByHandle") REFERENCES "User"("handle") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResetToken" ADD CONSTRAINT "ResetToken_userHandle_fkey" FOREIGN KEY ("userHandle") REFERENCES "User"("handle") ON DELETE CASCADE ON UPDATE CASCADE;
