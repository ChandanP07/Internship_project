
import express from "express";
import { and, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";

import { db } from "../db/index";
import { assignments, classes, enrollments, user } from "../db/schema/index";
import { requireAuth } from "../middleware/requireAuth";
const router = express.Router();

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const canManageClass = async (authUser: any, classId: number) => {
  if (authUser.role === "admin") {
    return true;
  }

  const [ownedClass] = await db
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.teacherId, authUser.id)));

  return Boolean(ownedClass);
};

const canStudentAccessClass = async (studentId: string, classId: number) => {
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)));

  return Boolean(enrollment);
};

router.get("/", requireAuth(), async (req: any, res) => {
  try {
    const authUser = req.user;
    const { classId, status, page = 1, limit = 10 } = req.query;

    const currentPage = parsePositiveInt(page, 1);
    const limitPerPage = parsePositiveInt(limit, 10);
    const offset = (currentPage - 1) * limitPerPage;

    const filters = [];
    if (classId !== undefined) {
      const parsedClassId = Number(classId);
      if (!Number.isFinite(parsedClassId)) {
        return res.status(400).json({ error: "Invalid classId" });
      }
      filters.push(eq(assignments.classId, parsedClassId));
    }
    if (status) {
      filters.push(eq(assignments.status, String(status)));
    }

    if (authUser.role === "teacher") {
      filters.push(eq(assignments.teacherId, authUser.id));
    }

    if (authUser.role === "student") {
      const studentRows = await db
        .select({ classId: enrollments.classId })
        .from(enrollments)
        .where(eq(enrollments.studentId, authUser.id));

      const enrolledClassIds = studentRows.map((row) => row.classId);
      if (enrolledClassIds.length === 0) {
        return res.status(200).json({
          data: [],
          pagination: { page: currentPage, limit: limitPerPage, total: 0, totalPages: 0 },
        });
      }

      const [countResult] = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(assignments)
        .where(
          and(
            inArray(assignments.classId, enrolledClassIds),
            eq(assignments.status, "published"),
            ...(filters.length > 0 ? filters : [])
          )
        );

      const rows = await db
        .select({
          ...getTableColumns(assignments),
          class: { id: classes.id, name: classes.name, inviteCode: classes.inviteCode },
          teacher: { id: user.id, name: user.name, email: user.email, image: user.image },
        })
        .from(assignments)
        .leftJoin(classes, eq(assignments.classId, classes.id))
        .leftJoin(user, eq(assignments.teacherId, user.id))
        .where(
          and(
            inArray(assignments.classId, enrolledClassIds),
            eq(assignments.status, "published"),
            ...(filters.length > 0 ? filters : [])
          )
        )
        .orderBy(desc(assignments.createdAt))
        .limit(limitPerPage)
        .offset(offset);

      const total = Number(countResult?.count ?? 0);
      return res.status(200).json({
        data: rows,
        pagination: {
          page: currentPage,
          limit: limitPerPage,
          total,
          totalPages: Math.ceil(total / limitPerPage),
        },
      });
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .where(whereClause);

    const rows = await db
      .select({
        ...getTableColumns(assignments),
        class: { id: classes.id, name: classes.name, inviteCode: classes.inviteCode },
        teacher: { id: user.id, name: user.name, email: user.email, image: user.image },
      })
      .from(assignments)
      .leftJoin(classes, eq(assignments.classId, classes.id))
      .leftJoin(user, eq(assignments.teacherId, user.id))
      .where(whereClause)
      .orderBy(desc(assignments.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    const total = Number(countResult?.count ?? 0);
    return res.status(200).json({
      data: rows,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total,
        totalPages: Math.ceil(total / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /assignments error:", error);
    return res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

router.get("/:id", requireAuth(), async (req: any, res) => {
  try {
    const assignmentId = Number(req.params.id);
    if (!Number.isFinite(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment id" });
    }

    const authUser = req.user;
    const [record] = await db
      .select({
        ...getTableColumns(assignments),
        class: { id: classes.id, name: classes.name, inviteCode: classes.inviteCode, teacherId: classes.teacherId },
        teacher: { id: user.id, name: user.name, email: user.email, image: user.image },
      })
      .from(assignments)
      .leftJoin(classes, eq(assignments.classId, classes.id))
      .leftJoin(user, eq(assignments.teacherId, user.id))
      .where(eq(assignments.id, assignmentId));

    if (!record) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (authUser.role === "teacher" && record.teacherId !== authUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (authUser.role === "student") {
      const canAccess = await canStudentAccessClass(authUser.id, record.classId);
      if (!canAccess || record.status !== "published") {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    return res.status(200).json({ data: record });
  } catch (error) {
    console.error("GET /assignments/:id error:", error);
    return res.status(500).json({ error: "Failed to fetch assignment" });
  }
});

router.post("/", requireAuth(["teacher", "admin"]), async (req: any, res) => {
  try {
    const authUser = req.user;
    const {
      classId,
      title,
      description,
      dueDate,
      totalMarks,
      attachmentUrl,
      status,
    } = req.body;

    const parsedClassId = Number(classId);
    if (!Number.isFinite(parsedClassId)) {
      return res.status(400).json({ error: "classId is required" });
    }
    if (!title || !description || !dueDate) {
      return res.status(400).json({ error: "title, description and dueDate are required" });
    }

    const canManage = await canManageClass(authUser, parsedClassId);
    if (!canManage) {
      return res.status(403).json({ error: "Forbidden: Not your class" });
    }

    const [created] = await db
      .insert(assignments)
      .values({
        classId: parsedClassId,
        teacherId: authUser.id,
        title: String(title),
        description: String(description),
        dueDate: new Date(dueDate),
        totalMarks: totalMarks ? Number(totalMarks) : 100,
        attachmentUrl: attachmentUrl ? String(attachmentUrl) : null,
        status: status ? String(status) : "published",
      })
      .returning();

    return res.status(201).json({ data: created });
  } catch (error) {
    console.error("POST /assignments error:", error);
    return res.status(500).json({ error: "Failed to create assignment" });
  }
});

router.put("/:id", requireAuth(["teacher", "admin"]), async (req: any, res) => {
  try {
    const assignmentId = Number(req.params.id);
    if (!Number.isFinite(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment id" });
    }

    const authUser = req.user;
    const [existing] = await db
      .select({
        id: assignments.id,
        classId: assignments.classId,
        teacherId: assignments.teacherId,
      })
      .from(assignments)
      .where(eq(assignments.id, assignmentId));

    if (!existing) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (authUser.role === "teacher" && existing.teacherId !== authUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const {
      title,
      description,
      dueDate,
      totalMarks,
      attachmentUrl,
      status,
      classId,
    } = req.body;

    const nextClassId = classId !== undefined ? Number(classId) : existing.classId;
    if (!Number.isFinite(nextClassId)) {
      return res.status(400).json({ error: "Invalid classId" });
    }

    const canManage = await canManageClass(authUser, nextClassId);
    if (!canManage) {
      return res.status(403).json({ error: "Forbidden: Not your class" });
    }

    const [updated] = await db
      .update(assignments)
      .set({
        classId: nextClassId,
        title: title !== undefined ? String(title) : undefined,
        description: description !== undefined ? String(description) : undefined,
        dueDate: dueDate !== undefined ? new Date(dueDate) : undefined,
        totalMarks: totalMarks !== undefined ? Number(totalMarks) : undefined,
        attachmentUrl: attachmentUrl !== undefined ? (attachmentUrl ? String(attachmentUrl) : null) : undefined,
        status: status !== undefined ? String(status) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(assignments.id, assignmentId))
      .returning();

    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error("PUT /assignments/:id error:", error);
    return res.status(500).json({ error: "Failed to update assignment" });
  }
});

router.patch("/:id/status", requireAuth(["teacher", "admin"]), async (req: any, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const { status } = req.body;
    if (!Number.isFinite(assignmentId) || !status) {
      return res.status(400).json({ error: "assignment id and status are required" });
    }

    const authUser = req.user;
    const [existing] = await db
      .select({ id: assignments.id, teacherId: assignments.teacherId })
      .from(assignments)
      .where(eq(assignments.id, assignmentId));

    if (!existing) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (authUser.role === "teacher" && existing.teacherId !== authUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [updated] = await db
      .update(assignments)
      .set({ status: String(status), updatedAt: new Date() })
      .where(eq(assignments.id, assignmentId))
      .returning();

    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error("PATCH /assignments/:id/status error:", error);
    return res.status(500).json({ error: "Failed to update assignment status" });
  }
});

router.delete("/:id", requireAuth(["teacher", "admin"]), async (req: any, res) => {
  try {
    const assignmentId = Number(req.params.id);
    if (!Number.isFinite(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment id" });
    }

    const authUser = req.user;
    const [existing] = await db
      .select({ id: assignments.id, teacherId: assignments.teacherId })
      .from(assignments)
      .where(eq(assignments.id, assignmentId));

    if (!existing) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (authUser.role === "teacher" && existing.teacherId !== authUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(assignments).where(eq(assignments.id, assignmentId));
    return res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("DELETE /assignments/:id error:", error);
    return res.status(500).json({ error: "Failed to delete assignment" });
  }
});

export default router;
