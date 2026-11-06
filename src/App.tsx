import { useState } from "react";
import AppHeader from "./components/AppHeader";
import AttendanceToolbar from "./components/AttendanceToolbar";
import AttendanceTable from "./components/AttendanceTable";

function App() {
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);

  return (
    <div>
      <AppHeader />

      <AttendanceToolbar
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
      />

      <AttendanceTable month={month} year={year} />
    </div>
  );
}

export default App;