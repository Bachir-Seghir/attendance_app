/*
  Warnings:

  - A unique constraint covering the columns `[attendanceId]` on the table `CRTransaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CRTransaction_attendanceId_reason_key";

-- CreateIndex
CREATE UNIQUE INDEX "CRTransaction_attendanceId_key" ON "CRTransaction"("attendanceId");
