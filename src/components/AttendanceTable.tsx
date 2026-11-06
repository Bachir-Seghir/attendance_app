import { useState } from "react";
import { employees } from "../data/employees";

interface AttendanceTableProps {
  month: number;
  year: number;
}

function AttendanceTable({ month, year }: AttendanceTableProps) {
  const daysInMonth = new Date(year, month, 0).getDate();

  const days = Array.from(
    { length: daysInMonth },
    (_, index) => index + 1
  );
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

  return (
    <div>
      <h2>Monthly Attendance</h2>

      <div style={{ overflowX: "auto" }}>
        <table border={1} cellPadding={10}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>

              {days.map((day, index) => (
  <th key={day}>
    <div>{weekdays[index]}</div>
    <div>{day}</div>
  </th>
))}
            </tr>
          </thead>

          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.name}</td>
                <td>{employee.department}</td>

                {days.map((day) => {
                  const key = `${employee.id}-${day}`;

                  return (
                    <td key={day}>
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
                        style={{
                          width: "20px",
                          textAlign: "center",
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AttendanceTable;