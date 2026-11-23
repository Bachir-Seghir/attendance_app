
import { useMemo, useState } from "react";
import type { Employee, AttendanceRecord } from "../services/api";
import {
  calculateDailyIntervalTotals,
  formatMinutesAsHours,
} from "../utils/attendanceCalculation";
import type { DateKey } from "../utils/attendancePeriod";

interface LogicalInterval {
  groupId: string;
  employeeId: number;
  date: string;
  startMinute: number;
  endMinute: number;
  duration: number;
}

interface AttendanceTableProps {
  startDate: string;
  endDate: string;
  department: string;
  employees: Employee[];
  attendance: AttendanceRecord[];

  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveMessage: string;

  isLoadingEmployees: boolean;
  employeesError: string;
  isLoadingAttendance: boolean;
  attendanceError: string;

  canEditAttendance: boolean;

  onCreateInterval: (
    employeeId: number,
    date: string,
    startMinute: number,
    endMinute: number
  ) => void;

  onUpdateInterval: (
    groupId: string,
    employeeId: number,
    date: string,
    startMinute: number,
    endMinute: number
  ) => void;

  onDeleteInterval: (groupId: string) => void;
  onSaveAttendance: () => void;
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function getDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];

  for (
    let current = startDate.slice(0, 10);
    current <= endDate.slice(0, 10);
    current = addDays(current, 1)
  ) {
    dates.push(current);
  }

  return dates;
}

