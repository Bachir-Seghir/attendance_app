import { useState, useEffect } from "react";
import AppHeader from "./components/AppHeader";
import AttendanceToolbar from "./components/AttendanceToolbar";
import AttendanceTable from "./components/AttendanceTable";
import { getEmployees, getAttendance, saveAttendanceBatch , type Employee } from "./services/api";

function App() {
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [department, setDepartment] = useState("all");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [pendingChanges, setPendingChanges] = useState<
  Record<string, string>
>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  
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
  
  const handleAttendanceChange = (
  employeeId: number,
  day: number,
  value: string
  ) => {
    setSaveMessage("");
  const key = `${employeeId}-${day}`;

  setAttendance((previous) => ({
    ...previous,
    [key]: value,
  }));

  setPendingChanges((previous) => ({
    ...previous,
    [key]: value,
  }));
};
  
  const handleSaveAttendance = async () => {
    const changesToSave = { ...pendingChanges };
  const changes = Object.entries(changesToSave).map(([key, value]) => {
    const [employeeId, day] = key.split("-").map(Number);

    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return { employeeId, date, value };
  });

  if (changes.length === 0) {
    setSaveMessage("No changes to save.");
    return;
  }

  try {
    setIsSaving(true);
    setSaveMessage("");

    await saveAttendanceBatch(changes);

    setPendingChanges((current) => {
  const remaining = { ...current };

  Object.entries(changesToSave).forEach(([key, savedValue]) => {
    if (remaining[key] === savedValue) {
      delete remaining[key];
    }
  });

  return remaining;
});
    setSaveMessage("Attendance saved successfully!");
  } catch (error) {
    console.error(error);
    setSaveMessage(
      error instanceof Error
        ? error.message
        : "Failed to save attendance. Please try again."
    );
  } finally {
    setIsSaving(false);
  }
  };
  
  const handleMonthChange = (newMonth: number) => {
  if (Object.keys(pendingChanges).length > 0) {
    setSaveMessage("Please save your attendance changes before changing the month.");
    return;
  }

  setMonth(newMonth);
};

const handleYearChange = (newYear: number) => {
  if (Object.keys(pendingChanges).length > 0) {
    setSaveMessage("Please save your attendance changes before changing the year.");
    return;
  }

  setYear(newYear);
};
  
  const handleDepartmentChange = (newDepartment: string) => {
  if (Object.keys(pendingChanges).length > 0) {
    setSaveMessage(
      "Please save your attendance changes before changing the department."
    );
    return;
  }

  setDepartment(newDepartment);
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
          onMonthChange={handleMonthChange}
onYearChange={handleYearChange}
onDepartmentChange={handleDepartmentChange}
        />

        <AttendanceTable
          month={month}
          year={year}
          department={department}
          attendance={attendance}
          employees={employees}
          onAttendanceChange={handleAttendanceChange}
          onSaveAttendance={handleSaveAttendance}
          hasUnsavedChanges={Object.keys(pendingChanges).length > 0}
          isSaving={isSaving}
saveMessage={saveMessage}
        />
      </main>
    </div>
  );
}

export default App;