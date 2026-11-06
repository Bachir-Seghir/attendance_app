import { employees } from "../data/employees";
import { calculateMonthlyTotals } from "../utils/attendanceCalculations";

export function useAttendanceSummary(
  department: string,
  attendance: Record<string, string>,
  year: number,
  month: number
) {
  // Filter employees by selected department
  const filteredEmployees =
    department === "all"
      ? employees
      : employees.filter(
          (employee) => employee.department === department
        );

  // Calculate totals for filtered employees
  return filteredEmployees.reduce(
    (totals, employee) => {
      const employeeTotals = calculateMonthlyTotals(
        employee.id,
        attendance,
        year,
        month
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