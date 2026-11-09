import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        status: "error",
        message: "Email and password are required.",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({
        status: "error",
        message: "Invalid email or password.",
      });
      return;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const token = jwt.sign(
      {
  id: user.id,
},
      secret,
      { expiresIn: "8h" }
    );

    res.json({
      status: "success",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      status: "error",
      message: "Login failed.",
    });
  }
});

router.get("/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
      },
    });

    if (!user) {
      res.status(401).json({
        status: "error",
        message: "User not found.",
      });
      return;
    }

    res.json({
      status: "success",
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to retrieve user.",
    });
  }
});

export default router;