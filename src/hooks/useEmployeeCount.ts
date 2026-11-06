
import { employees } from "../data/employees";

export function useEmployeeCount(department: string) {
  const totalEmployees =
    department === "all"
      ? employees.length
      : employees.filter(
          (employee) => employee.department === department
        ).length;

  return totalEmployees;
}
