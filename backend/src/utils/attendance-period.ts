
export interface AttendancePeriodDates {
  startDate: Date;
  endDate: Date;
}

/**
 * Returns the attendance period for a selected month.
 *
 * Example:
 * month = 6, year = 2027
 * Period = 21 May 2027 → 20 June 2027
 *
 * Months use JavaScript indexing:
 * January = 0, December = 11.
 */
export function getAttendancePeriod(
  month: number,
  year: number
): AttendancePeriodDates {
  if (
    !Number.isInteger(month) ||
    month < 0 ||
    month > 11 ||
    !Number.isInteger(year) ||
    year < 2000
  ) {
    throw new Error("Invalid attendance period month or year.");
  }

  return {
    startDate: new Date(Date.UTC(year, month - 1, 21)),
    endDate: new Date(Date.UTC(year, month, 20)),
  };
}

/**
 * Returns the date when the period becomes locked.
 * Officers can modify attendance until the end of the third
 * calendar day after the period end.
 */
export function getAttendancePeriodLockDate(
  endDate: Date
): Date {
  return new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate() + 4
    )
  );
}


export function getAttendancePeriodForDate(date: Date): AttendancePeriodDates {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  // A date from the 21st belongs to the following month's period.
  const selectedMonth = new Date(
    Date.UTC(year, month + (date.getUTCDate() >= 21 ? 1 : 0), 1)
  );

  return getAttendancePeriod(
    selectedMonth.getUTCMonth(),
    selectedMonth.getUTCFullYear()
  );
}
