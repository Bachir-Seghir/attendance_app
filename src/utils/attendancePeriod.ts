
export type AttendancePeriodMode = "CALENDAR" | "COMPANY";

export type DateKey = string; // YYYY-MM-DD

export interface AttendancePeriod {
  mode: AttendancePeriodMode;
  startDate: DateKey;
  endDate: DateKey;
}

export function createDateKey(
  year: number,
  month: number,
  day: number
): DateKey {
  return [
    year,
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

/**
 * month is 1-based (January = 1).
 *
 * COMPANY:
 * 21st of selected month -> 20th of following month.
 *
 * CALENDAR:
 * 1st -> last day of selected month.
 */
export function getAttendancePeriod(
  mode: AttendancePeriodMode,
  year: number,
  month: number
): AttendancePeriod {
  if (mode === "COMPANY") {
    const nextMonth = new Date(Date.UTC(year, month, 1));

    return {
      mode,
      startDate: createDateKey(year, month, 21),
      endDate: createDateKey(
        nextMonth.getUTCFullYear(),
        nextMonth.getUTCMonth() + 1,
        20
      ),
    };
  }

  const lastDay = new Date(
    Date.UTC(year, month, 0)
  ).getUTCDate();

  return {
    mode,
    startDate: createDateKey(year, month, 1),
    endDate: createDateKey(year, month, lastDay),
  };
}

export function addDays(
  date: DateKey,
  amount: number
): DateKey {
  const [year, month, day] = date.split("-").map(Number);

  const result = new Date(Date.UTC(year, month - 1, day));
  result.setUTCDate(result.getUTCDate() + amount);

  return createDateKey(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    result.getUTCDate()
  );
}

export function getDatesBetween(
  startDate: DateKey,
  endDate: DateKey
): DateKey[] {
  const dates: DateKey[] = [];

  let currentDate = startDate;

  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

export function getAttendanceKey(
  employeeId: number,
  date: DateKey
): string {
  return `${employeeId}-${date}`;
}

/**
 * Extract YYYY-MM-DD from an API date.
 */
export function normalizeDateKey(date: string): DateKey {
  return date.slice(0, 10);
}

/**
 * Check Friday or Saturday using UTC.
 */
export function isWeekendDate(date: DateKey): boolean {
  const [year, month, day] = date.split("-").map(Number);

  const weekday = new Date(
    Date.UTC(year, month - 1, day)
  ).getUTCDay();

  return weekday === 5 || weekday === 6;
}
