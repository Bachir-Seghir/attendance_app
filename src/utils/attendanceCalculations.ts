
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

export function calculateMonthlyTotals(
  employeeId: number,
  attendance: Record<string, string>,
  year: number,
  month: number
): MonthlyHours {
  const daysInMonth = new Date(year, month, 0).getDate();

  let normalHours = 0;
  let overtimeHours = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${employeeId}-${day}`;
    const value = attendance[key] ?? "";

    const date = new Date(year, month - 1, day);
    const isWeekend =
      date.getDay() === 5 || date.getDay() === 6;

    const dailyHours = calculateDailyHours(value, isWeekend);

    normalHours += dailyHours.normalHours;
    overtimeHours += dailyHours.overtimeHours;
  }

  return {
    normalHours,
    overtimeHours,
  };
}
