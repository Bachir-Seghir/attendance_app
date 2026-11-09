import cors from "cors";
import dotenv from "dotenv";
import prisma from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import { Role } from "@prisma/client";
import express, {
    type Request as ExpressRequest,
    type Response as ExpressResponse,
} from "express";
import {
  authenticateToken,
  authorizeRoles,
  type AuthenticatedRequest,
} from "./middleware/auth.js";
import usersRoutes from "./routes/users.js";

const ATTENDANCE_CODES = [
  "R",
  "F",
  "CR",
  "CA",
  "CF",
  "FO",
  "AA",
  "AI",
];

function isValidAttendanceValue(value: string): boolean {
  const normalized = value.trim().toUpperCase();

  if (ATTENDANCE_CODES.includes(normalized)) {
    return true;
  }

  const hours = Number(normalized);

  return (
    normalized !== "" &&
    Number.isInteger(hours) &&
    hours >= 0 &&
    hours <= 24
  );
}

const ATTENDANCE_EDIT_DEADLINE_DAYS = 4;

function getAuthenticatedUser(req: ExpressRequest) {
  return (req as AuthenticatedRequest).user!;
}

function parseAttendanceDate(value: unknown): Date | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function getAttendanceDeadline(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      ATTENDANCE_EDIT_DEADLINE_DAYS,
      22, 59, 59, 999
    )
  );
}

async function checkAttendanceWriteAccess(
  req: ExpressRequest,
  employeeId: number,
  date: Date
): Promise<string | null> {
  const user = getAuthenticatedUser(req);

  if (user.role === Role.SUPER_ADMIN) {
    return null;
  }

  if (user.role !== Role.ATTENDANCE_OFFICER) {
    return "You cannot modify attendance.";
  }

  if (user.departmentId === null) {
    return "Your account has no assigned department.";
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
    departmentId: true,
    isActive: true,
},
  });

  if (!employee) {
    return "Employee not found.";
  }
if (!employee.isActive) {
    return "Cannot modify attendance for an inactive employee.";
}
  if (employee.departmentId !== user.departmentId) {
    return "You can only modify attendance for your assigned department.";
  }

  if (new Date() > getAttendanceDeadline(date)) {
    return "The attendance editing deadline has passed.";
  }

  return null;
}

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);

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

app.get("/api/departments",authenticateToken, async (req, res) => {
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

app.post("/api/departments",authenticateToken, authorizeRoles(Role.SUPER_ADMIN), async (req, res) => {
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

app.patch(
  "/api/departments/:id",
  authenticateToken,
  authorizeRoles(Role.SUPER_ADMIN),
  async (req: ExpressRequest, res: ExpressResponse) => {
    const id = Number(req.params.id);
    const name =
      typeof req.body.name === "string" ? req.body.name.trim() : "";

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ status: "error", message: "Invalid department ID." });
      return;
    }

    if (!name || name.length > 100) {
      res.status(400).json({
        status: "error",
        message: "Department name must contain between 1 and 100 characters.",
      });
      return;
    }

    try {
      const existing = await prisma.department.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ status: "error", message: "Department not found." });
        return;
      }

      const department = await prisma.department.update({
        where: { id },
        data: { name },
      });

      res.json({ status: "success", department });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        res.status(409).json({
          status: "error",
          message: "A department with this name already exists.",
        });
        return;
      }

      console.error("Failed to update department:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update department.",
      });
    }
  }
);

app.delete(
  "/api/departments/:id",
  authenticateToken,
  authorizeRoles(Role.SUPER_ADMIN),
  async (req: ExpressRequest, res: ExpressResponse) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ status: "error", message: "Invalid department ID." });
      return;
    }

    try {
      const department = await prisma.department.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              employees: true,
              users: true,
            },
          },
        },
      });

      if (!department) {
        res.status(404).json({ status: "error", message: "Department not found." });
        return;
      }

      if (department._count.employees > 0 || department._count.users > 0) {
        res.status(409).json({
          status: "error",
          message:
            "This department cannot be deleted because employees or users are assigned to it.",
        });
        return;
      }

      await prisma.department.delete({ where: { id } });

      res.json({
        status: "success",
        message: "Department deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete department:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to delete department.",
      });
    }
  }
);

