import express from "express";
import { and, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";

import { db } from "../db/index";
import { lectures, classes, enrollments, user } from "../db/schema/index";
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
    const { classId, page = 1, limit = 10 } = req.query;

    const currentPage = parsePositiveInt(page, 1);
    const limitPerPage = parsePositiveInt(limit, 10);
    const offset = (currentPage - 1) * limitPerPage;

    const filters = [];
    if (classId !== undefined) {
      const parsedClassId = Number(classId);
      if (!Number.isFinite(parsedClassId)) {
        return res.status(400).json({ error: "Invalid classId" });
      }
      filters.push(eq(lectures.classId, parsedClassId));
    }

    if (authUser.role === "teacher") {
      filters.push(eq(lectures.teacherId, authUser.id));
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

      filters.push(inArray(lectures.classId, enrolledClassIds));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lectures)
      .where(whereClause);

    const rows = await db
      .select({
        ...getTableColumns(lectures),
        class: { id: classes.id, name: classes.name },
        teacher: { id: user.id, name: user.name, email: user.email },
      })
      .from(lectures)
      .leftJoin(classes, eq(lectures.classId, classes.id))
      .leftJoin(user, eq(lectures.teacherId, user.id))
      .where(whereClause)
      .orderBy(desc(lectures.createdAt))
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
    console.error("GET /lectures error:", error);
    return res.status(500).json({ error: "Failed to fetch lectures" });
  }
});

router.get("/:id", requireAuth(), async (req: any, res) => {
  try {
    const lectureId = Number(req.params.id);
    if (!Number.isFinite(lectureId)) {
      return res.status(400).json({ error: "Invalid lecture id" });
    }

    const authUser = req.user;
    const [record] = await db
      .select({
        ...getTableColumns(lectures),
        class: { id: classes.id, name: classes.name },
        teacher: { id: user.id, name: user.name, email: user.email },
      })
      .from(lectures)
      .leftJoin(classes, eq(lectures.classId, classes.id))
      .leftJoin(user, eq(lectures.teacherId, user.id))
      .where(eq(lectures.id, lectureId));

    if (!record) {
      return res.status(404).json({ error: "Lecture not found" });
    }

    if (authUser.role === "teacher" && record.teacherId !== authUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (authUser.role === "student") {
      const canAccess = await canStudentAccessClass(authUser.id, record.classId);
      if (!canAccess) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    return res.status(200).json({ data: record });
  } catch (error) {
    console.error("GET /lectures/:id error:", error);
    return res.status(500).json({ error: "Failed to fetch lecture" });
  }
});

router.post("/", requireAuth(["teacher"]), async (req: any, res) => {
  try {
    const authUser = req.user;
    const {
      classId,
      title,
      description,
      videoUrl,
      thumbnailUrl,
      notesUrl,
    } = req.body;

    const parsedClassId = Number(classId);
    if (!Number.isFinite(parsedClassId) || !title || !description || !videoUrl) {
      return res.status(400).json({ error: "classId, title, description and videoUrl are required" });
    }

    const canManage = await canManageClass(authUser, parsedClassId);
    if (!canManage) {
      return res.status(403).json({ error: "Forbidden: Not your class" });
    }

    const [created] = await db
      .insert(lectures)
      .values({
        classId: parsedClassId,
        teacherId: authUser.id,
        title: String(title),
        description: String(description),
        videoUrl: String(videoUrl),
        thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : null,
        notesUrl: notesUrl ? String(notesUrl) : null,
      })
      .returning();

    return res.status(201).json({ data: created });
  } catch (error) {
    console.error("POST /lectures error:", error);
    return res.status(500).json({ error: "Failed to create lecture" });
  }
});

router.put("/:id", requireAuth(["teacher", "admin"]), async (req: any, res) => {
  try {
    const lectureId = Number(req.params.id);
    if (!Number.isFinite(lectureId)) {
      return res.status(400).json({ error: "Invalid lecture id" });
    }

    const authUser = req.user;
    const [existing] = await db
      .select({
        id: lectures.id,
        classId: lectures.classId,
        teacherId: lectures.teacherId,
      })
      .from(lectures)
      .where(eq(lectures.id, lectureId));

    if (!existing) {
      return res.status(404).json({ error: "Lecture not found" });
    }

    if (authUser.role === "teacher" && existing.teacherId !== authUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      notesUrl,
    } = req.body;

    const [updated] = await db
      .update(lectures)
      .set({
        title: title !== undefined ? String(title) : undefined,
        description: description !== undefined ? String(description) : undefined,
        videoUrl: videoUrl !== undefined ? String(videoUrl) : undefined,
        thumbnailUrl: thumbnailUrl !== undefined ? (thumbnailUrl ? String(thumbnailUrl) : null) : undefined,
        notesUrl: notesUrl !== undefined ? (notesUrl ? String(notesUrl) : null) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(lectures.id, lectureId))
      .returning();

    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error("PUT /lectures/:id error:", error);
    return res.status(500).json({ error: "Failed to update lecture" });
  }
});

router.delete("/:id", requireAuth(["teacher", "admin"]), async (req: any, res) => {
  try {
    const lectureId = Number(req.params.id);
    if (!Number.isFinite(lectureId)) {
      return res.status(400).json({ error: "Invalid lecture id" });
    }

    const authUser = req.user;
    const [existing] = await db
      .select({ id: lectures.id, teacherId: lectures.teacherId })
      .from(lectures)
      .where(eq(lectures.id, lectureId));

    if (!existing) {
      return res.status(404).json({ error: "Lecture not found" });
    }

    if (authUser.role === "teacher" && existing.teacherId !== authUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(lectures).where(eq(lectures.id, lectureId));
    return res.status(200).json({ message: "Lecture deleted successfully" });
  } catch (error) {
    console.error("DELETE /lectures/:id error:", error);
    return res.status(500).json({ error: "Failed to delete lecture" });
  }
});

export default router;