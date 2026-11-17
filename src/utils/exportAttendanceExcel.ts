
import ExcelJS from "exceljs";
import type { Employee } from "../services/api";
import {
  calculatePeriodTotals,
} from "./attendanceCalculations";
import {
  type DateKey,
  getDatesBetween,
  getAttendanceKey,
  isWeekendDate,
} from "./attendancePeriod";

interface ExportAttendanceOptions {
  employees: Employee[];
  attendance: Record<string, string>;
  startDate: DateKey;
  endDate: DateKey;
  department: string;
  employeeId?: number;
}

export async function exportAttendanceExcel({
  employees,
  attendance,
  startDate,
  endDate,
  department,
  employeeId,
}: ExportAttendanceOptions) {
  const dates = getDatesBetween(startDate, endDate);
  const totalDays = dates.length;

  // Filter by selected department
  let filteredEmployees =
    department === "all"
      ? employees
      : employees.filter(
          (employee) => employee.department?.name === department
        );

  // Export only the selected employee when employeeId is provided
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

  const formatDate = (date: DateKey) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  const startLabel = formatDate(startDate);
  const endLabel = formatDate(endDate);

  // Report title
  worksheet.mergeCells(1, 1, 1, totalDays + 5);

  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = `POINTAGE - ${startLabel.toUpperCase()} AU ${endLabel.toUpperCase()}`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.getRow(1).height = 50;

  // Column headers
  const headers = [
    "Nom & Prénom",
    "Affect.",
    "HN",
    "HS",
    "H.Total",
    ...dates.map((date) => {
      const currentDate = new Date(`${date}T00:00:00Z`);

      const day = currentDate.getUTCDate();

      const weekday = currentDate.toLocaleDateString("fr-FR", {
        weekday: "short",
        timeZone: "UTC",
      });

      const monthName = currentDate.toLocaleDateString("fr-FR", {
        month: "short",
        timeZone: "UTC",
      });

      return `${day}\n${weekday.charAt(0).toUpperCase()}\n${monthName}`;
    }),
  ];

  worksheet.addRow(headers);

  const headerRow = worksheet.getRow(2);
  headerRow.height = 45;
  headerRow.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
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

  // Employee attendance rows
  for (const employee of filteredEmployees) {
    const dailyValues = dates.map(
      (date) =>
        attendance[getAttendanceKey(employee.id, date)] ?? ""
    );

    const totals = calculatePeriodTotals(
      employee.id,
      attendance,
      dates
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

  // Column widths
  worksheet.getColumn(1).width = 20;
  worksheet.getColumn(2).width = 20;
  worksheet.getColumn(3).width = 10;
  worksheet.getColumn(4).width = 10;
  worksheet.getColumn(5).width = 10;

  dates.forEach((_, index) => {
    worksheet.getColumn(index + 6).width = 8;
  });

  // Color HN column - light green
  worksheet.getColumn(3).eachCell((cell, rowNumber) => {
    if (rowNumber >= 2) {
      cell.font = { color: { argb: "FF000000" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDCFCE7" },
      };
    }
  });

  // Color HS column - light red
  worksheet.getColumn(4).eachCell((cell, rowNumber) => {
    if (rowNumber >= 2) {
      cell.font = { color: { argb: "FF000000" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEE2E2" },
      };
    }
  });

  // Color H.Total column - light yellow
  worksheet.getColumn(5).eachCell((cell, rowNumber) => {
    if (rowNumber >= 2) {
      cell.font = { color: { argb: "FF000000" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF9C3" },
      };
    }
  });

  // Format employee rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;

    row.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    row.eachCell((cell, columnNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };

      if (columnNumber <= 2) {
        cell.alignment = {
          horizontal: "left",
          vertical: "middle",
        };
      }

      if (columnNumber >= 6) {
        cell.font = { bold: true };
      }
    });
  });

  // Highlight Friday and Saturday columns
  dates.forEach((date, index) => {
    if (!isWeekendDate(date)) return;

    const column = worksheet.getColumn(index + 6);

    column.eachCell((cell, rowNumber) => {
      if (rowNumber >= 2) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFECACA" },
        };
      }
    });
  });

  // Freeze employee information and header rows
  worksheet.views = [
    {
      state: "frozen",
      xSplit: 2,
      ySplit: 2,
    },
  ];

  // Generate and download Excel file
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const departmentSuffix =
    department === "all" ? "Toutes_Les_Structures" : department;

  const safeDepartmentSuffix = departmentSuffix.replace(
    /[\\/:*?"<>|]/g,
    "_"
  );

  link.href = url;
  link.download = `Pointage_SOMIK_${startDate}_${endDate}_${safeDepartmentSuffix}.xlsx`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
