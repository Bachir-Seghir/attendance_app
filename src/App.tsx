import { useState } from "react";
import AppHeader from "./components/AppHeader";
import AttendanceToolbar from "./components/AttendanceToolbar";
import AttendanceTable from "./components/AttendanceTable";

function App() {
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [department, setDepartment] = useState("all");

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="p-6 space-y-6">
        <AttendanceToolbar
          month={month}
          year={year}
          department={department}
          onMonthChange={setMonth}
          onYearChange={setYear}
          onDepartmentChange={setDepartment}
        />

        <AttendanceTable
          month={month}
          year={year}
          department={department}
        />
      </main>
    </div>
  );
}

export default App;