-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'DEPOSER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DepositRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'CLOSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CLIENT';

-- CreateTable
CREATE TABLE "deposit_requests" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "proposedPrice" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "photos" TEXT[],
    "status" "DepositRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_requests_pkey" PRIMARY KEY ("id")
);
