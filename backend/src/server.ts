import { randomUUID } from "node:crypto";
import { splitAttendanceInterval } from "./utils/split-attendance-interval.js";

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

import {
  getAttendancePeriodForDate,
  getAttendancePeriod,
  getAttendancePeriodLockDate,
} from "./utils/attendance-period.js";

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


function isImmediatelyPreviousPeriod(
  periodStart: Date,
  periodEnd: Date,
  now: Date
): boolean {
  const currentPeriod = getAttendancePeriodForDate(now);

  const previousPeriodEnd = new Date(
    currentPeriod.startDate.getTime() - 24 * 60 * 60 * 1000
  );

  const previousPeriodStart = new Date(
    Date.UTC(
      previousPeriodEnd.getUTCFullYear(),
      previousPeriodEnd.getUTCMonth() - 1,
      21
    )
  );

  return (
    periodStart.getTime() === previousPeriodStart.getTime() &&
    periodEnd.getTime() === previousPeriodEnd.getTime()
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

  // Identify the attendance period containing this date.
  const { startDate, endDate } = getAttendancePeriodForDate(date);

  // Look up the period configuration.
  const period = await prisma.attendancePeriod.findUnique({
    where: {
      startDate_endDate: {
        startDate,
        endDate,
      },
    },
    select: {
      previousPeriodUnlocked: true,
    },
  });

  const now = new Date();
  const lockDate = getAttendancePeriodLockDate(endDate);

  // Before the automatic lock date, attendance remains editable.
  if (now < lockDate) {
    return null;
  }

  // Only the immediately previous period can be manually unlocked.
  const isPreviousPeriod = isImmediatelyPreviousPeriod(
    startDate,
    endDate,
    now
  );

  if (isPreviousPeriod && period?.previousPeriodUnlocked) {
    return null;
  }

  return "This attendance period is locked. Contact your manager if it needs to be reopened.";
}


function getPreviousAttendancePeriod(now = new Date()) {
  const currentPeriod = getAttendancePeriodForDate(now);

  const previousPeriodEnd = new Date(
    currentPeriod.startDate.getTime() - 24 * 60 * 60 * 1000
  );

  return getAttendancePeriodForDate(previousPeriodEnd);
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

        
const startDateParam = req.query.startDate;
const endDateParam = req.query.endDate;

const hasDateFilter =
  startDateParam !== undefined || endDateParam !== undefined;

let startDate: Date | null = null;
let endDateExclusive: Date | null = null;

if (hasDateFilter) {
  const parsedStartDate = parseAttendanceDate(startDateParam);
  const parsedEndDate = parseAttendanceDate(endDateParam);

  if (!parsedStartDate || !parsedEndDate) {
    res.status(400).json({
      status: "error",
      message: "Valid startDate and endDate are required (YYYY-MM-DD).",
    });
    return;
  }

  if (parsedStartDate > parsedEndDate) {
    res.status(400).json({
      status: "error",
      message: "startDate must be before or equal to endDate.",
    });
    return;
  }

  startDate = parsedStartDate;

  endDateExclusive = new Date(parsedEndDate);
  endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1);
}

const includeInactive = req.query.includeInactive === "true";

const where: any = {
  ...(user.role === Role.ATTENDANCE_OFFICER
    ? { departmentId: user.departmentId! }
    : {}),
};

if (includeInactive) {
  // Management screen: return active and inactive employees.
} else if (hasDateFilter) {
  where.OR = [
    { isActive: true },
    {
      isActive: false,
      attendance: {
        some: {
          date: {
            gte: startDate!,
            lt: endDateExclusive!,
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


app.get("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const startDate = parseAttendanceDate(req.query.startDate);
    const endDate = parseAttendanceDate(req.query.endDate);

    if (!startDate || !endDate) {
      res.status(400).json({
        status: "error",
        message: "Valid startDate and endDate are required (YYYY-MM-DD).",
      });
      return;
    }

    if (startDate > endDate) {
      res.status(400).json({
        status: "error",
        message: "startDate must be before or equal to endDate.",
      });
      return;
    }

    const user = getAuthenticatedUser(req);

    // Attendance officers must have an assigned department.
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

    // Exclusive end boundary: midnight after the requested end date.
    const queryStart = new Date(startDate);
queryStart.setUTCDate(queryStart.getUTCDate() - 1);

const queryEndExclusive = new Date(endDate);
queryEndExclusive.setUTCDate(queryEndExclusive.getUTCDate() + 2);

    const attendance = await prisma.attendance.findMany({
      where: {
        date: {
  gte: queryStart,
  lt: queryEndExclusive,
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
  intervals: {
    orderBy: {
      startMinute: "asc",
    },
  },
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


app.post(
  "/api/attendance/intervals/batch",
  authenticateToken,
  authorizeRoles(Role.SUPER_ADMIN, Role.ATTENDANCE_OFFICER),
  async (req, res) => {
    try {
      const { changes } = req.body;

      if (!Array.isArray(changes) || changes.length === 0) {
        res.status(400).json({
          status: "error",
          message: "A non-empty changes array is required.",
        });
        return;
      }

      const validatedChanges: {
        employeeId: number;
        date: Date;
        intervals: {
          groupId: string;
          startMinute: number;
          endMinute: number;
        }[];
      }[] = [];

      const changedDays = new Set<string>();

      // Validate the complete request before writing anything.
      for (const change of changes) {
        const employeeId = Number(change?.employeeId);
        const date = parseAttendanceDate(change?.date);

        if (
          !Number.isInteger(employeeId) ||
          employeeId <= 0 ||
          !date ||
          !Array.isArray(change.intervals)
        ) {
          res.status(400).json({
            status: "error",
            message: "Invalid employee, date, or intervals.",
          });
          return;
        }

        const dayKey = `${employeeId}-${change.date}`;

        if (changedDays.has(dayKey)) {
          res.status(400).json({
            status: "error",
            message: `Duplicate attendance day: ${dayKey}`,
          });
          return;
        }

        changedDays.add(dayKey);

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

        const intervals = change.intervals.map((interval: any) => ({
          groupId: interval?.groupId,
          startMinute: interval?.startMinute,
          endMinute: interval?.endMinute,
        }));

        for (const interval of intervals) {
          if (
            typeof interval.groupId !== "string" ||
            !interval.groupId.trim() ||
            interval.groupId.length > 100 ||
            !Number.isInteger(interval.startMinute) ||
            !Number.isInteger(interval.endMinute) ||
            interval.startMinute < 0 ||
            interval.endMinute > 1440 ||
            interval.startMinute >= interval.endMinute
          ) {
            res.status(400).json({
              status: "error",
              message: "Invalid interval. Times must be between 00:00 and 24:00.",
            });
            return;
          }
        }

        // Reject overlapping intervals within the same employee/day.
        const sortedIntervals = [...intervals].sort(
          (a, b) => a.startMinute - b.startMinute
        );

        for (let i = 1; i < sortedIntervals.length; i++) {
          if (
            sortedIntervals[i].startMinute <
            sortedIntervals[i - 1].endMinute
          ) {
            res.status(400).json({
              status: "error",
              message: `Overlapping intervals for employee ${employeeId} on ${change.date}.`,
            });
            return;
          }
        }

        validatedChanges.push({
          employeeId,
          date,
          intervals,
        });
      }

      // Save all days atomically.
      await prisma.$transaction(async (tx) => {
        for (const change of validatedChanges) {
          const attendance = await tx.attendance.upsert({
            where: {
              employeeId_date: {
                employeeId: change.employeeId,
                date: change.date,
              },
            },
            update: {
              value: "",
            },
            create: {
              employeeId: change.employeeId,
              date: change.date,
              value: "",
            },
          });

          // Replace the intervals for this specific day.
          await tx.attendanceInterval.deleteMany({
            where: {
              attendanceId: attendance.id,
            },
          });

          if (change.intervals.length > 0) {
            await tx.attendanceInterval.createMany({
              data: change.intervals.map((interval) => ({
                attendanceId: attendance.id,
                groupId: interval.groupId,
                startMinute: interval.startMinute,
                endMinute: interval.endMinute,
              })),
            });
          }
        }
      });

      res.json({
        status: "success",
        message: "Attendance intervals saved successfully.",
        savedCount: validatedChanges.length,
      });
    } catch (error) {
      console.error("Failed to save attendance intervals:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to save attendance intervals.",
      });
    }
  }
);



app.post(
  "/api/attendance/intervals",
  authenticateToken,
  authorizeRoles(Role.SUPER_ADMIN, Role.ATTENDANCE_OFFICER),
  async (req, res) => {
    try {
      const employeeId = Number(req.body.employeeId);
      const { date, startMinute, endMinute } = req.body;

      // 1. Validate employee.
      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        res.status(400).json({
          status: "error",
          message: "Invalid employee ID.",
        });
        return;
      }

      // 2. Validate date.
      const parsedDate = parseAttendanceDate(date);

      if (!parsedDate) {
        res.status(400).json({
          status: "error",
          message: "Invalid attendance date.",
        });
        return;
      }

      // 3. Generate a unique ID for the logical interval.
      const groupId = randomUUID();

      // 4. Split the interval into daily segments.
      const segments = splitAttendanceInterval({
        date,
        startMinute,
        endMinute,
        groupId,
      });

      // 5. Check permission for every affected day.
      for (const segment of segments) {
        const segmentDate = parseAttendanceDate(segment.date)!;

        const permissionError = await checkAttendanceWriteAccess(
          req,
          employeeId,
          segmentDate
        );

        if (permissionError) {
          res.status(403).json({
            status: "error",
            message: permissionError,
          });
          return;
        }
      }

      // 6. Check overlaps and save all segments in one transaction.
      const result = await prisma.$transaction(
        async (tx) => {
          // Find existing intervals on the affected dates.
          const existingIntervals = await tx.attendanceInterval.findMany({
            where: {
              attendance: {
                employeeId,
                date: {
                  in: segments.map(
                    (segment) => parseAttendanceDate(segment.date)!
                  ),
                },
              },
            },
          });

          // Check for overlaps.
          const hasOverlap = segments.some((segment) =>
            existingIntervals.some(
              (existing) =>
                existing.startMinute < segment.endMinute &&
                existing.endMinute > segment.startMinute
            )
          );

          if (hasOverlap) {
            return {
              hasOverlap: true as const,
              data: [],
            };
          }

          // Save each segment exactly once.
          const savedSegments = [];

          for (const segment of segments) {
            const segmentDate = parseAttendanceDate(segment.date)!;

            const attendance = await tx.attendance.upsert({
              where: {
                employeeId_date: {
                  employeeId,
                  date: segmentDate,
                },
              },
              update: {},
              create: {
                employeeId,
                date: segmentDate,
                value: "",
              },
            });

            const savedInterval = await tx.attendanceInterval.create({
              data: {
                attendanceId: attendance.id,
                groupId: segment.groupId,
                startMinute: segment.startMinute,
                endMinute: segment.endMinute,
              },
            });

            savedSegments.push({
              ...savedInterval,
              date: segment.date,
            });
          }

          return {
            hasOverlap: false as const,
            data: savedSegments,
          };
        },
        {
          isolationLevel: "Serializable",
        }
      );

      // 7. Handle overlap response.
      if (result.hasOverlap) {
        res.status(409).json({
          status: "error",
          message: "This interval overlaps with existing attendance.",
        });
        return;
      }

      // 8. Return successful response.
      res.status(201).json({
        status: "success",
        message: "Attendance interval saved successfully.",
        data: result.data,
      });
      return;

    } catch (error) {
      console.error("Failed to save attendance interval:", error);

      // Prisma serialization conflict.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034"
      ) {
        res.status(409).json({
          status: "error",
          message: "A concurrent attendance update occurred. Please retry.",
        });
        return;
      }

      res.status(500).json({
        status: "error",
        message: "Failed to save attendance interval.",
      });
    }
  }
);


app.put(
  "/api/attendance/intervals/:groupId",
  authenticateToken,
  authorizeRoles(Role.SUPER_ADMIN, Role.ATTENDANCE_OFFICER),
  async (req, res) => {
    try {
      const { date, startMinute, endMinute } = req.body;
      //* 1. Validate group ID.
const groupId = req.params.groupId;

if (typeof groupId !== "string" || groupId.length === 0 || groupId.length > 100) {
  res.status(400).json({
    status: "error",
    message: "Invalid interval group ID.",
  });
  return;
}

      // 2. Find all daily segments belonging to this interval.
      const existingGroup = await prisma.attendanceInterval.findMany({
        where: { groupId },
        include: {
          attendance: {
            select: {
              employeeId: true,
              date: true,
            },
          },
        },
      });

      if (existingGroup.length === 0) {
        res.status(404).json({
          status: "error",
          message: "Attendance interval not found.",
        });
        return;
      }

      const employeeId = existingGroup[0].attendance.employeeId;

      // Ensure all segments belong to the same employee.
      if (
        existingGroup.some(
          (interval) => interval.attendance.employeeId !== employeeId
        )
      ) {
        res.status(409).json({
          status: "error",
          message: "Invalid attendance interval group.",
        });
        return;
      }

      // 3. Validate the new date.
      const parsedDate = parseAttendanceDate(date);

      if (!parsedDate) {
        res.status(400).json({
          status: "error",
          message: "Invalid attendance date.",
        });
        return;
      }

      // 4. Generate the new daily segments using the SAME groupId.
      let segments;

      try {
        segments = splitAttendanceInterval({
          date,
          startMinute,
          endMinute,
          groupId,
        });
      } catch (error) {
        res.status(400).json({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Invalid attendance interval.",
        });
        return;
      }

      // 5. Check permission for every old segment.
      for (const interval of existingGroup) {
        const permissionError = await checkAttendanceWriteAccess(
          req,
          employeeId,
          interval.attendance.date
        );

        if (permissionError) {
          res.status(403).json({
            status: "error",
            message: permissionError,
          });
          return;
        }
      }

      // 6. Check permission for every new segment.
      for (const segment of segments) {
        const permissionError = await checkAttendanceWriteAccess(
          req,
          employeeId,
          parseAttendanceDate(segment.date)!
        );

        if (permissionError) {
          res.status(403).json({
            status: "error",
            message: permissionError,
          });
          return;
        }
      }

      // 7. Replace the old segments transactionally.
      const result = await prisma.$transaction(
        async (tx) => {
          // Exclude the current group when checking overlaps.
          const existingIntervals = await tx.attendanceInterval.findMany({
            where: {
              groupId: { not: groupId },
              attendance: {
                employeeId,
                date: {
                  in: segments.map(
                    (segment) => parseAttendanceDate(segment.date)!
                  ),
                },
              },
            },
          });

          const hasOverlap = segments.some((segment) =>
            existingIntervals.some(
              (existing) =>
                existing.startMinute < segment.endMinute &&
                existing.endMinute > segment.startMinute
            )
          );

          if (hasOverlap) {
            return { hasOverlap: true as const, data: [] };
          }

          // Delete all previous segments.
          await tx.attendanceInterval.deleteMany({
            where: { groupId },
          });

          // Create the new segments.
          const savedSegments = [];

          for (const segment of segments) {
            const segmentDate = parseAttendanceDate(segment.date)!;

            const attendance = await tx.attendance.upsert({
              where: {
                employeeId_date: {
                  employeeId,
                  date: segmentDate,
                },
              },
              update: {},
              create: {
                employeeId,
                date: segmentDate,
                value: "",
              },
            });

            const savedInterval = await tx.attendanceInterval.create({
              data: {
                attendanceId: attendance.id,
                groupId,
                startMinute: segment.startMinute,
                endMinute: segment.endMinute,
              },
            });

            savedSegments.push({
              ...savedInterval,
              date: segment.date,
            });
          }

          return {
            hasOverlap: false as const,
            data: savedSegments,
          };
        },
        {
          isolationLevel: "Serializable",
        }
      );

      if (result.hasOverlap) {
        res.status(409).json({
          status: "error",
          message: "This interval overlaps with existing attendance.",
        });
        return;
      }

      res.json({
        status: "success",
        message: "Attendance interval updated successfully.",
        data: result.data,
      });
    } catch (error) {
      console.error("Failed to update attendance interval:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to update attendance interval.",
      });
    }
  }
);

app.delete(
  "/api/attendance/intervals/:groupId",
  authenticateToken,
  authorizeRoles(Role.SUPER_ADMIN, Role.ATTENDANCE_OFFICER),
  async (req, res) => {
    try {
      //* 1. Validate group ID.
const groupId = req.params.groupId;

if (typeof groupId !== "string" || groupId.length === 0 || groupId.length > 100) {
  res.status(400).json({
    status: "error",
    message: "Invalid interval group ID.",
  });
  return;
}

      // 2. Find all segments belonging to this interval.
      const existingGroup = await prisma.attendanceInterval.findMany({
        where: { groupId },
        include: {
          attendance: {
            select: {
              employeeId: true,
              date: true,
            },
          },
        },
      });

      if (existingGroup.length === 0) {
        res.status(404).json({
          status: "error",
          message: "Attendance interval not found.",
        });
        return;
      }

      const employeeId = existingGroup[0].attendance.employeeId;

      if (
        existingGroup.some(
          (interval) => interval.attendance.employeeId !== employeeId
        )
      ) {
        res.status(409).json({
          status: "error",
          message: "Invalid attendance interval group.",
        });
        return;
      }

      // 3. Check permission for every affected day.
      for (const interval of existingGroup) {
        const permissionError = await checkAttendanceWriteAccess(
          req,
          employeeId,
          interval.attendance.date
        );

        if (permissionError) {
          res.status(403).json({
            status: "error",
            message: permissionError,
          });
          return;
        }
      }

      // 4. Delete all segments in one transaction.
      const result = await prisma.$transaction(async (tx) => {
        return tx.attendanceInterval.deleteMany({
          where: { groupId },
        });
      });

      res.json({
        status: "success",
        message: "Attendance interval deleted successfully.",
        deletedCount: result.count,
      });
    } catch (error) {
      console.error("Failed to delete attendance interval:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to delete attendance interval.",
      });
    }
  }
);


app.get(
  "/api/attendance-period/previous",
  authenticateToken,
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  async (req, res) => {
    try {
      const { startDate, endDate } = getPreviousAttendancePeriod();

      const period = await prisma.attendancePeriod.findUnique({
        where: {
          startDate_endDate: {
            startDate,
            endDate,
          },
        },
      });

      res.json({
        status: "success",
        period: {
          startDate,
          endDate,
          previousPeriodUnlocked: period?.previousPeriodUnlocked ?? false,
        },
      });
    } catch (error) {
      console.error("Error fetching previous attendance period:", error);
      res.status(500).json({
        message: "Failed to fetch attendance period.",
      });
    }
  }
);


app.patch(
  "/api/attendance-period/previous",
  authenticateToken,
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  async (req, res) => {
    try {
      const { unlocked } = req.body;

      if (typeof unlocked !== "boolean") {
        return res.status(400).json({
          message: "The unlocked field must be a boolean.",
        });
      }

      const { startDate, endDate } = getPreviousAttendancePeriod();

      const period = await prisma.attendancePeriod.upsert({
        where: {
          startDate_endDate: {
            startDate,
            endDate,
          },
        },
        update: {
          previousPeriodUnlocked: unlocked,
        },
        create: {
          startDate,
          endDate,
          previousPeriodUnlocked: unlocked,
        },
      });

      res.json({
        status: "success",
        message: unlocked
          ? "Previous attendance period unlocked."
          : "Previous attendance period locked.",
        period,
      });
    } catch (error) {
      console.error("Error updating attendance period:", error);
      res.status(500).json({
        message: "Failed to update attendance period.",
      });
    }
  }
);


// Start server
const PORT = Number(process.env.PORT)|| 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});