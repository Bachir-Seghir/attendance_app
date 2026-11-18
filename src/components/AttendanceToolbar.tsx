import type { AttendancePeriodMode, DateKey } from "../utils/attendancePeriod";
import { useAttendanceSummary } from "../hooks/useAttendanceSummary";
import type { Department, Employee } from "../services/api";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface AttendanceToolbarProps {
  month: number;
  year: number;
  startDate: DateKey;
  endDate: DateKey;
  department: string;
  canSelectDepartment: boolean;
  departments: Department[];
  employees: Employee[];
  attendance: Record<string, string>;
periodMode: AttendancePeriodMode;
onPeriodModeChange: (
  mode: AttendancePeriodMode
) => boolean;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDepartmentChange: (department: string) => void;
}

function AttendanceToolbar({
  month,
  year,
  startDate,
  endDate,
  department,
  employees,
  attendance,
  onMonthChange,
  onYearChange,
  onDepartmentChange,
  canSelectDepartment,
  departments,
  periodMode,
  onPeriodModeChange,
}: AttendanceToolbarProps) {
  const { t } = useTranslation();





  // Calculate employee count from the API employee list
  const totalEmployees =
    department === "all"
      ? employees.length
      : employees.filter(
          (employee) => employee.department.name === department
        ).length;

  // Calculate attendance totals for the selected period
  const summary = useAttendanceSummary(
    department,
    attendance,
    employees,
    startDate,
    endDate
  );

  const locale = i18n.language.startsWith("en")
    ? "en-US"
    : "fr-FR";

  

return (
  <section className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">

    <div className="flex flex-col xl:flex-row xl:items-center gap-4">

      {/* LEFT: ATTENDANCE PERIOD SETTINGS */}
      <div className="flex-1 min-w-0 xl:pr-4">

          {/* Calendar icon and title */}
          <div className="flex items-center gap-3">

            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 text-emerald-800 shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 11h18" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t("toolBar.period")}
              </h2>

              <p className="text-sm text-slate-600 mt-1">
                {t("toolBar.periodInfoTxt")}
              </p>
            </div>

            

          </div>
        
        <div className="flex justify-between w-full gap-x-2">
          {/* Selected period information */}
<div className="flex  w-[400px] items-center gap-4 rounded-3xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-50/70 px-4 py-1">

  {/* Check icon */}
  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  </div>

  {/* Period details */}
  <div className="flex w-full">
    

    <p className="mt-1 text-xl font-bold tracking-tight text-gray-900">
      {new Date(`${startDate}T00:00:00Z`).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })}
      {" – "}
      {new Date(`${endDate}T00:00:00Z`).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })}
    </p>

    <p className="mt-1 ml-auto text-lg font-medium text-gray-500">
      {Math.round(
        (
          Date.parse(`${endDate}T00:00:00Z`) -
          Date.parse(`${startDate}T00:00:00Z`)
        ) / 86400000
      ) + 1} {t("toolBar.days")}
    </p>
  </div>

          </div>
          
          {/* Compact period toggle */}
          <div className="inline-flex items-center rounded-full border-2 border-slate-200 bg-white p-1 shrink-0">

            {/* Calendar month */}
            <button
              type="button"
              onClick={() => onPeriodModeChange("CALENDAR")}
              aria-pressed={periodMode === "CALENDAR"}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                periodMode === "CALENDAR"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 11h18" />
              </svg>
              1–30
            </button>

            {/* Company period */}
            <button
              type="button"
              onClick={() => onPeriodModeChange("COMPANY")}
              aria-pressed={periodMode === "COMPANY"}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                periodMode === "COMPANY"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="9" width="8" height="12" rx="1" />
                <path d="M7 9V5h4v4M7 13h.01M7 17h.01M11 13h.01M11 17h.01M14 21V4h7v17M17 8h.01M17 12h.01M17 16h.01" />
              </svg>
              21–20
            </button>

          </div>
        </div>

        {/* Month, year and department selectors */}
        <div className="flex flex-wrap items-end gap-3 mt-4 ml-1">

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="month"
              className="text-xs font-semibold text-slate-500"
            >
              {t("toolBar.month")}
            </label>

            <select
              id="month"
              value={month}
              onChange={(event) =>
                onMonthChange(Number(event.target.value))
              }
              className="border border-slate-200 rounded-lg px-3 py-2 min-w-36 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {new Date(2026, index, 1).toLocaleDateString(locale, {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="year"
              className="text-xs font-semibold text-slate-500"
            >
              {t("toolBar.year")}
            </label>

            <select
              id="year"
              value={year}
              onChange={(event) =>
                onYearChange(Number(event.target.value))
              }
              className="border border-slate-200 rounded-lg px-3 py-2 min-w-24 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {Array.from(
                { length: 21 },
                (_, index) => new Date().getFullYear() - 10 + index
              ).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {canSelectDepartment && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="department"
                className="text-xs font-semibold text-slate-500"
              >
                {t("toolBar.department")}
              </label>

              <select
                id="department"
                value={department}
                onChange={(event) =>
                  onDepartmentChange(event.target.value)
                }
                className="border border-slate-200 rounded-lg px-3 py-2 min-w-40 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">
                  {t("toolBar.allDepartment")}
                </option>

                {departments.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>

      </div>

      {/* VERTICAL DIVIDER */}
      <div className="hidden xl:block w-px self-stretch bg-slate-300 mx-1" />

      {/* RIGHT: STATISTICS CARDS */}
      <div className="flex-[1.35] min-w-0">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Normal hours */}
          <div className="relative overflow-hidden flex flex-col justify-center bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 rounded-3xl px-2 py-4 min-h-28">

  {/* Decorative wave */}
  <svg
    className="absolute bottom-0 left-0 w-full h-12 opacity-60 pointer-events-none"
    viewBox="0 0 300 60"
    preserveAspectRatio="none"
  >
    <path
      d="M0 35 C50 5 90 55 145 30 S240 5 300 30 V60 H0 Z"
      fill="#A7F3D0"
      opacity="0.45"
    />
  </svg>

  <div className="relative flex items-center gap-2.5">
    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-100/80 text-emerald-700 shrink-0">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
</div>

    <p className="text-sm font-semibold text-emerald-800">
      <span className="text-xl mr-2 font-semibold leading-none">
        ∑
      </span> {t("toolBar.NH")}
    </p>
  </div>

  <p className="relative text-3xl font-bold text-emerald-900 text-center mt-1">
    {summary.normalHours}
  </p>

</div>

          {/* Overtime */}
          <div className="relative overflow-hidden flex flex-col justify-center bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 rounded-3xl px-4 py-4 min-h-28">

  {/* Decorative wave */}
  <svg
    className="absolute bottom-0 left-0 w-full h-12 opacity-60 pointer-events-none"
    viewBox="0 0 300 60"
    preserveAspectRatio="none"
  >
    <path
      d="M0 35 C50 5 90 55 145 30 S240 5 300 30 V60 H0 Z"
      fill="#FED7AA"
      opacity="0.55"
    />
  </svg>

  <div className="relative flex items-center gap-2.5">
    <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-orange-100/80 text-orange-600 shrink-0">

  {/* Clock */}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>

  {/* Plus badge */}
  <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-white border border-orange-300 text-orange-600 shadow-sm">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  </span>

</div>

    <p className="text-sm font-semibold text-orange-700">
      <span className="text-xl mr-2 font-semibold leading-none">
        ∑
                </span> 
                {t("toolBar.OT")}
    </p>
  </div>

  <p className="relative text-3xl font-bold text-amber-900 text-center mt-1">
    {summary.overtimeHours}
  </p>

</div>

          {/* Total hours */}
          <div className="relative overflow-hidden flex flex-col justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 rounded-3xl px-4 py-4 min-h-28">

  {/* Decorative wave */}
  <svg
    className="absolute bottom-0 left-0 w-full h-12 opacity-60 pointer-events-none"
    viewBox="0 0 300 60"
    preserveAspectRatio="none"
  >
    <path
      d="M0 35 C50 5 90 55 145 30 S240 5 300 30 V60 H0 Z"
      fill="#BFDBFE"
      opacity="0.55"
    />
  </svg>

  <div className="relative flex items-center gap-2.5">

   

    <p className="text-sm font-semibold text-slate-700">
      <span className="text-3xl mr-2 font-semibold leading-none">
        ∑
                </span> {t("toolBar.totals")}
      </p>

  </div>

  <p className="relative text-3xl font-bold text-slate-900 text-center mt-1">
    {summary.totalHours}
  </p>

</div>

          {/* Employees */}
          <div className="relative overflow-hidden flex flex-col justify-center bg-emerald-900 text-white rounded-3xl px-4 py-4 min-h-28">

            {/* Decorative background */}
            <div className="absolute -right-2 -bottom-5 opacity-[0.09] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="110"
                height="85"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0H5Zm14-9a3 3 0 1 0-2.5-4.65 5.5 5.5 0 0 1 0 5.3c.7.1 1.5-.1 2.5-.65Zm-2 2.2a8.5 8.5 0 0 1 3 6.8h3a6 6 0 0 0-6-6.8Z" />
              </svg>
            </div>

            <div className="relative flex items-center gap-2.5">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="shrink-0"
              >
                <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM1 20a8 8 0 0 1 16 0H1Zm15-7a6 6 0 0 1 7 7h-4a9.8 9.8 0 0 0-3-7Z" />
              </svg>

              <p className="text-sm font-semibold text-emerald-50">
                {t("toolBar.totalEmployees")}
              </p>

            </div>

            <p className="relative text-3xl font-bold text-white text-center mt-1">
              {totalEmployees}
            </p>

          </div>

        </div>

      </div>

    </div>

  </section>
);


}

export default AttendanceToolbar;
