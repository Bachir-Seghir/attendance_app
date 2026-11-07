import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./lib/prisma.js";
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "Attendance API is running!",
  });
});

app.get("/api/db-check", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "success",
      message: "PostgreSQL connected through Prisma!",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.get("/api/departments", async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      status: "success",
      data: departments,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve departments",
    });
  }
});

app.post("/api/departments", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        status: "error",
        message: "Department name is required",
      });
      return;
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
      },
    });

    res.status(201).json({
      status: "success",
      data: department,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to create department",
    });
  }
});


app.post("/api/employees", async (req, res) => {
  try {
    const { name, departmentId } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        status: "error",
        message: "Employee name is required",
      });
      return;
    }

    const parsedDepartmentId = Number(departmentId);

    if (!Number.isInteger(parsedDepartmentId) || parsedDepartmentId <= 0) {
      res.status(400).json({
        status: "error",
        message: "A valid department ID is required",
      });
      return;
    }

    const department = await prisma.department.findUnique({
      where: { id: parsedDepartmentId },
    });

    if (!department) {
      res.status(404).json({
        status: "error",
        message: "Department not found",
      });
      return;
    }

    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        departmentId: parsedDepartmentId,
      },
      include: {
        department: true,
      },
    });

    res.status(201).json({
      status: "success",
      data: employee,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to create employee",
    });
  }
});

app.get("/api/employees", async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        department: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      status: "success",
      data: employees,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve employees",
    });
  }
});

app.post("/api/attendance", async (req, res) => {
  try {
    const { employeeId, date, value } = req.body;

    const parsedEmployeeId = Number(employeeId);

    if (!Number.isInteger(parsedEmployeeId) || parsedEmployeeId <= 0) {
      res.status(400).json({
        status: "error",
        message: "A valid employee ID is required",
      });
      return;
    }

    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date
    ) {
      res.status(400).json({
        status: "error",
        message: "A valid date is required (YYYY-MM-DD)",
      });
      return;
    }

    if (typeof value !== "string" || !value.trim()) {
      res.status(400).json({
        status: "error",
        message: "Attendance value is required",
      });
      return;
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: parsedEmployeeId,
          date: new Date(`${date}T00:00:00.000Z`),
        },
      },
      update: {
        value: value.trim().toUpperCase(),
      },
      create: {
        employeeId: parsedEmployeeId,
        date: new Date(`${date}T00:00:00.000Z`),
        value: value.trim().toUpperCase(),
      },
    });

    res.status(200).json({
      status: "success",
      data: attendance,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to save attendance",
    });
  }
});

app.get("/api/attendance", async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 2000
    ) {
      res.status(400).json({
        status: "error",
        message: "Valid month and year are required",
      });
      return;
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const attendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        employee: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    res.json({
      status: "success",
      data: attendance,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve attendance",
    });
  }
});

app.delete("/api/attendance", async (req, res) => {
  try {
    const employeeId = Number(req.query.employeeId);
    const date = req.query.date;

    if (
      !Number.isInteger(employeeId) ||
      employeeId <= 0 ||
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      res.status(400).json({
        status: "error",
        message: "Valid employee ID and date are required",
      });
      return;
    }

    const attendance = await prisma.attendance.deleteMany({
      where: {
        employeeId,
        date: new Date(`${date}T00:00:00.000Z`),
      },
    });

    res.json({
      status: "success",
      message: "Attendance deleted successfully",
      deletedCount: attendance.count,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to delete attendance",
    });
  }
});

app.post("/api/attendance/batch", async (req, res) => {
  try {
    const { changes } = req.body;

    if (!Array.isArray(changes)) {
      res.status(400).json({
        status: "error",
        message: "Changes must be an array",
      });
      return;
    }

    const operations = changes.map((change) => {
      const { employeeId, date, value } = change;

      const parsedEmployeeId = Number(employeeId);

      if (
        !Number.isInteger(parsedEmployeeId) ||
        parsedEmployeeId <= 0 ||
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date ||
        typeof value !== "string"
      ) {
        throw new Error("Invalid attendance data");
      }

      const recordDate = new Date(`${date}T00:00:00.000Z`);

      if (value.trim() === "") {
        return prisma.attendance.deleteMany({
          where: {
            employeeId: parsedEmployeeId,
            date: recordDate,
          },
        });
      }

      return prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: parsedEmployeeId,
            date: recordDate,
          },
        },
        update: {
          value: value.trim().toUpperCase(),
        },
        create: {
          employeeId: parsedEmployeeId,
          date: recordDate,
          value: value.trim().toUpperCase(),
        },
      });
    });

    await prisma.$transaction(operations);

    res.json({
      status: "success",
      message: "Attendance saved successfully!",
      savedCount: changes.length,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to save attendance",
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});