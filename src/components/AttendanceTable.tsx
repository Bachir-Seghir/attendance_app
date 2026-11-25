

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



    //* Minutes of this calendar day relative to the interval's start date*

    const dayStart = dayOffset * 1440;

    const dayEnd = dayStart + 1440;



    //* Check whether the interval overlaps this day*

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



    //* An end time earlier than or equal to the start*

    //* means the interval finishes on the following day.*

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

    <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#084b54] to-[#084b54] text-white shadow-lg shadow-slate-400">

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">

        <div>

          <h2 className="text-lg font-bold tracking-tight text-white">

            Monthly Attendance

          </h2>

          <p className="mt-1 text-sm text-white">

            {startDate} — {endDate}

          </p>

        </div>



        {canEditAttendance && (

          <button

            type="button"

            onClick={onSaveAttendance}

            disabled={!hasUnsavedChanges || isSaving}

            className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-90"

          >

            {isSaving ? "Saving..." : "Save attendance"}

          </button>

        )}

      </div>



      {saveMessage && (

        <p className=" text-end font-semibold  bg-blue-50 px-6 py-3 text-md text-orange-500">

          {saveMessage}

        </p>

      )}



      <div className="overflow-x-auto">

        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">

          <thead>

  {/* Master headers */}
          <tr className="bg-gradient-to-r from-[#084b54] to-[#084b54] text-white">
            <th
              rowSpan={2}
              className="sticky left-0 z-30 min-w-52 border-r border-white/15 px-4 py-4 text-left font-semibold bg-[#084b54]"
            >
              Employee
            </th>
            <th colSpan={1} className="min-w-16 border-r border-white/15 px-3 py-3 text-center font-bold">
              HN
            </th>
            <th colSpan={2} className="min-w-32 border-r border-white/15 px-3 py-3 text-center font-bold">
              HS
            </th>
            <th rowSpan={2} className="min-w-20 border-r border-white/15 px-3 py-3 text-center font-bold">
              All
            </th>
            <th rowSpan={2} className="min-w-16 border-r border-white/15 px-3 py-3 text-center font-bold">
              CR
            </th>
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
                  rowSpan={2}
                  className={`min-w-16 border-l border-white/10 px-2 py-3 text-center ${
                    isWeekend(date) ? "bg-orange-500" : ""
                  }`}
                >
                  <div className="text-sm font-bold">
                    {Number(date.slice(8, 10))}
                  </div>
                  <div className="text-xs font-medium text-blue-100">
                    {weekday.charAt(0).toUpperCase()}
                  </div>
                </th>
              );
            })}
          </tr>

          {/* Slave headers */}
          <tr className="bg-blue-50 text-slate-700">
            <th className="min-w-16 border-b border-r border-blue-100 px-3 py-2 text-center text-xs font-bold">
              R1
            </th>
            <th className="min-w-16 border-b border-r border-blue-100 px-3 py-2 text-center text-xs font-bold">
              R2
            </th>
            <th className="min-w-16 border-b border-r border-blue-100 px-3 py-2 text-center text-xs font-bold">
              R3
            </th>
          </tr>

          </thead>



          <tbody>

            {filteredEmployees.map((employee) => {

              const totals = getEmployeeTotals(employee.id);



              return (

                <tr
                  key={employee.id}
                  className="group transition-colors hover:bg-blue-50/40"
                >
                  <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3 group-hover:bg-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {employee.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <span className="whitespace-nowrap font-semibold text-slate-700">
                        {employee.name}
                      </span>
                    </div>
                  </td>

                  {/* R1 = HN */}
                  <td className="border-r border-b border-slate-300 px-3 py-3 text-center font-semibold text-slate-700 bg-slate-100">
                    {formatMinutesAsHours(totals.r1)}
                  </td>

                  {/* R2 = part of HS */}
                  <td className="border-r border-b border-slate-300 px-3 py-3 text-center font-semibold text-slate-700 bg-slate-100">
                    {formatMinutesAsHours(totals.r2)}
                  </td>

                  {/* R3 = part of HS */}
                  <td className="border-r border-b border-slate-300 px-3 py-3 text-center font-semibold text-slate-700 bg-slate-100">
                    {formatMinutesAsHours(totals.r3)}
                  </td>

                  {/* All = R1 + R2 + R3 */}
                  <td className="border-r border-b border-slate-300 bg-blue-50/60 px-3 py-3 text-center font-bold text-emerald-900 bg-orange-100">
                    {formatMinutesAsHours(
                      totals.r1 + totals.r2 + totals.r3
                    )}
                  </td>

                  {/* CR will be implemented later */}
                  <td className="border-b border-r border-slate-100 px-3 py-3 text-center text-slate-400 bg-slate-100">
                    —
                  </td>



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

                        className={`border-b border-l border-slate-100 p-1 text-center align-top ${
                          isWeekend(date) ? "bg-orange-100" : "bg-white"
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
  <div className="relative flex flex-col">
    <button
      type="button"
      className="text-lg rounded-md bg-emerald-50 px-2.5 py-2 font-bold text-emerald-700 transition hover:bg-emerald-100"
      onClick={() => setActiveCell(key)}
    >
      {formatMinutesAsHours(totalsForDay.totalMinutes)}
    </button>

    <span className="text-[10px] font-medium text-slate-400">
      {intervals.length} Period(s)
                                </span>
                                <button
                                  title="Ajouter Heures Sup."
      type="button"
      onClick={() => openNewInterval(employee.id, date)}
      className="absolute top-0 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-white bg-emerald-500 text-base  text-white shadow-sm transition hover:bg-orange-500"
    >
      +
    </button>
  </div>
) : canEditAttendance ? (
  <div className="relative h-12 w-12">
                                  <input
                                    title="Entrez Heures Normal 1-8"
      type="number"
      min="1"
      max="8"
      value={quickValue}
      placeholder="h"
      className="h-12 w-12 rounded-lg border border-slate-200 bg-white text-center text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-blue-100"
      onChange={(event) =>
        setQuickValues((previous) => ({
          ...previous,
          [key]: event.target.value,
        }))
      }
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          handleQuickEntry(employee.id, date);
        }
      }}
      onBlur={() => {
        if (quickValue) {
          handleQuickEntry(employee.id, date);
        }
      }}
    />

                                  <button
                                    title="Ajouter Heures Sup."
      type="button"
      onClick={() => openNewInterval(employee.id, date)}
      className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-white bg-emerald-500 text-base  text-white shadow-sm transition hover:bg-orange-500"
    >
      +
    </button>
  </div>
) : (
  <span className="text-slate-800">—</span>
)}



                          </div>

                        ) : (

                          <div className="relative z-20 min-w-52 rounded-xl border border-blue-200 bg-slate-100 text-slate-800 px-3 py-2 shadow-lg shadow-blue-100/60 space-y-1">

                            <div className="flex justify-between items-center">

                              <strong className="text-md">

                                {date}

                              </strong>

                              <button

                                type="button"

                                onClick={() =>

                                  setActiveCell(null)

                                }

                                className="rounded-md px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"

                              >

                                ×

                              </button>

                            </div>



                            {intervals.map((interval) => {

  const segment = getIntervalSegmentForDate(interval, date);



  return (

    <div

      key={interval.groupId}

      className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-2 text-xmd text-slate-700 font-semibold"

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

            className="font-semibold text-blue-600 transition hover:text-blue-800"

            onClick={() => openEditInterval(interval)}

          >

            Edit

          </button>



          <button

            type="button"

            className="font-semibold text-red-600 transition hover:text-red-800"

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



                            <div className="rounded-lg border-t border-slate-100 pt-3 text-xs font-bold text-slate-600">

                              R1: {formatMinutesAsHours(totalsForDay.r1Minutes)}

                              {" | "}

                              R2: {formatMinutesAsHours(totalsForDay.r2Minutes)}

                              {" | "}

                              R3: {formatMinutesAsHours(totalsForDay.r3Minutes)}

                            </div>



                            {canEditAttendance && (

                              <>

                                <div className="flex gap-2">

                                  <label className="flex-1 text-xs text-slate-900">

                                    Start

                                    <input

                                      type="time"

                                      value={startTime}

                                      onChange={(event) =>

                                        setStartTime(event.target.value)

                                      }

                                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 "

                                    />

                                  </label>



                                  <label className="flex-1 text-xs text-slate-900">

                                    End

                                    <input

                                      type="time"

                                      value={endTime}

                                      onChange={(event) =>

                                        setEndTime(event.target.value)

                                      }

                                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"

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

                                    className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"

                                  >

                                    {editingGroupId ? "Update" : "Add interval"}

                                  </button>



                                  <button

                                    type="button"

                                    onClick={() => {

                                      setEditingGroupId(null);

                                      setActiveCell(null);

                                    }}

                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"

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
