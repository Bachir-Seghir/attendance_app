import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import AppHeader from "./components/AppHeader";
import AttendanceToolbar from "./components/AttendanceToolbar";
import AttendanceTable from "./components/AttendanceTable";
import {
	getDepartments,
	getEmployees,
	getAttendance,
	createAttendanceInterval,
	updateAttendanceInterval,
	deleteAttendanceInterval,
	getPreviousAttendancePeriod,
	setPreviousAttendancePeriodLock,
	saveAttendanceBatch,
	type AttendancePeriodLock,
	type AttendanceRecord,
	type Employee,
	type AuthUser,
	type Department,
} from "./services/api";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import { getUserPermissions } from "./utils/permissions";
import AddDepartment from "./components/AddDepartment";
import ManageDepartments from "./components/ManageDepartments";
import ManageEmployees from "./components/ManageEmployees";
import ManageUsers from "./components/ManageUsers";
import excelIcon from "./assets/excel.svg";
import { exportAttendanceExcel } from "./utils/exportAttendanceExcel";
import {
	getAttendancePeriod,
	getDefaultAttendanceSelection,
	type AttendancePeriodMode,
} from "./utils/attendancePeriod";

type PendingIntervalOperation =
	| {
			type: "CREATE";
			groupId: string;
			employeeId: number;
			date: string;
			startMinute: number;
			endMinute: number;
	  }
	| {
			type: "UPDATE";
			groupId: string;
			employeeId: number;
			date: string;
			startMinute: number;
			endMinute: number;
	  }
	| {
			type: "DELETE";
			groupId: string;
	  };

interface AttendanceAppProps {
	canEditAttendance: boolean;
	canViewAllDepartments: boolean;
	user: AuthUser;
	canExportAttendance: boolean;
	onLogout: () => void;
}

interface PendingAttendanceCode {
	employeeId: number;
	date: string;
	value: string;
}

