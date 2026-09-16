-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "resetTokenExpira" TIMESTAMP(3);
