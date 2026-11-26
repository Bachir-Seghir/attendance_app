
import ExcelJS from "exceljs";
import type {
  Employee,
  AttendanceRecord,
} from "../services/api";

import {
  calculateDailyIntervalTotals,
  formatMinutesAsHours,
} from "./attendanceCalculation";

import {
  type DateKey,
  getDatesBetween,
  isWeekendDate,
  normalizeDateKey,
} from "./attendancePeriod";

interface ExportAttendanceOptions {
  employees: Employee[];
  attendance: AttendanceRecord[];
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

  // --------------------------------------------------
  // FILTER EMPLOYEES
  // --------------------------------------------------

  let filteredEmployees =
    department === "all"
      ? employees
      : employees.filter(
          (employee) => employee.department?.name === department
        );

  if (employeeId !== undefined) {
    filteredEmployees = filteredEmployees.filter(
      (employee) => employee.id === employeeId
    );
  }

  if (filteredEmployees.length === 0) {
    throw new Error("No employees found to export.");
  }

  const totalEmployees = filteredEmployees.length;

  // --------------------------------------------------
  // WORKBOOK
  // --------------------------------------------------

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Platform de Pointage";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Pointage Mensuel");

  const totalColumns = totalDays + 6;
  const firstDateColumn = 7;

  const formatDate = (date: DateKey) =>
    new Date(`${date}T00:00:00.000Z`).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  // --------------------------------------------------
  // ATTENDANCE LOOKUP
  // --------------------------------------------------

  const attendanceMap = new Map(
    attendance.map((record) => [
      `${record.employeeId}-${normalizeDateKey(record.date)}`,
      record,
    ])
  );

  // --------------------------------------------------
  // CALCULATE GLOBAL SUMMARY
  // Same calculation as AttendanceToolbar
  // --------------------------------------------------

  let totalR1Minutes = 0;
  let totalR2Minutes = 0;
  let totalR3Minutes = 0;

  for (const date of dates) {
    for (const employee of filteredEmployees) {
      const record = attendanceMap.get(
        `${employee.id}-${date}`
      );

      const dailyTotals = calculateDailyIntervalTotals(
        record?.intervals ?? [],
        date
      );

      totalR1Minutes += dailyTotals.r1Minutes;
      totalR2Minutes += dailyTotals.r2Minutes;
      totalR3Minutes += dailyTotals.r3Minutes;
    }
  }

  const summary = [
    {
      label: "HEURES NORMALES",
      value: formatMinutesAsHours(totalR1Minutes),
      background: "FFECFDF5",
      border: "FFA7F3D0",
      labelColor: "FF065F46",
      valueColor: "FF064E3B",
    },
    {
      label: "HEURES SUPPLÉMENTAIRES",
      value: formatMinutesAsHours(
        totalR2Minutes + totalR3Minutes
      ),
      background: "FFFFF7ED",
      border: "FFFED7AA",
      labelColor: "FFC2410C",
      valueColor: "FF78350F",
    },
    {
      label: "TOTAL HEURES",
      value: formatMinutesAsHours(
        totalR1Minutes + totalR2Minutes + totalR3Minutes
      ),
      background: "FFEFF6FF",
      border: "FFBFDBFE",
      labelColor: "FF334155",
      valueColor: "FF0F172A",
    },
    {
      label: "PERSONNEL TOTAL",
      value: String(totalEmployees),
      background: "FF065F46",
      border: "FF065F46",
      labelColor: "FFD1FAE5",
      valueColor: "FFFFFFFF",
    },
  ];

  // --------------------------------------------------
  // TITLE
  // --------------------------------------------------

  worksheet.mergeCells(1, 1, 1, totalColumns);

  const titleCell = worksheet.getCell(1, 1);

  titleCell.value =
    `POINTAGE - ${formatDate(startDate).toUpperCase()} AU ${formatDate(endDate).toUpperCase()}`;

  titleCell.font = {
    bold: true,
    size: 16,
    color: { argb: "FFFFFFFF" },
  };

  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF084B54" },
  };

  worksheet.getRow(1).height = 40;

  // --------------------------------------------------
  // SUMMARY CARDS
  // Rows 3 and 4
  // --------------------------------------------------

  const cardCount = summary.length;

  summary.forEach((card, index) => {
    const startColumn =
      Math.floor((index * totalColumns) / cardCount) + 1;

    const endColumn =
      Math.floor(((index + 1) * totalColumns) / cardCount);

    // Label row
    worksheet.mergeCells(
      3,
      startColumn,
      3,
      endColumn
    );

    // Value row
    worksheet.mergeCells(
      4,
      startColumn,
      4,
      endColumn
    );

    const labelCell = worksheet.getCell(3, startColumn);
    const valueCell = worksheet.getCell(4, startColumn);

    labelCell.value = card.label;
    valueCell.value = card.value;

    [labelCell, valueCell].forEach((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: card.background },
      };

      cell.border = {
        top: { style: "medium", color: { argb: card.border } },
        bottom: { style: "medium", color: { argb: card.border } },
        left: { style: "medium", color: { argb: card.border } },
        right: { style: "medium", color: { argb: card.border } },
      };

      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    });

    labelCell.font = {
      bold: true,
      size: 10,
      color: { argb: card.labelColor },
    };

    valueCell.font = {
      bold: true,
      size: 20,
      color: { argb: card.valueColor },
    };
  });

  worksheet.getRow(3).height = 25;
  worksheet.getRow(4).height = 38;
  worksheet.getRow(5).height = 12;

  // --------------------------------------------------
  // TWO-LEVEL HEADERS
  // Rows 6 and 7
  // --------------------------------------------------

  worksheet.mergeCells("A6:A7");
  worksheet.mergeCells("C6:D6");
  worksheet.mergeCells("E6:E7");
  worksheet.mergeCells("F6:F7");

  dates.forEach((_, index) => {
    const column = firstDateColumn + index;
    worksheet.mergeCells(6, column, 7, column);
  });

  worksheet.getCell("A6").value = "Employee";
  worksheet.getCell("B6").value = "HN";
  worksheet.getCell("C6").value = "HS";
  worksheet.getCell("E6").value = "All";
  worksheet.getCell("F6").value = "CR";

  worksheet.getCell("B7").value = "R1";
  worksheet.getCell("C7").value = "R2";
  worksheet.getCell("D7").value = "R3";

  dates.forEach((date, index) => {
    const currentDate = new Date(`${date}T00:00:00.000Z`);

    const day = currentDate.getUTCDate();

    const weekday = currentDate.toLocaleDateString("fr-FR", {
      weekday: "short",
      timeZone: "UTC",
    });

    const column = firstDateColumn + index;

    worksheet.getCell(6, column).value =
      `${day}\n${weekday.charAt(0).toUpperCase()}`;
  });

  // Header styling
  [6, 7].forEach((rowNumber) => {
    const row = worksheet.getRow(rowNumber);

    row.height = rowNumber === 6 ? 30 : 25;

    row.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
      };

      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF084B54" },
      };

      cell.border = {
        top: { style: "thin", color: { argb: "FFFFFFFF" } },
        bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
        left: { style: "thin", color: { argb: "FFFFFFFF" } },
        right: { style: "thin", color: { argb: "FFFFFFFF" } },
      };
    });
  });

  // --------------------------------------------------
  // EMPLOYEE ROWS
  // --------------------------------------------------

  for (const employee of filteredEmployees) {
    let r1Minutes = 0;
    let r2Minutes = 0;
    let r3Minutes = 0;

    const dailyValues = dates.map((date) => {
      const record = attendanceMap.get(
        `${employee.id}-${date}`
      );

      const dailyTotals = calculateDailyIntervalTotals(
        record?.intervals ?? [],
        date
      );

      r1Minutes += dailyTotals.r1Minutes;
      r2Minutes += dailyTotals.r2Minutes;
      r3Minutes += dailyTotals.r3Minutes;

      return dailyTotals.totalMinutes > 0
        ? formatMinutesAsHours(dailyTotals.totalMinutes)
        : "";
    });

    const row = worksheet.addRow([
      employee.name,
      formatMinutesAsHours(r1Minutes),
      formatMinutesAsHours(r2Minutes),
      formatMinutesAsHours(r3Minutes),
      formatMinutesAsHours(
        r1Minutes + r2Minutes + r3Minutes
      ),
      "—",
      ...dailyValues,
    ]);

    row.height = 30;
  }

  // --------------------------------------------------
  // COLUMN WIDTHS
  // --------------------------------------------------

  worksheet.getColumn(1).width = 25;
  worksheet.getColumn(2).width = 10;
  worksheet.getColumn(3).width = 10;
  worksheet.getColumn(4).width = 10;
  worksheet.getColumn(5).width = 12;
  worksheet.getColumn(6).width = 10;

  dates.forEach((_, index) => {
    worksheet.getColumn(firstDateColumn + index).width = 9;
  });

  // --------------------------------------------------
  // EMPLOYEE ROW FORMATTING
  // --------------------------------------------------

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 7) return;

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

      if (columnNumber === 1) {
        cell.alignment = {
          horizontal: "left",
          vertical: "middle",
        };

        cell.font = { bold: true };
      }

      if (columnNumber >= firstDateColumn) {
        cell.font = { bold: true };
      }
    });
  });

  // --------------------------------------------------
  // SUMMARY COLUMN COLORS
  // --------------------------------------------------

  const summaryColors: Record<number, string> = {
    2: "FFDCFCE7",
    3: "FFFEE2E2",
    4: "FFFEE2E2",
    5: "FFFEF9C3",
    6: "FFF1F5F9",
  };

  Object.entries(summaryColors).forEach(([column, color]) => {
    worksheet.getColumn(Number(column)).eachCell(
      (cell, rowNumber) => {
        if (rowNumber >= 8) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: color },
          };
        }
      }
    );
  });

  // --------------------------------------------------
  // WEEKEND HIGHLIGHTING
  // --------------------------------------------------

  dates.forEach((date, index) => {
    if (!isWeekendDate(date)) return;

    const column = worksheet.getColumn(firstDateColumn + index);

    column.eachCell((cell, rowNumber) => {
      if (rowNumber >= 8) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFECACA" },
        };
      }
    });
  });

  // --------------------------------------------------
  // FREEZE HEADERS AND EMPLOYEE COLUMN
  // --------------------------------------------------

  worksheet.views = [
    {
      state: "frozen",
      xSplit: 1,
      ySplit: 7,
    },
  ];

  // --------------------------------------------------
  // DOWNLOAD
  // --------------------------------------------------

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const departmentSuffix =
    department === "all"
      ? "Toutes_Les_Structures"
      : department;

  const safeDepartmentSuffix = departmentSuffix.replace(
    /[\\/:*?"<>|]/g,
    "_"
  );

  link.href = url;

  link.download =
    `Pointage_SOMIK_${startDate}_${endDate}_${safeDepartmentSuffix}.xlsx`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
