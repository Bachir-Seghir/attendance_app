
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: Role;
    departmentId: number | null;
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (!token) {
    res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      status: "error",
      message: "Authentication configuration error.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      typeof decoded.id !== "number"
    ) {
      res.status(401).json({
        status: "error",
        message: "Invalid authentication token.",
      });
      return;
    }

    // Always load the latest permissions from the database.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        role: true,
        departmentId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        status: "error",
        message: "User account not found.",
      });
      return;
    }

    req.user = user;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        status: "error",
        message: "Invalid or expired authentication token.",
      });
      return;
    }

    console.error("Authentication error:", error);

    res.status(500).json({
      status: "error",
      message: "Authentication failed.",
    });
  }
}

export function authorizeRoles(...allowedRoles: Role[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      res.status(401).json({
        status: "error",
        message: "Authentication required.",
      });
      return;
    }

    // Super Admin always has full access.
    if (req.user.role === Role.SUPER_ADMIN) {
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: "error",
        message: "You don't have permission to perform this action.",
      });
      return;
    }

    next();
  };
}
