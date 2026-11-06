
import { useState } from "react";
import { employees } from "../data/employees";

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

  // Update an attendance cell
  const handleAttendanceChange = (
    employeeId: number,
    day: number,
    value: string
  ) => {
    const key = `${employeeId}-${day}`;

    setAttendance((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  // Filter employees by department
  const filteredEmployees =
    department === "all"
      ? employees
      : employees.filter(
          (employee) => employee.department === department
        );

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
      </div>

      {/* Attendance table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">

          <thead className="bg-gray-100">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-100 min-w-48 px-4 py-3 text-left font-semibold text-gray-700 border-b border-r">
                Employee
              </th>

              <th className="min-w-36 px-4 py-3 text-left font-semibold text-gray-700 border-b border-r">
                Department
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
            {filteredEmployees.map((employee) => (
              <tr
                key={employee.id}
                className="hover:bg-blue-50 transition-colors"
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-gray-800 border-b border-r whitespace-nowrap">
                  {employee.name}
                </td>

                <td className="px-4 py-2 text-gray-600 border-b border-r whitespace-nowrap">
                  {employee.department}
                </td>

                {/* Attendance cells */}
                {days.map((day) => {
                  const weekend = isWeekend(day);
                  const key = `${employee.id}-${day}`;

                  return (
                    <td
                      key={day}
                      className={`p-1 border-b border-r text-center ${
                        weekend ? "bg-red-100" : "bg-white"
                      }`}
                    >
                      <input
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
            ))}

            {/* Empty department message */}
            {filteredEmployees.length === 0 && (
              <tr>
                <td
                  colSpan={days.length + 2}
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
