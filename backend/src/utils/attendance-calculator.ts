
export interface AttendanceIntervalInput {
  startMinute: number;
  endMinute: number;
}

export interface DailyAttendanceSummary {
  r1Minutes: number;
  r2Minutes: number;
  r3Minutes: number;
  totalMinutes: number;
  r1Hours: number;
  r2Hours: number;
  r3Hours: number;
  totalHours: number;
}

export function calculateDailyAttendance(
  date: string,
  intervals: AttendanceIntervalInput[],
  isPublicHoliday = false
): DailyAttendanceSummary {
  // Parse the date using UTC to avoid timezone inconsistencies.
  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Invalid attendance date");
  }

  const day = parsedDate.getUTCDay();

  // Validate intervals.
  const sortedIntervals = [...intervals].sort(
    (a, b) => a.startMinute - b.startMinute
  );

  for (const interval of sortedIntervals) {
    if (
      !Number.isInteger(interval.startMinute) ||
      !Number.isInteger(interval.endMinute) ||
      interval.startMinute < 0 ||
      interval.endMinute > 1440 ||
      interval.startMinute >= interval.endMinute
    ) {
      throw new Error("Invalid attendance interval");
    }
  }

  // Reject overlapping intervals.
  for (let i = 1; i < sortedIntervals.length; i++) {
    if (
      sortedIntervals[i].startMinute <
      sortedIntervals[i - 1].endMinute
    ) {
      throw new Error("Attendance intervals cannot overlap");
    }
  }

  let r1Minutes = 0;
  let r2Minutes = 0;
  let r3Minutes = 0;

  
for (const interval of sortedIntervals) {
  const { startMinute, endMinute } = interval;

  // Friday or public holiday: everything is R3.
  if (isPublicHoliday || day === 5) {
    r3Minutes += endMinute - startMinute;
    continue;
  }

  // Night: 00:00–05:00 and 21:00–24:00 are R3.
  r3Minutes += getOverlapMinutes(
    startMinute, endMinute, 0, 300
  );

  r3Minutes += getOverlapMinutes(
    startMinute, endMinute, 1260, 1440
  );

  // Saturday: 05:00–21:00 is R2.
  if (day === 6) {
    r2Minutes += getOverlapMinutes(
      startMinute, endMinute, 300, 1260
    );
    continue;
  }

  // Sunday–Thursday: 05:00–08:00 is R2.
  r2Minutes += getOverlapMinutes(
    startMinute, endMinute, 300, 480
  );

  // Sunday–Thursday: 08:00–16:00 is R1.
  r1Minutes += getOverlapMinutes(
    startMinute, endMinute, 480, 960
  );

  // Sunday–Thursday: 16:00–21:00 is R2.
  r2Minutes += getOverlapMinutes(
    startMinute, endMinute, 960, 1260
  );
}


  const totalMinutes = r1Minutes + r2Minutes + r3Minutes;

  return {
    r1Minutes,
    r2Minutes,
    r3Minutes,
    totalMinutes,

    r1Hours: r1Minutes / 60,
    r2Hours: r2Minutes / 60,
    r3Hours: r3Minutes / 60,
    totalHours: totalMinutes / 60,
  };
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