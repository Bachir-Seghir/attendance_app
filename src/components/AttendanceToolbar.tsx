interface AttendanceToolbarProps {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

function AttendanceToolbar({
  month,
  year,
  onMonthChange,
  onYearChange,
}: AttendanceToolbarProps) {
  return (
    <section>
      <div>
        <label htmlFor="month">Month</label>
        <select
          id="month"
          value={month}
          onChange={(event) => onMonthChange(Number(event.target.value))}
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

      <div>
        <label htmlFor="year">Year</label>
        <select
          id="year"
          value={year}
          onChange={(event) => onYearChange(Number(event.target.value))}
        >
          {[2025, 2026, 2027, 2028].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="department">Department</label>
        <select id="department" defaultValue="all">
          <option value="all">All departments</option>
          <option value="maintenance">Maintenance</option>
          <option value="production">Production</option>
          <option value="administration">Administration</option>
        </select>
      </div>
    </section>
  );
}

export default AttendanceToolbar;