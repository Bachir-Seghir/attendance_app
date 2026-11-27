-- CreateEnum
CREATE TYPE "PeriodStartLock" AS ENUM ('AUTO', 'LOCKED', 'UNLOCKED');

-- AlterTable
ALTER TABLE "AttendancePeriod" ADD COLUMN     "periodStartLock" "PeriodStartLock" NOT NULL DEFAULT 'AUTO';
