
import ExcelJS from "exceljs";
import type { Employee } from "../services/api";
import { calculateMonthlyTotals } from "./attendanceCalculations";

interface ExportAttendanceOptions {
  employees: Employee[];
  attendance: Record<string, string>;
  year: number;
  month: number;
  department: string;
  employeeId?: number;
}

export async function exportAttendanceExcel({
  employees,
  attendance,
  year,
  month,
  department,
  employeeId,
}: ExportAttendanceOptions) {
  const daysInMonth = new Date(year, month, 0).getDate();

  // Filter by selected department.
  let filteredEmployees =
    department === "all"
      ? employees
      : employees.filter(
          (employee) => employee.department?.name === department
        );

  // If an employee was selected, export only that employee.
  if (employeeId !== undefined) {
    filteredEmployees = filteredEmployees.filter(
      (employee) => employee.id === employeeId
    );
  }

  if (filteredEmployees.length === 0) {
    throw new Error("No employees found to export.");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Platform de Pointage";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Pointage Mensuel");

  const monthName = new Date(year, month - 1).toLocaleString("fr-FR", {
    month: "long",
  });

  // Report title.
  worksheet.mergeCells(1, 1, 1, daysInMonth + 5);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = `Pointage - ${monthName.toUpperCase()} ${year}`;
  titleCell.font = { bold: true, size: 20 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 50;

  // Column headers.
  const headers = [
    "Nom & Prénom",
      "Affect.",
    "HN",
    "HS",
    "H.Total",
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = new Date(year, month - 1, day);
      const weekday = date.toLocaleDateString("fr-FR", {
        weekday: "short",
      });

      return `${day}\n${weekday.charAt(0).toUpperCase()}`;
    }),
    
  ];

  worksheet.addRow(headers);

  const headerRow = worksheet.getRow(2);
  headerRow.height = 35;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF334155" },
  };

  // Employee attendance rows.
  for (const employee of filteredEmployees) {
    const dailyValues = Array.from(
      { length: daysInMonth },
      (_, index) => attendance[`${employee.id}-${index + 1}`] ?? ""
    );

    const totals = calculateMonthlyTotals(
      employee.id,
      attendance,
      year,
      month
    );

   const row = worksheet.addRow([
  employee.name,
  employee.department?.name ?? "",
  totals.normalHours,
  totals.overtimeHours,
  totals.normalHours + totals.overtimeHours,
  ...dailyValues,
]);

row.height = 30;
  }

  // Column widths.
  worksheet.getColumn(1).width = 20;
  worksheet.getColumn(2).width = 20;
  worksheet.getColumn(3).width = 10;
  worksheet.getColumn(4).width = 10;
  worksheet.getColumn(5).width = 10;

  for (let day = 1; day <= daysInMonth; day++) {
    worksheet.getColumn(day + 5).width = 6;
  }

 // Color the HN, HS and H.Total columns.
worksheet.getColumn(3).eachCell((cell, rowNumber) => {
    if (rowNumber >= 2) {
        cell.font = { color: { argb: "000000" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDCFCE7" }, // Light green
    };
  }
});

worksheet.getColumn(4).eachCell((cell, rowNumber) => {
    if (rowNumber >= 2) {
        cell.font = { color: { argb: "000000" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEE2E2" }, // Light red
    };
  }
});

worksheet.getColumn(5).eachCell((cell, rowNumber) => {
    if (rowNumber >= 2) {
        cell.font = { color: { argb: "000000" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF9C3" }, // Light yellow
    };
  }
});

  // Format attendance cells and totals.
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;

    row.alignment = { horizontal: "center", vertical: "middle" };

    row.eachCell((cell, columnNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };

      if (columnNumber <= 2) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }

      if (columnNumber >= daysInMonth + 3) {
        cell.font = { bold: true };
      }
    });
  });

  // Highlight Friday and Saturday columns.
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();

    if (weekday === 5 || weekday === 6) {
      const column = worksheet.getColumn(day + 2);

      column.eachCell((cell, rowNumber) => {
        if (rowNumber >= 2) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFECACA" },
          };
        }
      });
    }
  }

  worksheet.views = [{ state: "frozen", xSplit: 2, ySplit: 2 }];
  

  // Generate and download the Excel file.
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");


  const departmentSuffix =
    department === "all" ? "Toutes Les Structures" : department;

  link.href = url;
  link.download = `Pointage SOMIK ${month}-${year}--${departmentSuffix}.xlsx`;
  link.click();

  URL.revokeObjectURL(url);
}