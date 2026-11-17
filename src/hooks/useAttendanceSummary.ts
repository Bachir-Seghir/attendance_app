
import type { Employee } from "../services/api";
import { calculatePeriodTotals } from "../utils/attendanceCalculations";
import {
  type DateKey,
  getDatesBetween,
} from "../utils/attendancePeriod";

export function useAttendanceSummary(
  department: string,
  attendance: Record<string, string>,
  employees: Employee[],
  startDate: DateKey,
  endDate: DateKey
) {
  const filteredEmployees =
    department === "all"
      ? employees
      : employees.filter(
          (employee) => employee.department.name === department
        );

  const dates = getDatesBetween(startDate, endDate);

  return filteredEmployees.reduce(
    (totals, employee) => {
      const employeeTotals = calculatePeriodTotals(
        employee.id,
        attendance,
        dates
      );

      return {
        normalHours:
          totals.normalHours + employeeTotals.normalHours,

        overtimeHours:
          totals.overtimeHours + employeeTotals.overtimeHours,

        totalHours:
          totals.totalHours +
          employeeTotals.normalHours +
          employeeTotals.overtimeHours,
      };
    },
    {
      normalHours: 0,
      overtimeHours: 0,
      totalHours: 0,
    }
  );
}
