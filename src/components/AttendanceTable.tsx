import { useRef } from "react";
import type { Employee } from "../services/api";
import { calculatePeriodTotals } from "../utils/attendanceCalculations";

import {
  type DateKey,
  getDatesBetween,
  getAttendanceKey,
  isWeekendDate,
} from "../utils/attendancePeriod";
import {
	validateAttendanceInput,
	isValidAttendanceValue,
} from "../utils/attendanceValidation";
import { ATTENDANCE_CODES } from "../utils/attendanceValidation";

interface AttendanceTableProps {
	startDate: DateKey;
  endDate: DateKey;
	department: string;
	employees: Employee[];
	attendance: Record<string, string>;
	hasUnsavedChanges: boolean;
	isSaving: boolean;
	saveMessage: string;
	isLoadingEmployees: boolean;
	employeesError: string;
	isLoadingAttendance: boolean;
	attendanceError: string;
	canEditAttendance: boolean;
	onAttendanceChange: (
  employeeId: number,
  date: DateKey,
  value: string
) => void;
	onSaveAttendance: () => void;
}

function AttendanceTable({
	department,
	employees,
	attendance,
	onAttendanceChange,
	hasUnsavedChanges,
	isSaving,
	saveMessage,
	onSaveAttendance,
	isLoadingEmployees,
	employeesError,
	isLoadingAttendance,
	attendanceError,
	canEditAttendance,
  startDate,
  endDate,
}: AttendanceTableProps) {
	const dates = getDatesBetween(startDate, endDate);

const getWeekdayInitial = (date: DateKey) => {
  return new Date(`${date}T00:00:00Z`)
    .toLocaleDateString("fr-FR", {
      weekday: "long",
      timeZone: "UTC",
    })
    .charAt(0)
    .toUpperCase();
};

const getDayNumber = (date: DateKey) => {
  return Number(date.slice(8, 10));
};

const getMonthLabel = (date: DateKey) => {
  return new Date(`${date}T00:00:00Z`)
    .toLocaleDateString("fr-FR", {
      month: "short",
      timeZone: "UTC",
    });
};

	const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

	// Update an attendance cell
	const handleAttendanceChange = (
  employeeId: number,
  date: DateKey,
  value: string
) => {
  if (!canEditAttendance) return;

  const validatedValue = validateAttendanceInput(value);

  if (validatedValue === null) return;

  onAttendanceChange(employeeId, date, validatedValue);
};

const handleAttendanceBlur = (
  employeeId: number,
  date: DateKey
) => {
  if (!canEditAttendance) return;

  const key = getAttendanceKey(employeeId, date);
  const value = attendance[key] ?? "";

  if (value !== "" && !isValidAttendanceValue(value)) {
    onAttendanceChange(employeeId, date, "");
  }
};


	// Filter employees by department
	const filteredEmployees =
    (department === "all"
        ? employees
        : employees.filter((employee) => employee.department.name === department)
    ).filter((employee) => {
        if (employee.isActive) return true;

        return dates.some((date) => {
  const key = getAttendanceKey(employee.id, date);

  return (attendance[key] ?? "").trim() !== "";
});
    });

	const handleCellNavigation = (
  event: React.KeyboardEvent<HTMLInputElement>,
  employeeIndex: number,
  dateIndex: number
) => {
  const employeeCount = filteredEmployees.length;

  let nextEmployeeIndex = employeeIndex;
  let nextDateIndex = dateIndex;

  switch (event.key) {
    case "ArrowLeft":
      nextDateIndex--;
      break;

    case "ArrowRight":
      nextDateIndex++;
      break;

    case "ArrowUp":
      nextEmployeeIndex--;
      break;

    case "ArrowDown":
      nextEmployeeIndex++;
      break;

    default:
      return;
  }

  event.preventDefault();

  if (
    nextDateIndex < 0 ||
    nextDateIndex >= dates.length
  ) {
    return;
  }

  if (
    event.key === "ArrowUp" ||
    event.key === "ArrowDown"
  ) {
    const direction = event.key === "ArrowUp" ? -1 : 1;

    while (
      nextEmployeeIndex >= 0 &&
      nextEmployeeIndex < employeeCount &&
      !filteredEmployees[nextEmployeeIndex].isActive
    ) {
      nextEmployeeIndex += direction;
    }
  }

  if (
    nextEmployeeIndex < 0 ||
    nextEmployeeIndex >= employeeCount
  ) {
    return;
  }

  const nextEmployee = filteredEmployees[nextEmployeeIndex];
  const nextDate = dates[nextDateIndex];

  const nextKey = getAttendanceKey(
    nextEmployee.id,
    nextDate
  );

  inputRefs.current[nextKey]?.focus();
};

	return (
		<section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
			{/* Table title */}
			<div className="px-5 py-4 border-b border-gray-200">
				<div className="flex items-center justify-between gap-4">
					<h2 className="text-lg font-semibold text-gray-800">
						Monthly Attendance
					</h2>
					{canEditAttendance && (
						<button
							type="button"
							onClick={onSaveAttendance}
							disabled={isSaving || !hasUnsavedChanges}
							className={`px-4 py-2  hover:cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors ${hasUnsavedChanges && !isSaving ? "save-reminder" : ""
								}`}
						>
							{isSaving ? "Sauvgarde En Cours..." : "Sauvgarder l'état Actuel"}
						</button>
					)}
				</div>
				{saveMessage && (
					<p
						className={`mt-2 text-sm font-medium ${
							saveMessage.includes("successfully")
								? "text-green-600"
								: "text-red-600"
						}`}
					>
						{saveMessage}
					</p>
				)}

				<p className="text-sm text-gray-500 mt-1">
					Enter the working hours for each employee.
				</p>

				<div className="mt-4 flex flex-wrap items-center gap-2">
					<span className="text-xs font-semibold text-gray-600 mr-1">
						Les Valeurs possible :
					</span>

					<span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
						0–14 Hours
					</span>

					{Object.entries(ATTENDANCE_CODES).map(([code, label]) => (
						<div
							key={code}
							title={label}
							className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 border border-gray-200"
						>
							<span className="text-xs font-bold text-gray-800">{code}</span>

							<span className="text-xs text-gray-500">{label}</span>
						</div>
					))}
				</div>
			</div>

			{/* Attendance table */}
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-sm">
					<thead className="bg-gray-100">
						<tr>
							<th className="sticky left-0 z-20 bg-gray-100 min-w-30 px-2 py-3 text-left font-semibold text-gray-700 border-b border-r">
								Nom & Prénom
							</th>

							<th className="min-w-22 px-2 py-3 text-left font-semibold text-gray-700 border-b border-r">
								Affect.
							</th>
							<th className="min-w-12 px-3 py-3 text-center font-semibold text-gray-700 border-b border-r bg-emerald-50">
								HN
							</th>

							<th className="min-w-12 px-3 py-3 text-center font-semibold text-gray-700 border-b border-r bg-orange-50">
								HS
							</th>
							{/* Day headers */}
							{dates.map((date) => {
  const weekend = isWeekendDate(date);

  return (
    <th
      key={date}
      className={`min-w-8 px-2 py-2 text-center border-b border-r ${
        weekend
          ? "bg-red-300 text-red-950"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      <div className="text-xs">
        {getWeekdayInitial(date)}
      </div>

      <div className="font-bold">
        {getDayNumber(date)}
      </div>

    </th>
  );
})}
						</tr>
					</thead>

					<tbody>
						{isLoadingEmployees ? (
							<tr>
								<td
									colSpan={dates.length + 4}
									className="text-center py-10 text-gray-500"
								>
									Loading employees...
								</td>
							</tr>
						) : employeesError ? (
							<tr>
								<td
									colSpan={dates.length + 4}
									className="text-center py-10 text-red-600"
								>
									{employeesError}
								</td>
							</tr>
						) : isLoadingAttendance ? (
    <tr>
        <td
            colSpan={dates.length + 4}
            className="text-center py-10 text-gray-500"
        >
            Loading attendance...
        </td>
    </tr>
) : attendanceError ? (
    <tr>
        <td
            colSpan={dates.length + 4}
            className="text-center py-10 text-red-600"
        >
            {attendanceError}
        </td>
    </tr>
) : (
    <>
								{filteredEmployees.map((employee, employeeIndex) => {
									const monthlyTotals = calculatePeriodTotals(
  employee.id,
  attendance,
  dates
);

									return (
										<tr
											key={employee.id}
											className={
    employee.isActive
        ? "hover:bg-blue-50 transition-colors"
        : "bg-gray-100 text-gray-400"
}
										>
											<td className={`sticky left-0 z-10 px-2 py-2 font-medium border-b border-r whitespace-nowrap ${
    employee.isActive
        ? "bg-white text-gray-800"
        : "bg-gray-200 text-gray-500"
}`}>
												{employee.name}
											</td>

											<td className={`px-2 py-2 border-b border-r whitespace-nowrap ${
    employee.isActive ? "text-gray-600" : "text-gray-400 bg-gray-100"
}`}>
												{employee.department.name}
											</td>
											<td className={`px-3 py-2 text-center font-semibold border-b border-r ${
    employee.isActive
        ? "text-emerald-700 bg-emerald-50"
        : "text-gray-400 bg-gray-200"
}`}>
												{monthlyTotals.normalHours}
											</td>

											<td className={`px-3 py-2 text-center font-semibold border-b border-r ${
    employee.isActive
        ? "text-orange-700 bg-orange-50"
        : "text-gray-400 bg-gray-200"
}`}>
												{monthlyTotals.overtimeHours}
											</td>
											{/* Attendance cells */}
											{dates.map((date, dateIndex) => {
  const weekend = isWeekendDate(date);

  const key = getAttendanceKey(employee.id, date);

  return (
    <td
      key={date}
      className={`p-1 border-b border-r text-center ${
        !employee.isActive
          ? "bg-gray-200"
          : weekend
            ? "bg-red-100"
            : "bg-white"
      }`}
    >
      <input
        disabled={!canEditAttendance || !employee.isActive}
        onFocus={(event) => event.target.select()}
        ref={(element) => {
          inputRefs.current[key] = element;
        }}
        onKeyDown={(event) =>
          handleCellNavigation(
            event,
            employeeIndex,
            dateIndex
          )
        }
        maxLength={5}
        autoComplete="off"
        type="text"
        value={attendance[key] ?? ""}
        onChange={(event) =>
          handleAttendanceChange(
            employee.id,
            date,
            event.target.value
          )
        }
        onBlur={() =>
          handleAttendanceBlur(employee.id, date)
        }
        className={`w-10 h-9 text-center rounded-md border outline-none ${
          !employee.isActive
            ? "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed"
            : weekend
              ? "bg-red-300 text-red-950 border-gray-300"
              : "bg-gray-100 text-gray-900 border-gray-300"
        } ${
          employee.isActive && canEditAttendance
            ? "focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
            : ""
        }`}
      />
    </td>
  );
})}
										</tr>
									);
								})}

								{/* Empty department message */}
								{!isLoadingEmployees &&
									!employeesError &&
									filteredEmployees.length === 0 && (
										<tr>
											<td
												colSpan={dates.length + 4}
												className="text-center py-10 text-gray-500"
											>
												No employees found.
											</td>
										</tr>
									)}
							</>
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
