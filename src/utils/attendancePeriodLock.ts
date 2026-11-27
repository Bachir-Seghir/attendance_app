function getAlgeriaDateKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isPartialPeriodDateLocked(
  date: string,
  periodStartDate: string,
  periodMode: "COMPANY" | "CALENDAR"
): boolean {
  if (periodMode !== "COMPANY") return false;

  const today = getAlgeriaDateKey();

  const start = new Date(
    `${periodStartDate.slice(0, 10)}T00:00:00.000Z`
  );

  const lockDate = new Date(start);
  lockDate.setUTCMonth(lockDate.getUTCMonth() + 1);
  lockDate.setUTCDate(5);

  const lockDateKey = lockDate.toISOString().slice(0, 10);

  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);

  const firstPhaseEnd = end.toISOString().slice(0, 10);

  return (
    today >= lockDateKey &&
    date >= periodStartDate.slice(0, 10) &&
    date <= firstPhaseEnd
  );
}