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
  if (/^N[6-8]$/.test(normalizedValue)) {
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