app.post("/api/employees",authenticateToken, authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER), async (req, res) => {
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

app.get("/api/employees", authenticateToken, async (req, res) => {
    try {
        const user = getAuthenticatedUser(req);

        if (
            user.role === Role.ATTENDANCE_OFFICER &&
            user.departmentId === null
        ) {
            res.status(403).json({
                status: "error",
                message: "Your account has no assigned department.",
            });
            return;
        }

        const month = Number(req.query.month);
        const year = Number(req.query.year);

        const hasMonthFilter =
            Number.isInteger(month) &&
            month >= 1 &&
            month <= 12 &&
            Number.isInteger(year) &&
            year >= 2000 &&
            year <= 9999;

        const includeInactive = req.query.includeInactive === "true";

        const where: any = {
            ...(user.role === Role.ATTENDANCE_OFFICER
                ? { departmentId: user.departmentId! }
                : {}),
        };

        if (includeInactive) {
            // Management screen: return active and inactive employees.
        } else if (hasMonthFilter) {
            const startDate = new Date(Date.UTC(year, month - 1, 1));
            const endDate = new Date(Date.UTC(year, month, 1));

            where.OR = [
                { isActive: true },
                {
                    isActive: false,
                    attendance: {
                        some: {
                            date: {
                                gte: startDate,
                                lt: endDate,
                            },
                        },
                    },
                },
            ];
        } else {
            where.isActive = true;
        }

        const employees = await prisma.employee.findMany({
            where,
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

app.patch(
  "/api/employees/:id",
  authenticateToken,
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, departmentId } = req.body;

      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({
          status: "error",
          message: "Invalid employee ID",
        });
        return;
      }

      const existingEmployee = await prisma.employee.findUnique({
        where: { id },
      });

      if (!existingEmployee) {
        res.status(404).json({
          status: "error",
          message: "Employee not found",
        });
        return;
      }

      const data: {
        name?: string;
        departmentId?: number;
      } = {};

      if (name !== undefined) {
        if (
          typeof name !== "string" ||
          !name.trim() ||
          name.trim().length > 100
        ) {
          res.status(400).json({
            status: "error",
            message: "Employee name must be between 1 and 100 characters",
          });
          return;
        }

        data.name = name.trim();
      }

      if (departmentId !== undefined) {
        const parsedDepartmentId = Number(departmentId);

        if (
          !Number.isInteger(parsedDepartmentId) ||
          parsedDepartmentId <= 0
        ) {
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

        data.departmentId = parsedDepartmentId;
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({
          status: "error",
          message: "No changes provided",
        });
        return;
      }

      const employee = await prisma.employee.update({
        where: { id },
        data,
        include: {
          department: true,
        },
      });

      res.json({
        status: "success",
        data: employee,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        status: "error",
        message: "Failed to update employee",
      });
    }
  }
);

app.delete(
  "/api/employees/:id",
  authenticateToken,
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({
          status: "error",
          message: "Invalid employee ID",
        });
        return;
      }

      const employee = await prisma.employee.findUnique({
        where: { id },
      });

      if (!employee) {
        res.status(404).json({
          status: "error",
          message: "Employee not found",
        });
        return;
      }

      if (!employee.isActive) {
        res.status(400).json({
          status: "error",
          message: "Employee is already inactive",
        });
        return;
      }

      await prisma.employee.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        status: "success",
        message: "Employee deactivated successfully",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        status: "error",
        message: "Failed to deactivate employee",
      });
    }
  }
);

app.patch(
  "/api/employees/:id/restore",
  authenticateToken,
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({
          status: "error",
          message: "Invalid employee ID",
        });
        return;
      }

      const employee = await prisma.employee.findUnique({
        where: { id },
      });

      if (!employee) {
        res.status(404).json({
          status: "error",
          message: "Employee not found",
        });
        return;
      }

      if (employee.isActive) {
        res.status(400).json({
          status: "error",
          message: "Employee is already active",
        });
        return;
      }

      const restoredEmployee = await prisma.employee.update({
        where: { id },
        data: { isActive: true },
        include: {
          department: true,
        },
      });

      res.json({
        status: "success",
        data: restoredEmployee,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        status: "error",
        message: "Failed to reactivate employee",
      });
    }
  }
);


