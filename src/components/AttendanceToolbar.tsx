interface AttendanceToolbarProps {
  month: number;
    year: number;
    department: string;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDepartmentChange: (department: string) => void;
}

function AttendanceToolbar({
  month,
    year,
  department,
  onMonthChange,
    onYearChange,
  onDepartmentChange,
}: AttendanceToolbarProps) {
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

    </div>
  </section>
);
}

export default AttendanceToolbar;