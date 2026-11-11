
import { useEmployeeCount } from "../hooks/useEmployeeCount";
import { useAttendanceSummary } from "../hooks/useAttendanceSummary";
import type { Department, Employee } from "../services/api";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface AttendanceToolbarProps {
  month: number;
  year: number;
  department: string;
  canSelectDepartment: boolean;
  departments: Department[];
  employees: Employee[];
  attendance: Record<string, string>;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDepartmentChange: (department: string) => void;
}

function AttendanceToolbar({
  month,
  year,
  department,
  attendance,
  onMonthChange,
  onYearChange,
  onDepartmentChange,
  canSelectDepartment,
  departments,
}: AttendanceToolbarProps) {
  const {t} = useTranslation()
  const totalEmployees = useEmployeeCount(department);

  const summary = useAttendanceSummary(
    department,
    attendance,
    year,
    month
  );

  
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
        {/* Month */}
        <div className="flex flex-col gap-2">
          <label htmlFor="month" className="text-sm font-medium text-gray-600">
            {t("toolBar.month")}
          </label>

          <select
            id="month"
            value={month}
            onChange={(event) => onMonthChange(Number(event.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 min-w-36 outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Date(2026, index).toLocaleDateString(
                  i18n.language === "en" ? "en-US" : "fr-FR",
                  {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="flex flex-col gap-2">
          <label htmlFor="year" className="text-sm font-medium text-gray-600">
            {t("toolBar.year")}
          </label>

          <select
            id="year"
            value={year}
            onChange={(event) => onYearChange(Number(event.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 min-w-28 outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {Array.from(
              { length: 100 },
              (_, index) => new Date().getFullYear() + index
            ).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* Department */}
        {canSelectDepartment && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="department"
              className="text-sm font-medium text-gray-600"
            >
              {t("toolBar.department")}
            </label>

            <select
              id="department"
              value={department}
              onChange={(event) => onDepartmentChange(event.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 min-w-44 outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">{t("toolBar.allDepartment")}</option>

              {departments?.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Summary cards */}
        <div className="flex flex-wrap ml-auto items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <p className="text-sm text-emerald-700 font-medium">
              Total : {t("toolBar.NH")}
            </p>
            <p className="text-2xl font-bold text-emerald-900">
              {summary.normalHours}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-700 font-medium">
              Total : {t("toolBar.OT")}
            </p>
            <p className="text-2xl font-bold text-amber-900">
              {summary.overtimeHours}
            </p>
          </div>

          <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-sm text-slate-600 font-medium">
              {t("toolBar.totals")}
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {summary.totalHours}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-emerald-900 text-white px-6 py-3 rounded-xl shadow-sm">
            <div>
              <p className="text-sm text-emerald-100 font-medium">
                {t("toolBar.totalEmployees")}
              </p>
              <p className="text-3xl font-bold">{totalEmployees}</p>
            </div>

            <div className="rounded-full bg-emerald-100 py-2 px-3">
              <span className="text-3xl">👥</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AttendanceToolbar;