function AttendanceApp({
	canEditAttendance,
	canViewAllDepartments,
	canExportAttendance,
	user,
	onLogout,
}: AttendanceAppProps) {
	const { t } = useTranslation();
	const [pendingCodes, setPendingCodes] = useState<
		Record<string, PendingAttendanceCode>
	>({});
	const [departments, setDepartments] = useState<Department[]>([]);
	const [periodMode, setPeriodMode] = useState<AttendancePeriodMode>("COMPANY");

	const [initialSelection] = useState(() =>
		getDefaultAttendanceSelection("COMPANY"),
	);

	const [month, setMonth] = useState(initialSelection.month);
	const [year, setYear] = useState(initialSelection.year);
	const [department, setDepartment] = useState("all");
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

	const [pendingOperations, setPendingOperations] = useState<
		Record<string, PendingIntervalOperation>
	>({});
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
	const [employeesError, setEmployeesError] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState("");
	const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
	const [attendanceError, setAttendanceError] = useState("");

	const attendancePeriod = getAttendancePeriod(periodMode, year, month);
	const loadDepartments = async () => {
		const data = await getDepartments();

		setDepartments(data);
	};

	const canManagePeriodLock =
		user.role === "SUPER_ADMIN" || user.role === "MANAGER";

	const [previousPeriod, setPreviousPeriod] =
		useState<AttendancePeriodLock | null>(null);

	const [isLoadingPeriodLock, setIsLoadingPeriodLock] = useState(false);
	const [isUpdatingPeriodLock, setIsUpdatingPeriodLock] = useState(false);
	const [periodLockError, setPeriodLockError] = useState("");
  const publicHolidayDates = new Set<string>();
  
  const hasPendingChanges =
  Object.keys(pendingOperations).length > 0 ||
    Object.keys(pendingCodes).length > 0;
  
	useEffect(() => {
		loadDepartments().catch(console.error);
	}, []);

	useEffect(() => {
		if (!canManagePeriodLock) return;

		let cancelled = false;

		const loadPreviousPeriod = async () => {
			setIsLoadingPeriodLock(true);
			setPeriodLockError("");

			try {
				const period = await getPreviousAttendancePeriod();

				if (!cancelled) {
					setPreviousPeriod(period);
				}
			} catch (error) {
				if (!cancelled) {
					setPeriodLockError(
						error instanceof Error
							? error.message
							: "Failed to load attendance period status.",
					);
				}
			} finally {
				if (!cancelled) {
					setIsLoadingPeriodLock(false);
				}
			}
		};

		loadPreviousPeriod();

		return () => {
			cancelled = true;
		};
	}, [canManagePeriodLock]);

	const handlePreviousPeriodLockChange = async () => {
		if (!canManagePeriodLock || !previousPeriod || isUpdatingPeriodLock) {
			return;
		}

		const newUnlockedState = !previousPeriod.previousPeriodUnlocked;

		const action = newUnlockedState ? "unlock" : "lock";

		const confirmed = window.confirm(
			newUnlockedState
				? "Are you sure you want to unlock the previous attendance period?"
				: "Are you sure you want to lock the previous attendance period again?",
		);

		if (!confirmed) return;

		setIsUpdatingPeriodLock(true);
		setPeriodLockError("");

		try {
			const updatedPeriod =
				await setPreviousAttendancePeriodLock(newUnlockedState);

			setPreviousPeriod(updatedPeriod);
		} catch (error) {
			console.error(`Failed to ${action} previous attendance period:`, error);

			setPeriodLockError(
				error instanceof Error
					? error.message
					: `Failed to ${action} the previous attendance period.`,
			);
		} finally {
			setIsUpdatingPeriodLock(false);
		}
	};

	const loadEmployees = async () => {
		setIsLoadingEmployees(true);

		try {
			const data = await getEmployees(
				false,
				attendancePeriod.startDate,
				attendancePeriod.endDate,
			);

			setEmployees(data);
			setEmployeesError("");
		} catch (error) {
			console.error("Failed to load employees:", error);

			setEmployeesError(
				error instanceof Error
					? error.message
					: t("tools.loadingEmployeesError"),
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
				startDate: attendancePeriod.startDate,
				endDate: attendancePeriod.endDate,
				department:
					user.role === "SUPER_ADMIN" || user.role === "MANAGER"
						? department
						: "all",
			});
		} catch (error) {
			alert(error instanceof Error ? error.message : t("tools.exportError"));
		}
	};

	useEffect(() => {
		loadEmployees();
	}, [attendancePeriod.startDate, attendancePeriod.endDate]);

	useEffect(() => {
		let cancelled = false;

		const loadAttendance = async () => {
			setIsLoadingAttendance(true);
			setAttendanceError("");

			try {
				const data = await getAttendance(
					attendancePeriod.startDate,
					attendancePeriod.endDate,
				);

				if (!cancelled) {
					setAttendance(data);
				}
			} catch (error) {
				if (!cancelled) {
					console.error("Failed to load attendance:", error);

					setAttendanceError(
						error instanceof Error ? error.message : t("tools.loading"),
					);
				}
			} finally {
				if (!cancelled) {
					setIsLoadingAttendance(false);
				}
			}
		};

		loadAttendance();

		return () => {
			cancelled = true;
		};
	}, [attendancePeriod.startDate, attendancePeriod.endDate, t]);

	const addDays = (date: string, days: number): string => {
		const result = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
		result.setUTCDate(result.getUTCDate() + days);
		return result.toISOString().slice(0, 10);
	};

	const buildIntervalSegments = (
		employeeId: number,
		date: string,
		groupId: string,
		startMinute: number,
		endMinute: number,
	): AttendanceRecord[] => {
		const segments: AttendanceRecord[] = [];

		let currentDate = date.slice(0, 10);
		let currentMinute = startMinute;
		let remainingMinutes = endMinute - startMinute;

		while (remainingMinutes > 0) {
			const duration = Math.min(remainingMinutes, 1440 - currentMinute);
			const segmentEnd = currentMinute + duration;

			segments.push({
				id: 0,
				employeeId,
				date: currentDate,
				value: "",
				intervals: [
					{
						id: -Math.abs(currentMinute + segmentEnd + segments.length + 1),
						attendanceId: 0,
						groupId,
						startMinute: currentMinute,
						endMinute: segmentEnd,
					},
				],
			});

			remainingMinutes -= duration;
			currentDate = addDays(currentDate, 1);
			currentMinute = 0;
		}

		return segments;
	};

	const handleCreateInterval = (
		employeeId: number,
		date: string,
		startMinute: number,
		endMinute: number,
	) => {
		if (!canEditAttendance) return;

		const groupId = `draft-${crypto.randomUUID()}`;

		const segments = buildIntervalSegments(
			employeeId,
			date,
			groupId,
			startMinute,
			endMinute,
		);

		setAttendance((previous) => {
			const updated = [...previous];

			segments.forEach((segment) => {
				const existingIndex = updated.findIndex(
					(record) =>
						record.employeeId === employeeId &&
						record.date.slice(0, 10) === segment.date,
				);

				if (existingIndex >= 0) {
					updated[existingIndex] = {
						...updated[existingIndex],
						intervals: [
							...updated[existingIndex].intervals,
							...segment.intervals,
						],
					};
				} else {
					updated.push(segment);
				}
			});

			return updated;
		});

		setPendingOperations((previous) => ({
			...previous,
			[groupId]: {
				type: "CREATE",
				groupId,
				employeeId,
				date: date.slice(0, 10),
				startMinute,
				endMinute,
			},
		}));

		setSaveMessage("");
	};

	const handleUpdateInterval = (
		groupId: string,
		employeeId: number,
		date: string,
		startMinute: number,
		endMinute: number,
	) => {
		if (!canEditAttendance) return;

		const segments = buildIntervalSegments(
			employeeId,
			date,
			groupId,
			startMinute,
			endMinute,
		);

		setAttendance((previous) => {
			const withoutOldGroup = previous.map((record) => ({
				...record,
				intervals: record.intervals.filter(
					(interval) => interval.groupId !== groupId,
				),
			}));

			const updated = withoutOldGroup.filter(
				(record) => record.intervals.length > 0 || record.value.trim() !== "",
			);

			segments.forEach((segment) => {
				const existingIndex = updated.findIndex(
					(record) =>
						record.employeeId === employeeId &&
						record.date.slice(0, 10) === segment.date,
				);

				if (existingIndex >= 0) {
					updated[existingIndex] = {
						...updated[existingIndex],
						intervals: [
							...updated[existingIndex].intervals,
							...segment.intervals,
						],
					};
				} else {
					updated.push(segment);
				}
			});

			return updated;
		});

		setPendingOperations((previous) => {
			const existing = previous[groupId];

			return {
				...previous,
				[groupId]: {
					type: existing?.type === "CREATE" ? "CREATE" : "UPDATE",
					groupId,
					employeeId,
					date: date.slice(0, 10),
					startMinute,
					endMinute,
				},
			};
		});

		setSaveMessage("");
	};

	const handleDeleteInterval = (groupId: string) => {
		if (!canEditAttendance) return;

		setAttendance((previous) =>
			previous
				.map((record) => ({
					...record,
					intervals: record.intervals.filter(
						(interval) => interval.groupId !== groupId,
					),
				}))
				.filter(
					(record) => record.intervals.length > 0 || record.value.trim() !== "",
				),
		);

		setPendingOperations((previous) => {
			const existing = previous[groupId];

			// Deleting an interval that was never saved requires
			// no request to the server.
			if (existing?.type === "CREATE") {
				const remaining = { ...previous };
				delete remaining[groupId];
				return remaining;
			}

			return {
				...previous,
				[groupId]: {
					type: "DELETE",
					groupId,
				},
			};
		});

		setSaveMessage("");
	};

  const handleSaveCode = (
  employeeId: number,
  date: string,
  value: string
) => {
  if (!canEditAttendance) return;

  const normalizedValue = value.trim().toUpperCase();
  const key = `${employeeId}-${date}`;

  const record = attendance.find(
    (item) =>
      item.employeeId === employeeId &&
      item.date.slice(0, 10) === date
  );

  // Find every logical interval group touching this date.
  const groupIds = new Set(
    (record?.intervals ?? []).map((interval) => interval.groupId)
  );

  // Remove those groups from the pending interval operations.
  setPendingOperations((previous) => {
    const updated = { ...previous };

    for (const groupId of groupIds) {
      const operation = updated[groupId];

      if (operation?.type === "CREATE") {
        delete updated[groupId];
      } else {
        updated[groupId] = {
          type: "DELETE",
          groupId,
        };
      }
    }

    return updated;
  });

  // Remove the complete groups locally, including cross-midnight segments.
  setAttendance((previous) => {
    const updated = previous.map((item) => ({
      ...item,
      intervals: item.intervals.filter(
        (interval) => !groupIds.has(interval.groupId)
      ),
    }));

    const existingIndex = updated.findIndex(
      (item) =>
        item.employeeId === employeeId &&
        item.date.slice(0, 10) === date
    );

    if (existingIndex >= 0) {
      updated[existingIndex] = {
        ...updated[existingIndex],
        value: normalizedValue,
      };
    } else {
      updated.push({
        id: 0,
        employeeId,
        date,
        value: normalizedValue,
        intervals: [],
      });
    }

    return updated;
  });

  setPendingCodes((previous) => ({
    ...previous,
    [key]: {
      employeeId,
      date,
      value: normalizedValue,
    },
  }));

  setSaveMessage("");
  };
  
	const handleSaveAttendance = async () => {
		if (!canEditAttendance || isSaving) return;

		const operations = Object.values(pendingOperations);

		const codes = Object.values(pendingCodes);

if (operations.length === 0 && codes.length === 0) {
			setSaveMessage(t("tools.noChangesToSave"));
			return;
		}

		setIsSaving(true);
		setSaveMessage("");

		try {
			for (const operation of operations) {
				switch (operation.type) {
					case "CREATE":
						await createAttendanceInterval({
							employeeId: operation.employeeId,
							date: operation.date,
							startMinute: operation.startMinute,
							endMinute: operation.endMinute,
						});
						break;

					case "UPDATE":
						await updateAttendanceInterval(operation.groupId, {
							employeeId: operation.employeeId,
							date: operation.date,
							startMinute: operation.startMinute,
							endMinute: operation.endMinute,
						});
						break;

					case "DELETE":
						await deleteAttendanceInterval(operation.groupId);
						break;
				}

				// Remove each successful operation immediately.
				// This prevents duplicate creation if a later operation fails.
				setPendingOperations((previous) => {
					const remaining = { ...previous };
					delete remaining[operation.groupId];
					return remaining;
				});
			}
if (codes.length > 0) {
  await saveAttendanceBatch(codes);
  setPendingCodes({});
}
			const refreshedAttendance = await getAttendance(
				attendancePeriod.startDate,
				attendancePeriod.endDate,
			);

			setAttendance(refreshedAttendance);
			setSaveMessage(t("tools.attendanceSaved"));
		} catch (error) {
			console.error("Failed to save attendance:", error);

			setSaveMessage(
				error instanceof Error ? error.message : t("tools.saveError"),
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

		if (hasPendingChanges) {
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
		if (hasPendingChanges) {
			setSaveMessage(t("tools.saveBeforeChangingYear"));
			return;
		}

		setYear(newYear);
	};

	const handlePeriodModeChange = (newMode: AttendancePeriodMode): boolean => {
		if (isSaving) {
			setSaveMessage(t("tools.savingInProgress"));
			return false;
		}

		if (hasPendingChanges) {
			setSaveMessage(t("tools.saveBeforeChangingMonth"));
			return false;
		}

		const selection = getDefaultAttendanceSelection(newMode);

		setPeriodMode(newMode);
		setMonth(selection.month);
		setYear(selection.year);
		setSaveMessage("");

		return true;
	};

	const handleDepartmentChange = (newDepartment: string) => {
		if (isSaving) {
			setSaveMessage(t("tools.savingInProgress"));
			return;
		}
		if (hasPendingChanges) {
			setSaveMessage(t("tools.saveBeforeChangingDepartment"));
			return;
		}

		setDepartment(newDepartment);
	};
	return (
		<div className="min-h-screen bg-slate-50">
			<AppHeader
				user={user}
				onLogout={onLogout}
			/>
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
					{canExportAttendance && (
						<button
							type="button"
							onClick={handleExportExcel}
							disabled={employees.length === 0}
							className="inline-flex items-center gap-2 rounded-lg hover:cursor-pointer hover:bg-orange-300 px-4 py-2 text-md font-medium text-black shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
						>
							<img
								src={excelIcon}
								alt=""
								className="h-8 w-8"
							/>
							{t("tools.exportExcel")}
						</button>
					)}
				</div>
				<AttendanceToolbar
					month={month}
					year={year}
					periodMode={periodMode}
					onPeriodModeChange={handlePeriodModeChange}
					startDate={attendancePeriod.startDate}
					endDate={attendancePeriod.endDate}
					department={department}
					attendance={attendance}
					onMonthChange={handleMonthChange}
					onYearChange={handleYearChange}
					onDepartmentChange={handleDepartmentChange}
					canSelectDepartment={canViewAllDepartments}
					departments={departments}
					employees={employees}
					canManagePeriodLock={canManagePeriodLock}
					previousPeriod={previousPeriod}
					isLoadingPeriodLock={isLoadingPeriodLock}
					isUpdatingPeriodLock={isUpdatingPeriodLock}
					periodLockError={periodLockError}
					onPreviousPeriodLockChange={handlePreviousPeriodLockChange}
				/>

				<AttendanceTable
					startDate={attendancePeriod.startDate}
					endDate={attendancePeriod.endDate}
					department={department}
					attendance={attendance}
					employees={employees}
					onCreateInterval={handleCreateInterval}
					onUpdateInterval={handleUpdateInterval}
					onDeleteInterval={handleDeleteInterval}
					onSaveAttendance={handleSaveAttendance}
					hasUnsavedChanges={hasPendingChanges}
					isSaving={isSaving}
					saveMessage={saveMessage}
					isLoadingEmployees={isLoadingEmployees}
					employeesError={employeesError}
					isLoadingAttendance={isLoadingAttendance}
					attendanceError={attendanceError}
					canEditAttendance={canEditAttendance}
          publicHolidayDates={publicHolidayDates}
          onSaveCode={handleSaveCode}
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
