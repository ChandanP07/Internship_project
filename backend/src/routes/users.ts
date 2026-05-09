import express from "express";
import { and, desc, eq, ilike, or, sql, getTableColumns } from "drizzle-orm";

import { db } from "../db/index";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

// Get current user
router.get("/me", requireAuth(), async (req: any, res) => {
  try {
    const authUser = req.user;
    const [userRecord] = await db.select().from(user).where(eq(user.id, authUser.id));
    res.status(200).json({ data: userRecord });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Get all users (Admin and Teacher)
router.get("/", requireAuth(["admin", "teacher"]), async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(
        or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
      );
    }

    if (role) {
      filterConditions.push(eq(user.role, role as any));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const usersList = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: usersList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user details (Admin or Self)
router.get("/:id", requireAuth(), async (req: any, res) => {
  try {
    const userId = req.params.id;
    const authUser = req.user;

    if (authUser.role !== "admin" && authUser.role !== "teacher" && authUser.id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [userRecord] = await db.select().from(user).where(eq(user.id, userId));
    if (!userRecord) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ data: userRecord });
  } catch (error) {
    console.error("GET /users/:id error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update user (Admin or Self)
router.put("/:id", requireAuth(), async (req: any, res) => {
  try {
    const userId = req.params.id;
    const authUser = req.user;

    if (authUser.role !== "admin" && authUser.id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { name, image, role, imageCldPubId } = req.body;

    // Security: Only admins can change roles
    const updateData: any = { name, image, imageCldPubId, updatedAt: new Date() };
    if (authUser.role === "admin" && role) {
      updateData.role = role;
    }

    const [updatedUser] = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, userId))
      .returning();

    res.status(200).json({ data: updatedUser });
  } catch (error) {
    console.error("PUT /users/:id error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user (Admin only)
router.delete("/:id", requireAuth(["admin"]), async (req, res) => {
  try {
    const userId = req.params.id;
    if (typeof userId !== "string" || userId.length === 0) {
      return res.status(400).json({ error: "User id is required" });
    }

    await db.delete(user).where(eq(user.id, userId));
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
