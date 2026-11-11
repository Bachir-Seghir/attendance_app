-- CreateEnum
CREATE TYPE "CRReason" AS ENUM ('FRIDAY_WORK', 'PUBLIC_HOLIDAY', 'NIGHT_SHIFT', 'RECOVERY_LEAVE');

-- CreateTable
CREATE TABLE "CRTransaction" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "CRReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CRTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CRTransaction_employeeId_date_idx" ON "CRTransaction"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CRTransaction_attendanceId_reason_key" ON "CRTransaction"("attendanceId", "reason");

-- AddForeignKey
ALTER TABLE "CRTransaction" ADD CONSTRAINT "CRTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRTransaction" ADD CONSTRAINT "CRTransaction_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
