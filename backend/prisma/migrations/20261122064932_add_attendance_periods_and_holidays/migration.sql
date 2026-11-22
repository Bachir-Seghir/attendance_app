-- CreateTable
CREATE TABLE "AttendancePeriod" (
    "id" SERIAL NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "previousPeriodUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "holidaysConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodHolidayOverride" (
    "id" SERIAL NOT NULL,
    "periodId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "isHoliday" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodHolidayOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendancePeriod_startDate_endDate_idx" ON "AttendancePeriod"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePeriod_startDate_endDate_key" ON "AttendancePeriod"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "PublicHoliday_date_key" ON "PublicHoliday"("date");

-- CreateIndex
CREATE INDEX "PeriodHolidayOverride_date_idx" ON "PeriodHolidayOverride"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodHolidayOverride_periodId_date_key" ON "PeriodHolidayOverride"("periodId", "date");

-- AddForeignKey
ALTER TABLE "PeriodHolidayOverride" ADD CONSTRAINT "PeriodHolidayOverride_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AttendancePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