function formatTime(minute: number): string {
  const normalized = minute % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseTime(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
}

function buildLogicalIntervals(
  attendance: AttendanceRecord[]
): LogicalInterval[] {
  const groups = new Map<
    string,
    {
      employeeId: number;
      segments: {
        date: string;
        startMinute: number;
        endMinute: number;
      }[];
    }
  >();

  for (const record of attendance) {
    for (const interval of record.intervals ?? []) {
      const group = groups.get(interval.groupId) ?? {
        employeeId: record.employeeId,
        segments: [],
      };

      group.segments.push({
        date: record.date.slice(0, 10),
        startMinute: interval.startMinute,
        endMinute: interval.endMinute,
      });

      groups.set(interval.groupId, group);
    }
  }

  return Array.from(groups.entries()).map(([groupId, group]) => {
    const segments = [...group.segments].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const first = segments[0];
    const last = segments[segments.length - 1];

    const dayDifference =
      (Date.parse(`${last.date}T00:00:00.000Z`) -
        Date.parse(`${first.date}T00:00:00.000Z`)) /
      86400000;

    const startMinute = first.startMinute;
    const endMinute = dayDifference * 1440 + last.endMinute;

    return {
      groupId,
      employeeId: group.employeeId,
      date: first.date,
      startMinute,
      endMinute,
      duration: segments.reduce(
        (total, segment) =>
          total + segment.endMinute - segment.startMinute,
        0
      ),
    };
  });
}

function AttendanceTable({
  startDate,
  endDate,
  department,
  employees,
  attendance,
  hasUnsavedChanges,
  isSaving,
  saveMessage,
  isLoadingEmployees,
  employeesError,
  isLoadingAttendance,
  attendanceError,
  canEditAttendance,
  onCreateInterval,
  onUpdateInterval,
  onDeleteInterval,
  onSaveAttendance,
}: AttendanceTableProps) {
  const dates = useMemo(
    () => getDates(startDate, endDate),
    [startDate, endDate]
  );

  const logicalIntervals = useMemo(
    () => buildLogicalIntervals(attendance),
    [attendance]
  );

  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [quickValues, setQuickValues] = useState<Record<string, string>>({});
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");

  const filteredEmployees =
    department === "all"
      ? employees
      : employees.filter(
          (employee) => employee.department?.name === department
        );

  const getCellKey = (employeeId: number, date: string) =>
    `${employeeId}-${date}`;

 const getCellIntervals = (employeeId: number, date: string) =>
  logicalIntervals.filter((interval) => {
    if (interval.employeeId !== employeeId) return false;

    const intervalStartDate = new Date(
      `${interval.date}T00:00:00.000Z`
    );

    const cellDate = new Date(`${date}T00:00:00.000Z`);

    const dayOffset = Math.round(
      (cellDate.getTime() - intervalStartDate.getTime()) /
        86_400_000
    );

    // Minutes of this calendar day relative to the interval's start date
    const dayStart = dayOffset * 1440;
    const dayEnd = dayStart + 1440;

    // Check whether the interval overlaps this day
    return (
      interval.startMinute < dayEnd &&
      interval.endMinute > dayStart
    );
  });

  const getIntervalSegmentForDate = (
  interval: (typeof logicalIntervals)[number],
  date: string
) => {
  const intervalStartDate = new Date(
    `${interval.date}T00:00:00.000Z`
  );

  const cellDate = new Date(`${date}T00:00:00.000Z`);

  const dayOffset = Math.round(
    (cellDate.getTime() - intervalStartDate.getTime()) /
      86_400_000
  );

  const dayStart = dayOffset * 1440;
  const dayEnd = dayStart + 1440;

  return {
    startMinute:
      Math.max(interval.startMinute, dayStart) - dayStart,
    endMinute:
      Math.min(interval.endMinute, dayEnd) - dayStart,
  };
};

const formatSegmentTime = (minute: number) =>
  minute === 1440 ? "24:00" : formatTime(minute);
  
  const getDailyTotals = (employeeId: number, date: string) => {
    const record = attendance.find(
      (item) =>
        item.employeeId === employeeId &&
        item.date.slice(0, 10) === date
    );

    return calculateDailyIntervalTotals(
      record?.intervals ?? [],
      date as DateKey
    );
  };

  const getEmployeeTotals = (employeeId: number) => {
    return dates.reduce(
      (totals, date) => {
        const daily = getDailyTotals(employeeId, date);

        totals.r1 += daily.r1Minutes;
        totals.r2 += daily.r2Minutes;
        totals.r3 += daily.r3Minutes;

        return totals;
      },
      { r1: 0, r2: 0, r3: 0 }
    );
  };

  const openNewInterval = (employeeId: number, date: string) => {
    setActiveCell(getCellKey(employeeId, date));
    setEditingGroupId(null);
    setStartTime("08:00");
    setEndTime("16:00");
  };

  const openEditInterval = (interval: LogicalInterval) => {
    setActiveCell(getCellKey(interval.employeeId, interval.date));
    setEditingGroupId(interval.groupId);
    setStartTime(formatTime(interval.startMinute));
    setEndTime(formatTime(interval.endMinute));
  };

  const saveIntervalDraft = (
    employeeId: number,
    date: string
  ) => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (start === null || end === null) {
      window.alert("Invalid time. Use HH:MM.");
      return;
    }

    // An end time earlier than or equal to the start
    // means the interval finishes on the following day.
    const absoluteEnd = end <= start ? end + 1440 : end;

    if (absoluteEnd - start <= 0) return;

    if (editingGroupId) {
      onUpdateInterval(
        editingGroupId,
        employeeId,
        date,
        start,
        absoluteEnd
      );
    } else {
      onCreateInterval(employeeId, date, start, absoluteEnd);
    }

    setEditingGroupId(null);
    setActiveCell(null);
  };

  const handleQuickEntry = (
    employeeId: number,
    date: string
  ) => {
    const key = getCellKey(employeeId, date);
    const hours = Number(quickValues[key]);

    if (!Number.isInteger(hours) || hours < 1 || hours > 8) {
      return;
    }

    onCreateInterval(
      employeeId,
      date,
      480,
      480 + hours * 60
    );

    setQuickValues((previous) => ({
      ...previous,
      [key]: "",
    }));

    setActiveCell(null);
  };

  const isWeekend = (date: string) => {
    const day = new Date(
      `${date}T00:00:00.000Z`
    ).getUTCDay();

    return day === 5 || day === 6;
  };

  if (isLoadingEmployees || isLoadingAttendance) {
    return <p className="p-6">Loading attendance...</p>;
  }

  if (employeesError || attendanceError) {
    return (
      <div className="p-6 text-red-600">
        {employeesError || attendanceError}
      </div>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">
            Monthly Attendance
          </h2>
          <p className="text-sm text-gray-500">
            {startDate} — {endDate}
          </p>
        </div>

        {canEditAttendance && (
          <button
            type="button"
            onClick={onSaveAttendance}
            disabled={!hasUnsavedChanges || isSaving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-40"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {saveMessage && (
        <p className="px-5 py-2 text-sm text-gray-600">
          {saveMessage}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="border-collapse text-sm min-w-max w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="sticky left-0 z-20 bg-gray-100 px-3 py-3 text-left min-w-48">
                Employee
              </th>
              <th className="px-3 py-3 min-w-16">HN</th>
              <th className="px-3 py-3 min-w-16">HS</th>
              <th className="px-3 py-3 min-w-16">CR</th>

              {dates.map((date) => {
                const weekday = new Date(
                  `${date}T00:00:00.000Z`
                ).toLocaleDateString("fr-FR", {
                  weekday: "short",
                  timeZone: "UTC",
                });

                return (
                  <th
                    key={date}
                    className={`px-2 py-2 min-w-16 text-center ${
                      isWeekend(date) ? "bg-red-300" : ""
                    }`}
                  >
                    <div>{Number(date.slice(8, 10))}</div>
                    <div className="text-xs font-normal">
                      {weekday.charAt(0).toUpperCase()}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredEmployees.map((employee) => {
              const totals = getEmployeeTotals(employee.id);

              return (
                <tr key={employee.id} className="border-t">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium">
                    {employee.name}
                  </td>

                  <td className="text-center font-semibold">
                    {formatMinutesAsHours(totals.r1)}
                  </td>

                  <td className="text-center font-semibold">
                    {formatMinutesAsHours(
                      totals.r2 + totals.r3
                    )}
                  </td>

                  <td className="text-center">—</td>

                  {dates.map((date) => {
                    const key = getCellKey(employee.id, date);
                    const intervals = getCellIntervals(
                      employee.id,
                      date
                    );

                    const totalsForDay = getDailyTotals(
                      employee.id,
                      date
                    );

                    const isActive = activeCell === key;

                    const quickValue = quickValues[key] ?? "";

                    return (
                      <td
                        key={date}
                        className={`border-l p-1 text-center align-top ${
                          isWeekend(date) ? "bg-red-50" : ""
                        }`}
                        onBlur={(event) => {
                          if (
                            !event.currentTarget.contains(
                              event.relatedTarget
                            )
                          ) {
                            setActiveCell((current) =>
                              current === key ? null : current
                            );
                          }
                        }}
                      >
                        {!isActive ? (
                          <div className="flex flex-col items-center gap-1">
                            {intervals.length > 0 ? (
                              <>
                                <button
                                  type="button"
                                  className="font-semibold text-blue-700 hover:underline"
                                  onClick={() =>
                                    setActiveCell(key)
                                  }
                                >
                                  {formatMinutesAsHours(
                                    totalsForDay.totalMinutes
                                  )}
                                </button>
                                <span className="text-xs text-gray-500">
                                  {intervals.length} interval(s)
                                </span>
                              </>
                            ) : canEditAttendance ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openNewInterval(
                                    employee.id,
                                    date
                                  )
                                }
                                className="w-8 h-8 rounded border border-gray-300 hover:bg-blue-50"
                              >
                                +
                              </button>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}

                            {canEditAttendance &&
                              intervals.length === 0 && (
                                <input
                                  type="number"
                                  min="1"
                                  max="8"
                                  value={quickValue}
                                  placeholder="h"
                                  className="w-10 text-center text-xs border rounded"
                                  onChange={(event) =>
                                    setQuickValues((previous) => ({
                                      ...previous,
                                      [key]: event.target.value,
                                    }))
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      handleQuickEntry(
                                        employee.id,
                                        date
                                      );
                                    }
                                  }}
                                  onBlur={() => {
                                    if (quickValue) {
                                      handleQuickEntry(
                                        employee.id,
                                        date
                                      );
                                    }
                                  }}
                                />
                              )}
                          </div>
                        ) : (
                          <div className="min-w-52 p-2 bg-white border rounded-lg shadow-sm space-y-2">
                            <div className="flex justify-between items-center">
                              <strong className="text-xs">
                                {date}
                              </strong>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveCell(null)
                                }
                                className="text-gray-500"
                              >
                                ×
                              </button>
                            </div>

                            {intervals.map((interval) => {
  const segment = getIntervalSegmentForDate(interval, date);

  return (
    <div
      key={interval.groupId}
      className="flex items-center justify-between gap-2 text-xs"
    >
      <span>
        {formatSegmentTime(segment.startMinute)}
        {" – "}
        {formatSegmentTime(segment.endMinute)}
      </span>

      {canEditAttendance && (
        <span className="flex gap-1">
          <button
            type="button"
            className="text-blue-600"
            onClick={() => openEditInterval(interval)}
          >
            Edit
          </button>

          <button
            type="button"
            className="text-red-600"
            onClick={() =>
              onDeleteInterval(interval.groupId)
            }
          >
            Delete
          </button>
        </span>
      )}
    </div>
  );
})}

                            <div className="text-xs text-gray-600 border-t pt-2">
                              R1: {formatMinutesAsHours(totalsForDay.r1Minutes)}
                              {" | "}
                              R2: {formatMinutesAsHours(totalsForDay.r2Minutes)}
                              {" | "}
                              R3: {formatMinutesAsHours(totalsForDay.r3Minutes)}
                            </div>

                            {canEditAttendance && (
                              <>
                                <div className="flex gap-2">
                                  <label className="flex-1 text-xs">
                                    Start
                                    <input
                                      type="time"
                                      value={startTime}
                                      onChange={(event) =>
                                        setStartTime(event.target.value)
                                      }
                                      className="w-full border rounded p-1"
                                    />
                                  </label>

                                  <label className="flex-1 text-xs">
                                    End
                                    <input
                                      type="time"
                                      value={endTime}
                                      onChange={(event) =>
                                        setEndTime(event.target.value)
                                      }
                                      className="w-full border rounded p-1"
                                    />
                                  </label>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      saveIntervalDraft(
                                        employee.id,
                                        editingGroupId
                                          ? logicalIntervals.find(
                                              (item) =>
                                                item.groupId === editingGroupId
                                            )?.date ?? date
                                          : date
                                      )
                                    }
                                    className="flex-1 bg-blue-600 text-white rounded py-1"
                                  >
                                    {editingGroupId ? "Update" : "Add interval"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingGroupId(null);
                                      setActiveCell(null);
                                    }}
                                    className="px-2 border rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AttendanceTable;
