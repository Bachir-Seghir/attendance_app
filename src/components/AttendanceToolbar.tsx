import { useEmployeeCount } from "../hooks/useEmployeeCount";
import { useAttendanceSummary } from "../hooks/useAttendanceSummary";

interface AttendanceToolbarProps {
  month: number;
  year: number;
  department: string;
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
}: AttendanceToolbarProps) {
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

      <div className="flex flex-col gap-2">
        <label htmlFor="month" className="text-sm font-medium text-gray-600">
          Month
        </label>

        <select
          id="month"
          value={month}
          onChange={(event) => onMonthChange(Number(event.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 min-w-36 outline-none focus:ring-2 focus:ring-emerald-600"
        >
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {new Date(2026, index).toLocaleDateString("en-US", {
                month: "long",
              })}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="year" className="text-sm font-medium text-gray-600">
          Year
        </label>

        <select
          id="year"
          value={year}
          onChange={(event) => onYearChange(Number(event.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 min-w-28 outline-none focus:ring-2 focus:ring-emerald-600"
        >
          {[2025, 2026, 2027, 2028].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="department" className="text-sm font-medium text-gray-600">
          Department
        </label>

        <select
          id="department"
          value={department}
          onChange={(event) => onDepartmentChange(event.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 min-w-44 outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value="all">All departments</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Production">Production</option>
          <option value="Administration">Administration</option>
        </select>
      </div>
<div className="flex flex-wrap ml-auto items-center gap-3">

  {/* Normal hours */}
  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
    <p className="text-sm text-emerald-700 font-medium">
      Total : Heures Normales
    </p>
    <p className="text-2xl font-bold text-emerald-900">
      {summary.normalHours}
    </p>
  </div>

  {/* Overtime hours */}
  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
    <p className="text-sm text-amber-700 font-medium">
      Total : Heures Sup.
    </p>
    <p className="text-2xl font-bold text-amber-900">
      {summary.overtimeHours}
    </p>
  </div>

  {/* Total hours */}
  <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
    <p className="text-sm text-slate-600 font-medium">
      Total des Heures 
    </p>
    <p className="text-2xl font-bold text-slate-900">
      {summary.totalHours}
    </p>
  </div>

  {/* Employee count */}
  <div className="flex items-center gap-4 bg-emerald-900 text-white px-6 py-3 rounded-xl shadow-sm">
    <div>
      <p className="text-sm text-emerald-100 font-medium">
        Personnel Total
      </p>
      <p className="text-3xl font-bold">
        {totalEmployees}
      </p>
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