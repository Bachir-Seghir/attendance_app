import { useState, useEffect } from "react";
import AppHeader from "./components/AppHeader";
import AttendanceToolbar from "./components/AttendanceToolbar";
import AttendanceTable from "./components/AttendanceTable";
import { getEmployees, getAttendance,  saveAttendance, type Employee } from "./services/api";

function App() {
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [department, setDepartment] = useState("all");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
  getEmployees()
    .then((data) => {
      setEmployees(data);
    })
    .catch((error) => {
      console.error("Failed to load employees:", error);
    });
  }, []);
  
  useEffect(() => {
  getAttendance(month, year)
    .then((data) => {
      const attendanceData: Record<string, string> = {};

      data.forEach((record) => {
        const day = new Date(record.date).getUTCDate();
        const key = `${record.employeeId}-${day}`;

        attendanceData[key] = record.value;
      });

      setAttendance(attendanceData);
    })
    .catch((error) => {
      console.error("Failed to load attendance:", error);
    });
  }, [month, year]);
  
  const handleAttendanceChange = async (
  employeeId: number,
  day: number,
  value: string
) => {
  const key = `${employeeId}-${day}`;

  setAttendance((previous) => ({
    ...previous,
    [key]: value,
  }));

  if (value.trim() === "") return;

  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  try {
    await saveAttendance(employeeId, date, value);
    console.log("Attendance saved successfully");
  } catch (error) {
    console.error("Failed to save attendance:", error);
  }
};
  
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="p-6 space-y-6">
        <AttendanceToolbar
          month={month}
          year={year}
          department={department}
          attendance={attendance}
          onMonthChange={setMonth}
          onYearChange={setYear}
          onDepartmentChange={setDepartment}
        />

        <AttendanceTable
          month={month}
          year={year}
          department={department}
          attendance={attendance}
          employees={employees}
          onAttendanceChange={handleAttendanceChange}
        />
      </main>
    </div>
  );
}

export default App;