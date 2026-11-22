import {
  type DateKey,
  getAttendanceKey,
  isWeekendDate,
} from "./attendancePeriod";

export interface DailyHours {
  normalHours: number;
  overtimeHours: number;
}

export function calculateDailyHours(
  value: string,
  isWeekend: boolean
): DailyHours {
  const hours = Math.max(0, Number(value) || 0);
  const normalizedValue = value.trim().toUpperCase();
// Night shift: N6, N7, N8
  // All hours count as overtime, regardless of the day.
  if (/^N(?:[1-9]|1[0-2])$/.test(normalizedValue)) {
    return {
      normalHours: 0,
      overtimeHours: Number(normalizedValue.substring(1)),
    };
  }
  if (isWeekend) {
    return {
      normalHours: 0,
      overtimeHours: hours,
    };
  }

  return {
    normalHours: Math.min(hours, 8),
    overtimeHours: Math.max(hours - 8, 0),
  };
}



export interface MonthlyHours {
  normalHours: number;
  overtimeHours: number;
}

export function calculatePeriodTotals(
  employeeId: number,
  attendance: Record<string, string>,
  dates: DateKey[]
): MonthlyHours {
  let normalHours = 0;
  let overtimeHours = 0;

  for (const date of dates) {
    const key = getAttendanceKey(employeeId, date);
    const value = attendance[key] ?? "";

    const dailyHours = calculateDailyHours(
      value,
      isWeekendDate(date)
    );

    normalHours += dailyHours.normalHours;
    overtimeHours += dailyHours.overtimeHours;
  }

  return {
    normalHours,
    overtimeHours,
  };
}


export interface IntervalTotals {
  r1Minutes: number;
  r2Minutes: number;
  r3Minutes: number;
  totalMinutes: number;
}

function getOverlapMinutes(
  start: number,
  end: number,
  rangeStart: number,
  rangeEnd: number
): number {
  return Math.max(
    0,
    Math.min(end, rangeEnd) - Math.max(start, rangeStart)
  );
}

export function calculateDailyIntervalTotals(
  intervals: {
    startMinute: number;
    endMinute: number;
  }[],
  date: DateKey,
  publicHolidayDates: Set<string> = new Set()
): IntervalTotals {
  const totals: IntervalTotals = {
    r1Minutes: 0,
    r2Minutes: 0,
    r3Minutes: 0,
    totalMinutes: 0,
  };

  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();

  const isR3Day =
    day === 5 || publicHolidayDates.has(date);

  for (const interval of intervals) {
    const { startMinute, endMinute } = interval;

    if (endMinute <= startMinute) continue;

    if (isR3Day) {
      totals.r3Minutes += endMinute - startMinute;
      continue;
    }

    // R3: 00:00–05:00 and 21:00–24:00
    totals.r3Minutes += getOverlapMinutes(
      startMinute, endMinute, 0, 300
    );

    totals.r3Minutes += getOverlapMinutes(
      startMinute, endMinute, 1260, 1440
    );

    if (day === 6) {
      // Saturday: 05:00–21:00 = R2
      totals.r2Minutes += getOverlapMinutes(
        startMinute, endMinute, 300, 1260
      );
      continue;
    }

    // Sunday–Thursday
    totals.r2Minutes += getOverlapMinutes(
      startMinute, endMinute, 300, 480
    );

    totals.r1Minutes += getOverlapMinutes(
      startMinute, endMinute, 480, 960
    );

    totals.r2Minutes += getOverlapMinutes(
      startMinute, endMinute, 960, 1260
    );
  }

  totals.totalMinutes =
    totals.r1Minutes +
    totals.r2Minutes +
    totals.r3Minutes;

  return totals;
}

export function formatMinutesAsHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0
    ? `${hours}`
    : `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
}
