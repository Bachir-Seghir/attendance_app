
import { Router } from "express";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import {
    authenticateToken,
    authorizeRoles,
} from "../middleware/auth.js";

const router = Router();

router.use(authenticateToken, authorizeRoles(Role.SUPER_ADMIN));

// GET /api/users
router.get("/", async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                departmentId: true,
                isActive: true,
                createdAt: true,
                department: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });

        res.json({ status: "success", data: users });
    } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to retrieve users.",
        });
    }
});

// POST /api/users
router.post("/", async (req, res) => {
    try {
        const { name, email, password, role, departmentId } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            password.length < 8
        ) {
            res.status(400).json({
                status: "error",
                message: "Name, valid email, and password (at least 8 characters) are required.",
            });
            return;
        }

        if (!Object.values(Role).includes(role)) {
            res.status(400).json({
                status: "error",
                message: "Invalid user role.",
            });
            return;
        }

        let assignedDepartmentId: number | null = null;

        if (role === Role.ATTENDANCE_OFFICER) {
            if (!Number.isInteger(departmentId) || departmentId <= 0) {
                res.status(400).json({
                    status: "error",
                    message: "An attendance officer must be assigned to a department.",
                });
                return;
            }

            const department = await prisma.department.findUnique({
                where: { id: departmentId },
            });

            if (!department) {
                res.status(400).json({
                    status: "error",
                    message: "Selected department does not exist.",
                });
                return;
            }

            assignedDepartmentId = departmentId;
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            res.status(409).json({
                status: "error",
                message: "An account with this email already exists.",
            });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                role,
                departmentId: assignedDepartmentId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                departmentId: true,
                isActive: true,
                createdAt: true,
            },
        });

        res.status(201).json({
            status: "success",
            message: "User created successfully.",
            data: user,
        });
    } catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to create user.",
        });
    }
});

// PATCH /api/users/:id
router.patch("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).json({
                status: "error",
                message: "Invalid user ID.",
            });
            return;
        }

        const existingUser = await prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            res.status(404).json({
                status: "error",
                message: "User not found.",
            });
            return;
        }

        const { name, email, role, departmentId } = req.body;

        if (name !== undefined && (
            typeof name !== "string" ||
            !name.trim() ||
            name.trim().length > 100
        )) {
            res.status(400).json({
                status: "error",
                message: "Name must contain between 1 and 100 characters.",
            });
            return;
        }

        if (email !== undefined && (
            typeof email !== "string" ||
            !email.trim() ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        )) {
            res.status(400).json({
                status: "error",
                message: "A valid email is required.",
            });
            return;
        }

        if (role !== undefined && !Object.values(Role).includes(role)) {
            res.status(400).json({
                status: "error",
                message: "Invalid user role.",
            });
            return;
        }

        const newRole = role ?? existingUser.role;
        let newDepartmentId: number | null =
            departmentId !== undefined
                ? departmentId
                : existingUser.departmentId;

        if (newRole === Role.ATTENDANCE_OFFICER) {
            if (!Number.isInteger(newDepartmentId) || newDepartmentId! <= 0) {
                res.status(400).json({
                    status: "error",
                    message: "An attendance officer must be assigned to a department.",
                });
                return;
            }

            const department = await prisma.department.findUnique({
                where: { id: newDepartmentId! },
            });

            if (!department) {
                res.status(400).json({
                    status: "400",
                    message: "Selected department does not exist.",
                });
                return;
            }
        } else {
            newDepartmentId = null;
        }

        const normalizedEmail =
            email !== undefined
                ? email.trim().toLowerCase()
                : existingUser.email;

        if (normalizedEmail !== existingUser.email) {
            const emailExists = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (emailExists) {
                res.status(409).json({
                    status: "error",
                    message: "This email is already used by another account.",
                });
                return;
            }
        }

        // Prevent changing the primary Super Admin account's role.
        if (
            existingUser.role === Role.SUPER_ADMIN &&
            newRole !== Role.SUPER_ADMIN
        ) {
            res.status(400).json({
                status: "error",
                message: "The Super Admin role cannot be removed from this account.",
            });
            return;
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(name !== undefined ? { name: name.trim() } : {}),
                ...(email !== undefined ? { email: normalizedEmail } : {}),
                role: newRole,
                departmentId: newDepartmentId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                departmentId: true,
                isActive: true,
                createdAt: true,
            },
        });

        res.json({
            status: "success",
            message: "User updated successfully.",
            data: user,
        });
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to update user.",
        });
    }
});

// PATCH /api/users/:id/status
router.patch("/:id/status", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { isActive } = req.body;

        if (!Number.isInteger(id) || id <= 0 || typeof isActive !== "boolean") {
            res.status(400).json({
                status: "error",
                message: "Valid user ID and isActive status are required.",
            });
            return;
        }

        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            res.status(404).json({
                status: "error",
                message: "User not found.",
            });
            return;
        }

        const currentUserId = Number(
            (req as typeof req & { user?: { id: number } }).user?.id
        );

        if (id === currentUserId && !isActive) {
            res.status(400).json({
                status: "error",
                message: "You cannot deactivate your own account.",
            });
            return;
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { isActive },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                departmentId: true,
                isActive: true,
            },
        });

        res.json({
            status: "success",
            message: isActive
                ? "User activated successfully."
                : "User deactivated successfully.",
            data: updatedUser,
        });
    } catch (error) {
        console.error("Change user status error:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to change user status.",
        });
    }
});

// PATCH /api/users/:id/password
router.patch("/:id/password", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { password } = req.body;

        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            typeof password !== "string" ||
            password.length < 8
        ) {
            res.status(400).json({
                status: "error",
                message: "Valid user ID and password (at least 8 characters) are required.",
            });
            return;
        }

        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            res.status(404).json({
                status: "error",
                message: "User not found.",
            });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });

        res.json({
            status: "success",
            message: "Password reset successfully.",
        });
    } catch (error) {
        console.error("Reset user password error:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to reset user password.",
        });
    }
});

export default router;
