
import { useState, useRef } from "react";
import { employees } from "../data/employees";
import {
  calculateDailyHours,
  calculateMonthlyTotals,
} from "../utils/attendanceCalculations";
import { validateAttendanceInput, isValidAttendanceValue } from "../utils/attendanceValidation";
import { ATTENDANCE_CODES } from "../utils/attendanceValidation";
interface AttendanceTableProps {
  month: number;
  year: number;
  department: string;
}

function AttendanceTable({
  month,
  year,
  department,
}: AttendanceTableProps) {
  // Calculate the number of days in the selected month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Check whether a day is Friday or Saturday
  const isWeekend = (day: number) => {
    const date = new Date(year, month - 1, day);
    return date.getDay() === 5 || date.getDay() === 6;
  };

  // Generate the days of the month
  const days = Array.from(
    { length: daysInMonth },
    (_, index) => index + 1
  );

  // Get French weekday initials
  const weekdays = days.map((day) => {
    const date = new Date(year, month - 1, day);

    return date
      .toLocaleDateString("fr-FR", { weekday: "long" })
      .charAt(0)
      .toUpperCase();
  });

  // Store attendance values
  const [attendance, setAttendance] = useState<
    Record<string, string>
  >({});
const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // Update an attendance cell
  const handleAttendanceChange = (
  employeeId: number,
  day: number,
  value: string
) => {
  const validatedValue = validateAttendanceInput(value);

  // Reject invalid characters or values
  if (validatedValue === null) return;

  const key = `${employeeId}-${day}`;

  setAttendance((previous) => ({
    ...previous,
    [key]: validatedValue,
  }));
  };
    
    const handleAttendanceBlur = (
  employeeId: number,
  day: number
) => {
  const key = `${employeeId}-${day}`;
  const value = attendance[key] ?? "";

  if (value !== "" && !isValidAttendanceValue(value)) {
    setAttendance((previous) => ({
      ...previous,
      [key]: "",
    }));
  }
};

  // Filter employees by department
  const filteredEmployees =
    department === "all"
      ? employees
      : employees.filter(
          (employee) => employee.department === department
        );

    const handleCellNavigation = (
  event: React.KeyboardEvent<HTMLInputElement>,
  employeeIndex: number,
  day: number
) => {
  const employeeCount = filteredEmployees.length;

  let nextEmployeeIndex = employeeIndex;
  let nextDay = day;

  switch (event.key) {
    case "ArrowLeft":
      nextDay--;
      break;

    case "ArrowRight":
      nextDay++;
      break;

    case "ArrowUp":
      nextEmployeeIndex--;
      break;

    case "ArrowDown":
      nextEmployeeIndex++;
      break;

    default:
      return;
  }

  // Prevent cursor movement inside the input
  event.preventDefault();

  // Keep navigation inside the table
  if (
    nextEmployeeIndex < 0 ||
    nextEmployeeIndex >= employeeCount ||
    nextDay < 1 ||
    nextDay > daysInMonth
  ) {
    return;
  }

  const nextEmployee = filteredEmployees[nextEmployeeIndex];
  const nextKey = `${nextEmployee.id}-${nextDay}`;

  inputRefs.current[nextKey]?.focus();
    };
    
  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

      {/* Table title */}
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          Monthly Attendance
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Enter the working hours for each employee.
              </p>
              
<div className="mt-4 flex flex-wrap items-center gap-2">
  <span className="text-xs font-semibold text-gray-600 mr-1">
    Les Valeurs possible :
  </span>

  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
    0–24 Hours
  </span>

  {Object.entries(ATTENDANCE_CODES).map(([code, label]) => (
    <div
      key={code}
      title={label}
      className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 border border-gray-200"
    >
      <span className="text-xs font-bold text-gray-800">
        {code}
      </span>

      <span className="text-xs text-gray-500">
        {label}
      </span>
    </div>
  ))}
</div>

      </div>

      {/* Attendance table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">

          <thead className="bg-gray-100">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-100 min-w-30 px-2 py-3 text-left font-semibold text-gray-700 border-b border-r">
                Nom & Prénom
              </th>

              <th className="min-w-22 px-2 py-3 text-left font-semibold text-gray-700 border-b border-r">
                Affect.
              </th>
<th className="min-w-12 px-3 py-3 text-center font-semibold text-gray-700 border-b border-r bg-emerald-50">
  HN
</th>

<th className="min-w-12 px-3 py-3 text-center font-semibold text-gray-700 border-b border-r bg-orange-50">
  HS
</th>
              {/* Day headers */}
              {days.map((day, index) => (
                <th
                  key={day}
                  className={`min-w-12 px-2 py-2 text-center border-b border-r ${
                    isWeekend(day)
                      ? "bg-red-300 text-red-950"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="text-xs">
                    {weekdays[index]}
                  </div>

                  <div className="font-bold">
                    {day}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredEmployees.map((employee, employeeIndex) => {
  const monthlyTotals = calculateMonthlyTotals(
    employee.id,
    attendance,
    year,
    month
  );

  return (
    <tr
      key={employee.id}
      className="hover:bg-blue-50 transition-colors"
    >
                <td className="sticky left-0 z-10 bg-white px-2 py-2 font-medium text-gray-800 border-b border-r whitespace-nowrap">
                  {employee.name}
                </td>

                <td className="px-2 py-2 text-gray-600 border-b border-r whitespace-nowrap">
                  {employee.department}
                </td>
<td className="px-3 py-2 text-center font-semibold text-emerald-700 bg-emerald-50 border-b border-r">
  {monthlyTotals.normalHours}
</td>

<td className="px-3 py-2 text-center font-semibold text-orange-700 bg-orange-50 border-b border-r">
  {monthlyTotals.overtimeHours}
</td>
                {/* Attendance cells */}
                {days.map((day) => {
                  const weekend = isWeekend(day);
                  const key = `${employee.id}-${day}`;
const hours = calculateDailyHours(
  attendance[key] ?? "",
  weekend
);
                  return (
                    <td
                      key={day}
                      className={`p-1 border-b border-r text-center ${
                        weekend ? "bg-red-100" : "bg-white"
                      }`}
                    >
                          <input
                              ref={(element) => {
  inputRefs.current[key] = element;
}}

onKeyDown={(event) =>
  handleCellNavigation(event, employeeIndex, day)
}
                              onBlur={() => handleAttendanceBlur(employee.id, day)}
                              maxLength={5}
autoComplete="off"
                        type="text"
                        value={attendance[key] ?? ""}
                        onChange={(event) =>
                          handleAttendanceChange(
                            employee.id,
                            day,
                            event.target.value
                          )
                        }
                        className={`w-10 h-9 text-center rounded-md border border-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400 ${
                          weekend
                            ? "bg-red-300 text-red-950"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      />
                    </td>
                  );
                })}
              </tr>
  );
})}

            {/* Empty department message */}
            {filteredEmployees.length === 0 && (
              <tr>
                <td
                  colSpan={days.length + 4}
                  className="text-center py-10 text-gray-500"
                >
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Total employees: {filteredEmployees.length}
        </p>
      </div>

    </section>
  );
}

export default AttendanceTable;
