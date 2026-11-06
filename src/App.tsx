import { useState } from "react";
import AppHeader from "./components/AppHeader";
import AttendanceToolbar from "./components/AttendanceToolbar";
import AttendanceTable from "./components/AttendanceTable";

function App() {
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [department, setDepartment] = useState("all");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  
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
          onAttendanceChange={handleAttendanceChange}
        />
      </main>
    </div>
  );
}

export default App;