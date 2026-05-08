import express from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";

import { db } from "../db/index";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

const generateClassCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Get all classes with optional search, subject, teacher filters, and pagination
router.get("/", requireAuth(), async (req: any, res) => {
  try {
    const { search, subject, teacher, page = 1, limit = 10 } = req.query;
    const authUser = req.user;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    // Role-based filtering
    if (authUser.role === "teacher") {
      // Teachers only see their own classes
      filterConditions.push(eq(classes.teacherId, authUser.id));
    } else if (authUser.role === "student") {
      // Students should only see classes where they are enrolled.
      filterConditions.push(eq(enrollments.studentId, authUser.id));
    }

    if (search) {
      filterConditions.push(
        or(
          ilike(classes.name, `%${search}%`),
          ilike(classes.classCode, `%${search}%`),
          ilike(classes.inviteCode, `%${search}%`)
        )
      );
    }

    if (subject) {
      filterConditions.push(ilike(subjects.name, `%${subject}%`));
    }

    if (teacher && authUser.role !== "teacher") {
      filterConditions.push(ilike(user.name, `%${teacher}%`));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .leftJoin(enrollments, eq(enrollments.classId, classes.id))
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const classesList = await db
      .select({
        ...getTableColumns(classes),
        subject: {
          ...getTableColumns(subjects),
        },
        teacher: {
          ...getTableColumns(user),
        },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .leftJoin(enrollments, eq(enrollments.classId, classes.id))
      .where(whereClause)
      .orderBy(desc(classes.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: classesList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /classes error:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

router.post("/", requireAuth(["admin", "teacher"]), async (req: any, res) => {
  try {
    const {
      name,
      teacherId,
      subjectId,
      capacity,
      description,
      status,
      bannerUrl,
      bannerCldPubId,
    } = req.body;
    const authUser = req.user;

    // Security: Teachers can only create classes for themselves
    const finalTeacherId = authUser.role === "teacher" ? authUser.id : teacherId;

    const classCode = generateClassCode();

    const [createdClass] = await db
      .insert(classes)
      .values({
        subjectId,
        classCode: classCode,
        inviteCode: classCode, // Syncing inviteCode for better-auth compatibility if needed
        name,
        teacherId: finalTeacherId,
        bannerCldPubId,
        bannerUrl,
        capacity: capacity ? Number(capacity) : 50,
        description,
        schedules: [],
        status: status || "active",
      })
      .returning();

    if (!createdClass) {
      throw new Error("Class creation returned no record");
    }

    res.status(201).json({ data: createdClass });
  } catch (error) {
    console.error("POST /classes error:", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});

router.put("/:id", requireAuth(["admin", "teacher"]), async (req: any, res) => {
  try {
    const classId = Number(req.params.id);
    const authUser = req.user;
    
    // Check if class exists and user has permission
    const [existingClass] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId));

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (authUser.role === "teacher" && existingClass.teacherId !== authUser.id) {
      return res.status(403).json({ error: "Forbidden: You don't own this class" });
    }

    const {
      name,
      subjectId,
      capacity,
      description,
      status,
      bannerUrl,
      bannerCldPubId,
      classCode,
    } = req.body;

    const [updatedClass] = await db
      .update(classes)
      .set({
        name,
        subjectId,
        capacity: capacity ? Number(capacity) : undefined,
        description,
        status,
        bannerUrl,
        bannerCldPubId,
        classCode,
        updatedAt: new Date(),
      })
      .where(eq(classes.id, classId))
      .returning();

    res.status(200).json({ data: updatedClass });
  } catch (error) {
    console.error("PUT /classes/:id error:", error);
    res.status(500).json({ error: "Failed to update class" });
  }
});

router.delete("/:id", requireAuth(["admin", "teacher"]), async (req: any, res) => {
  try {
    const classId = Number(req.params.id);
    const authUser = req.user;

    const [existingClass] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId));

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (authUser.role === "teacher" && existingClass.teacherId !== authUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(classes).where(eq(classes.id, classId));

    res.status(200).json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error("DELETE /classes/:id error:", error);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

// Get class details
router.get("/:id", requireAuth(), async (req, res) => {
  try {
    const classId = Number(req.params.id);
    const authUser = (req as any).user;

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    const [classDetails] = await db
      .select({
        ...getTableColumns(classes),
        subject: {
          ...getTableColumns(subjects),
        },
        department: {
          ...getTableColumns(departments),
        },
        teacher: {
          ...getTableColumns(user),
        },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(eq(classes.id, classId));

    if (!classDetails) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (authUser.role === "student") {
      const [accessEnrollment] = await db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.classId, classId),
            eq(enrollments.studentId, authUser.id)
          )
        );

      if (!accessEnrollment) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else if (
      authUser.role === "teacher" &&
      (!classDetails.teacher || classDetails.teacher.id !== authUser.id)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.status(200).json({ data: classDetails });
  } catch (error) {
    console.error("GET /classes/:id error:", error);
    res.status(500).json({ error: "Failed to fetch class details" });
  }
});

// List users in a class by role with pagination
router.get("/:id/users", requireAuth(), async (req: any, res) => {
  try {
    const classId = Number(req.params.id);
    const { role, page = 1, limit = 10 } = req.query;
    const authUser = req.user;

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: "Invalid class id" });
    }

    // Only admin or owning teacher can list class users.
    if (authUser.role === "student") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (authUser.role === "teacher") {
      const [ownedClass] = await db
        .select({ id: classes.id, teacherId: classes.teacherId })
        .from(classes)
        .where(and(eq(classes.id, classId), eq(classes.teacherId, authUser.id)));
      if (!ownedClass) return res.status(403).json({ error: "Forbidden" });
    }

    if (role !== "teacher" && role !== "student") {
      return res.status(400).json({ error: "Invalid role" });
    }

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const baseSelect = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
    };

    const countResult =
      role === "teacher"
        ? await db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(classes, eq(user.id, classes.teacherId))
            .where(and(eq(user.role, role), eq(classes.id, classId)))
        : await db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .where(and(eq(user.role, role), eq(enrollments.classId, classId)));

    const totalCount = countResult[0]?.count ?? 0;

    const usersList =
      role === "teacher"
        ? await db
            .select(baseSelect)
            .from(user)
            .leftJoin(classes, eq(user.id, classes.teacherId))
            .where(and(eq(user.role, role), eq(classes.id, classId)))
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset)
        : await db
            .select(baseSelect)
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .where(and(eq(user.role, role), eq(enrollments.classId, classId)))
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
    console.error("GET /classes/:id/users error:", error);
    res.status(500).json({ error: "Failed to fetch class users" });
  }
});

export default router;
