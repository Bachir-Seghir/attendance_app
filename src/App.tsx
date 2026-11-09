import { useState, useEffect } from "react";
import AppHeader from "./components/AppHeader";
import AttendanceToolbar from "./components/AttendanceToolbar";
import AttendanceTable from "./components/AttendanceTable";
import { getDepartments,getEmployees, getAttendance, saveAttendanceBatch , type Employee, type AuthUser , type Department } from "./services/api";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import { getUserPermissions } from "./utils/permissions";
import AddDepartment from "./components/AddDepartment";
import ManageDepartments from "./components/ManageDepartments";
import ManageEmployees from "./components/ManageEmployees";

interface AttendanceAppProps {
  canEditAttendance: boolean;
  canViewAllDepartments: boolean;
  user: AuthUser;
}

function AttendanceApp({
  canEditAttendance,
  canViewAllDepartments,
  user
}: AttendanceAppProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [department, setDepartment] = useState("all");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [pendingChanges, setPendingChanges] = useState<
  Record<string, string>
>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
const [employeesError, setEmployeesError] = useState("");
const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  
  const loadDepartments = async () => {
    const data = await getDepartments();

    console.log("Fetched departments:", data);
    console.log("Departments count:", data.length);

    setDepartments(data);
};
  useEffect(() => {
    loadDepartments().catch(console.error);
  }, []);
  
  const loadEmployees = async () => {
    setIsLoadingEmployees(true);

    try {
        const data = await getEmployees(false, month, year);

        setEmployees(data);
        setEmployeesError("");
    } catch (error) {
        console.error("Failed to load employees:", error);

        setEmployeesError(
            error instanceof Error
                ? error.message
                : "Failed to load employees."
        );
    } finally {
        setIsLoadingEmployees(false);
    }
};

useEffect(() => {
    loadEmployees();
}, [month, year]);
  
  useEffect(() => {
  setIsLoadingAttendance(true);
  setAttendanceError("");

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

      setAttendanceError(
        error instanceof Error
          ? error.message
          : "Failed to load attendance."
      );
    })
    .finally(() => {
      setIsLoadingAttendance(false);
    });
}, [month, year]);
  
  const handleAttendanceChange = (
  employeeId: number,
  day: number,
  value: string
  ) => {
    if (!canEditAttendance) return;
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
    if (!canEditAttendance) return;
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
    if (isSaving) {
  setSaveMessage("Please wait until attendance saving is complete.");
  return;
    }
    
  if (Object.keys(pendingChanges).length > 0) {
    setSaveMessage("Please save your attendance changes before changing the month.");
    return;
  }

  setMonth(newMonth);
};

  const handleYearChange = (newYear: number) => {
  if (isSaving) {
  setSaveMessage("Please wait until attendance saving is complete.");
  return;
}
  if (Object.keys(pendingChanges).length > 0) {
    setSaveMessage("Please save your attendance changes before changing the year.");
    return;
  }

  setYear(newYear);
};
  
  const handleDepartmentChange = (newDepartment: string) => {
    if (isSaving) {
  setSaveMessage("Please wait until attendance saving is complete.");
  return;
}
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
        <div className="flex flex-wrap items-center gap-3">
    {user.role === "SUPER_ADMIN" && (
        <AddDepartment onDepartmentAdded={loadDepartments} />
    )}

    {(user.role === "SUPER_ADMIN" || user.role === "MANAGER") && (
        <ManageDepartments
            departments={departments}
            onDepartmentsChanged={loadDepartments}
        />
    )}

    {(user.role === "SUPER_ADMIN" || user.role === "MANAGER") && (
        <ManageEmployees
            departments={departments}
            onEmployeesChanged={loadEmployees}
        />
    )}
</div>
        <AttendanceToolbar
          month={month}
          year={year}
          department={department}
          attendance={attendance}
          onMonthChange={handleMonthChange}
onYearChange={handleYearChange}
          onDepartmentChange={handleDepartmentChange}
          canSelectDepartment={canViewAllDepartments}
          departments={departments}
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
          isLoadingEmployees={isLoadingEmployees}
          employeesError={employeesError}
          isLoadingAttendance={isLoadingAttendance}
          attendanceError={attendanceError}
          canEditAttendance={canEditAttendance}
        />
      </main>
    </div>
  );
}


export default function App() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const permissions = getUserPermissions(user);

  return (
    <>
      <div className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div>
          <span className="font-semibold">{user.name}</span>
          <span className="ml-3 text-sm text-slate-500">
            {user.role}
          </span>
        </div>
    
        <button
          onClick={logout}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
        >
          Logout
        </button>
      </div>

      <AttendanceApp
        canEditAttendance={permissions.canEditAttendance}
        canViewAllDepartments={permissions.canViewAllDepartments}
        user={user}
      />
    </>
  );
}