-- CreateTable
CREATE TABLE "AttendanceInterval" (
    "id" TEXT NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceInterval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceInterval_attendanceId_idx" ON "AttendanceInterval"("attendanceId");

-- CreateIndex
CREATE INDEX "AttendanceInterval_groupId_idx" ON "AttendanceInterval"("groupId");

-- AddForeignKey
ALTER TABLE "AttendanceInterval" ADD CONSTRAINT "AttendanceInterval_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
