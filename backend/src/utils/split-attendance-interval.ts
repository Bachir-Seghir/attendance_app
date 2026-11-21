
export interface AttendanceIntervalSegment {
  date: string;
  startMinute: number;
  endMinute: number;
  groupId: string;
}

interface SplitAttendanceIntervalInput {
  date: string;
  startMinute: number;
  endMinute: number;
  groupId: string;
}

function addOneDay(date: string): string {
  const currentDate = new Date(`${date}T00:00:00.000Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(currentDate.getTime()) ||
    currentDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Invalid attendance date");
  }

  currentDate.setUTCDate(currentDate.getUTCDate() + 1);

  return currentDate.toISOString().slice(0, 10);
}

export function splitAttendanceInterval({
  date,
  startMinute,
  endMinute,
  groupId,
}: SplitAttendanceIntervalInput): AttendanceIntervalSegment[] {
  // Validate date.
  addOneDay(date);

  // Validate times.
  if (
    !Number.isInteger(startMinute) ||
    !Number.isInteger(endMinute) ||
    startMinute < 0 ||
    startMinute >= 1440 ||
    endMinute < 0 ||
    endMinute >= 1440
  ) {
    throw new Error("Invalid attendance time");
  }

  if (startMinute === endMinute) {
    throw new Error("Start and end times cannot be equal");
  }

  if (!groupId || typeof groupId !== "string" || groupId.length > 100) {
    throw new Error("Invalid interval groupId");
  }

  // Same-day interval.
  if (endMinute > startMinute) {
    return [
      {
        date,
        startMinute,
        endMinute,
        groupId,
      },
    ];
  }

  // Overnight interval.
  const nextDate = addOneDay(date);

  return [
    {
      date,
      startMinute,
      endMinute: 1440,
      groupId,
    },
    {
      date: nextDate,
      startMinute: 0,
      endMinute,
      groupId,
    },
  ];
}