app.post("/api/attendance",authenticateToken, authorizeRoles(Role.SUPER_ADMIN, Role.ATTENDANCE_OFFICER), async (req, res) => {
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
const parsedDate = parseAttendanceDate(date);

if (!parsedDate) {
  res.status(400).json({
    status: "error",
    message: "A valid date is required (YYYY-MM-DD).",
  });
  return;
}

if (
  typeof value !== "string" ||
  !isValidAttendanceValue(value)
) {
  res.status(400).json({
    status: "error",
    message: "Invalid attendance value.",
  });
  return;
}

const permissionError = await checkAttendanceWriteAccess(
  req,
  parsedEmployeeId,
  parsedDate
);

if (permissionError) {
  res.status(403).json({
    status: "error",
    message: permissionError,
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

app.get("/api/attendance",authenticateToken, async (req, res) => {
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

    const user = getAuthenticatedUser(req);

if (
  user.role === Role.ATTENDANCE_OFFICER &&
  user.departmentId === null
) {
  res.status(403).json({
    status: "error",
    message: "Your account has no assigned department.",
  });
  return;
}

const attendance = await prisma.attendance.findMany({
  where: {
    date: {
      gte: startDate,
      lt: endDate,
    },
    ...(user.role === Role.ATTENDANCE_OFFICER
      ? {
          employee: {
            departmentId: user.departmentId!,
          },
        }
      : {}),
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

app.delete("/api/attendance",authenticateToken, authorizeRoles(Role.SUPER_ADMIN, Role.ATTENDANCE_OFFICER), async (req, res) => {
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
const parsedDate = parseAttendanceDate(date);

if (!parsedDate) {
  res.status(400).json({
    status: "error",
    message: "Invalid attendance date.",
  });
  return;
}

const permissionError = await checkAttendanceWriteAccess(
  req,
  employeeId,
  parsedDate
);

if (permissionError) {
  res.status(403).json({
    status: "error",
    message: permissionError,
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

app.post("/api/attendance/batch",authenticateToken, authorizeRoles(Role.SUPER_ADMIN, Role.ATTENDANCE_OFFICER), async (req, res) => {
  try {
    const { changes } = req.body;

    if (!Array.isArray(changes)) {
      res.status(400).json({
        status: "error",
        message: "Changes must be an array",
      });
      return;
    }

    if (changes.length === 0) {
  res.status(400).json({
    status: "error",
    message: "No attendance changes provided",
  });
  return;
    }
    const user = getAuthenticatedUser(req);

for (const change of changes) {
  if (!change || typeof change !== "object") {
    res.status(400).json({
      status: "error",
      message: "Invalid attendance data.",
    });
    return;
  }

  const employeeId = Number(change.employeeId);
  const date = parseAttendanceDate(change.date);

  if (
    !Number.isInteger(employeeId) ||
    employeeId <= 0 ||
    !date ||
    typeof change.value !== "string" ||
    (change.value.trim() !== "" &&
      !isValidAttendanceValue(change.value))
  ) {
    res.status(400).json({
      status: "error",
      message: "Invalid attendance data.",
    });
    return;
  }

  const permissionError = await checkAttendanceWriteAccess(
    req,
    employeeId,
    date
  );

  if (permissionError) {
    res.status(403).json({
      status: "error",
      message: permissionError,
    });
    return;
  }
}
    
    const operations = changes.map((change) => {
      const { employeeId, date, value } = change;

      const parsedEmployeeId = Number(employeeId);

      if (
  !Number.isInteger(parsedEmployeeId) ||
  parsedEmployeeId <= 0 ||
  typeof date !== "string" ||
  !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
  typeof value !== "string"
) {
  throw new Error("Invalid attendance data");
}

const parsedDate = new Date(`${date}T00:00:00.000Z`);

if (
  Number.isNaN(parsedDate.getTime()) ||
  parsedDate.toISOString().slice(0, 10) !== date
) {
  throw new Error("Invalid attendance date");
}

if (value.trim() !== "" && !isValidAttendanceValue(value)) {
  throw new Error(`Invalid attendance value: ${value}`);
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

  if (error instanceof Error && error.message.startsWith("Invalid")) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
    return;
  }

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