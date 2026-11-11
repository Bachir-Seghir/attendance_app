
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import ManageUsers from "./components/ManageUsers";
import excelIcon from "./assets/excel.svg";
import { exportAttendanceExcel } from "./utils/exportAttendanceExcel";

interface AttendanceAppProps {
  canEditAttendance: boolean;
  canViewAllDepartments: boolean;
  user: AuthUser;
  canExportAttendance: boolean;
  onLogout: () => void;
}

function AttendanceApp({
  canEditAttendance,
  canViewAllDepartments,
  user,
  onLogout,
}: AttendanceAppProps) {
  const { t } = useTranslation();

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
                : t("tools.loadingEmployeesError")
        );
    } finally {
        setIsLoadingEmployees(false);
    }
};

  const handleExportExcel = async () => {
  try {
    await exportAttendanceExcel({
      employees,
      attendance,
      year,
      month,
      department:
        user.role === "SUPER_ADMIN" || user.role === "MANAGER"
          ? department
          : "all",
    });
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : t("tools.exportError")
    );
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
          : t("tools.loading")
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
    setSaveMessage(t("tools.noChangesToSave"));
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
    setSaveMessage(t("tools.attendanceSaved"));
  } catch (error) {
    console.error(error);
    setSaveMessage(
      error instanceof Error
        ? error.message
        : t("tools.saveError")
    );
  } finally {
    setIsSaving(false);
  }
  };
  
  const handleMonthChange = (newMonth: number) => {
    if (isSaving) {
  setSaveMessage(t("tools.savingInProgress"));
  return;
    }
    
  if (Object.keys(pendingChanges).length > 0) {
    setSaveMessage(t("tools.saveBeforeChangingMonth"));
    return;
  }

  setMonth(newMonth);
};

  const handleYearChange = (newYear: number) => {
  if (isSaving) {
  setSaveMessage(t("tools.savingInProgress"));
  return;
}
  if (Object.keys(pendingChanges).length > 0) {
    setSaveMessage(t("tools.saveBeforeChangingYear"));
    return;
  }

  setYear(newYear);
};
  
  const handleDepartmentChange = (newDepartment: string) => {
    if (isSaving) {
  setSaveMessage(t("tools.savingInProgress"));
  return;
}
  if (Object.keys(pendingChanges).length > 0) {
    setSaveMessage(
      t("tools.saveBeforeChangingDepartment")
    );
    return;
  }

  setDepartment(newDepartment);
};
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader user={user} onLogout={onLogout} />
      <main className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {user.role === "SUPER_ADMIN" && (
    <ManageUsers departments={departments} />
)}
          
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
          <button
  type="button"
  onClick={handleExportExcel}
  disabled={employees.length === 0}
  className="inline-flex items-center gap-2 rounded-lg hover:cursor-pointer hover:bg-orange-300 px-4 py-2 text-md font-medium text-black shadow-sm  disabled:cursor-not-allowed disabled:opacity-50"
>
  <img
    src={excelIcon}
    alt=""
    className="h-8 w-8"
  />
  {t("tools.exportExcel")}
</button>
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
          employees={employees}

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
  const { t } = useTranslation();
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {t("tools.loading")}
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const permissions = getUserPermissions(user);

  return (
      <AttendanceApp
        canEditAttendance={permissions.canEditAttendance}
        canViewAllDepartments={permissions.canViewAllDepartments}
        user={user}
        canExportAttendance={permissions.canExportAttendance}
        onLogout={logout}
      />
  );
}
