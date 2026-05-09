import express from "express";
import {
  and,
  desc,
  eq,
  getTableColumns,
  inArray,
  sql,
} from "drizzle-orm";

import { db } from "../db/index";
import {
  submissions,
  assignments,
  classes,
  enrollments,
  user,
} from "../db/schema/index";
import { requireAuth } from "../middleware/requireAuth";
import { alias } from "drizzle-orm/pg-core";

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

const canStudentAccessClass = async (
  studentId: string,
  classId: number,
) => {
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, studentId),
      ),
    );

  return Boolean(enrollment);
};

const studentUser = alias(user, "studentUser");
const reviewerUser = alias(user, "reviewerUser");

// Get student's own submissions
router.get("/my", requireAuth(["student"]), async (req: any, res) => {
  try {
    const authUser = req.user;
    const { assignmentId, page = 1, limit = 50 } = req.query;

    const currentPage = parsePositiveInt(page, 1);
    const limitPerPage = parsePositiveInt(limit, 50);
    const offset = (currentPage - 1) * limitPerPage;

    const filters = [eq(submissions.studentId, authUser.id)];

    if (assignmentId !== undefined) {
      const parsedAssignmentId = Number(assignmentId);

      if (!Number.isFinite(parsedAssignmentId)) {
        return res.status(400).json({ error: "Invalid assignmentId" });
      }

      filters.push(eq(submissions.assignmentId, parsedAssignmentId));
    }

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(and(...filters));

    const rows = await db
      .select({
        ...getTableColumns(submissions),
        assignment: {
          id: assignments.id,
          title: assignments.title,
          dueDate: assignments.dueDate,
        },
      })
      .from(submissions)
      .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(and(...filters))
      .orderBy(desc(submissions.submittedAt))
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
    console.error("GET /submissions/my error:", error);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// List submissions
router.get("/", requireAuth(), async (req: any, res) => {
  try {
    const authUser = req.user;

    const {
      assignmentId,
      studentId,
      page = 1,
      limit = 50,
    } = req.query;

    const currentPage = parsePositiveInt(page, 1);
    const limitPerPage = parsePositiveInt(limit, 50);
    const offset = (currentPage - 1) * limitPerPage;

    const filters = [];

    if (assignmentId !== undefined) {
      const parsedAssignmentId = Number(assignmentId);

      if (!Number.isFinite(parsedAssignmentId)) {
        return res.status(400).json({ error: "Invalid assignmentId" });
      }

      filters.push(eq(submissions.assignmentId, parsedAssignmentId));
    }

    if (studentId !== undefined) {
      filters.push(eq(submissions.studentId, String(studentId)));
    }

    if (authUser.role === "teacher") {
      const teacherClassIds = await db
        .select({ id: classes.id })
        .from(classes)
        .where(eq(classes.teacherId, authUser.id));

      const classIds = teacherClassIds.map((c) => c.id);

      if (classIds.length === 0) {
        return res.status(200).json({
          data: [],
          pagination: {
            page: currentPage,
            limit: limitPerPage,
            total: 0,
            totalPages: 0,
          },
        });
      }

      const assignmentIds = await db
        .select({ id: assignments.id })
        .from(assignments)
        .where(inArray(assignments.classId, classIds));

      const assIds = assignmentIds.map((a) => a.id);

      filters.push(inArray(submissions.assignmentId, assIds));
    }

    if (authUser.role === "student") {
      filters.push(eq(submissions.studentId, authUser.id));
    }

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(filters.length > 0 ? and(...filters) : undefined);

    const rows = await db
      .select({
        ...getTableColumns(submissions),

        assignment: {
          id: assignments.id,
          title: assignments.title,
          dueDate: assignments.dueDate,
          classId: assignments.classId,
        },

        student: {
          id: studentUser.id,
          name: studentUser.name,
          email: studentUser.email,
        },

        reviewer: {
          id: reviewerUser.id,
          name: reviewerUser.name,
        },
      })
      .from(submissions)
      .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .leftJoin(studentUser, eq(submissions.studentId, studentUser.id))
      .leftJoin(reviewerUser, eq(submissions.reviewedBy, reviewerUser.id))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(submissions.submittedAt))
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
    console.error("GET /submissions error:", error);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// Get single submission
router.get("/:id", requireAuth(), async (req: any, res) => {
  try {
    const submissionId = Number(req.params.id);

    if (!Number.isFinite(submissionId)) {
      return res.status(400).json({ error: "Invalid submission id" });
    }

    const authUser = req.user;

    const [record] = await db
      .select({
        ...getTableColumns(submissions),

        assignment: {
          id: assignments.id,
          title: assignments.title,
          dueDate: assignments.dueDate,
          classId: assignments.classId,
        },

        student: {
          id: studentUser.id,
          name: studentUser.name,
          email: studentUser.email,
        },

        reviewer: {
          id: reviewerUser.id,
          name: reviewerUser.name,
        },
      })
      .from(submissions)
      .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .leftJoin(studentUser, eq(submissions.studentId, studentUser.id))
      .leftJoin(reviewerUser, eq(submissions.reviewedBy, reviewerUser.id))
      .where(eq(submissions.id, submissionId));

    if (!record) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (authUser.role === "student" && record.studentId !== authUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (authUser.role === "teacher") {
      if (!record.assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      const canManage = await canManageClass(
        authUser,
        record.assignment.classId,
      );

      if (!canManage) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    return res.status(200).json({ data: record });
  } catch (error) {
    console.error("GET /submissions/:id error:", error);
    return res.status(500).json({ error: "Failed to fetch submission" });
  }
});

// Create submission
router.post("/", requireAuth(["student"]), async (req: any, res) => {
  try {
    const authUser = req.user;
    const { assignmentId, submissionText, fileUrl } = req.body;

    const parsedAssignmentId = Number(assignmentId);

    if (!Number.isFinite(parsedAssignmentId)) {
      return res.status(400).json({ error: "assignmentId is required" });
    }

    const [assignment] = await db
      .select({
        id: assignments.id,
        classId: assignments.classId,
        dueDate: assignments.dueDate,
        status: assignments.status,
      })
      .from(assignments)
      .where(eq(assignments.id, parsedAssignmentId));

    if (!assignment || assignment.status !== "published") {
      return res
        .status(404)
        .json({ error: "Assignment not found or not published" });
    }

    const canAccess = await canStudentAccessClass(
      authUser.id,
      assignment.classId,
    );

    if (!canAccess) {
      return res.status(403).json({ error: "Not enrolled in this class" });
    }

    const [existing] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, parsedAssignmentId),
          eq(submissions.studentId, authUser.id),
        ),
      );

    if (existing) {
      return res.status(409).json({ error: "Already submitted" });
    }

    const now = new Date();
    const status = now > assignment.dueDate ? "late" : "submitted";

    const [created] = await db
      .insert(submissions)
      .values({
        assignmentId: parsedAssignmentId,
        studentId: authUser.id,
        submissionText: submissionText ? String(submissionText) : null,
        fileUrl: fileUrl ? String(fileUrl) : null,
        status,
      })
      .returning();

    return res.status(201).json({ data: created });
  } catch (error) {
    console.error("POST /submissions error:", error);
    return res.status(500).json({ error: "Failed to create submission" });
  }
});

// Update submission
router.patch(
  "/:id",
  requireAuth(["teacher", "admin"]),
  async (req: any, res) => {
    try {
      const submissionId = Number(req.params.id);

      if (!Number.isFinite(submissionId)) {
        return res.status(400).json({ error: "Invalid submission id" });
      }

      const authUser = req.user;
      const { marks, feedback, status } = req.body;

      const [existing] = await db
        .select({
          id: submissions.id,
          assignmentId: submissions.assignmentId,
        })
        .from(submissions)
        .where(eq(submissions.id, submissionId));

      if (!existing) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const [assignment] = await db
        .select({ classId: assignments.classId })
        .from(assignments)
        .where(eq(assignments.id, existing.assignmentId));

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      const canManage = await canManageClass(authUser, assignment.classId);

      if (!canManage) {
        return res.status(403).json({ error: "Forbidden: Not your class" });
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (marks !== undefined) {
        updateData.marks = Number(marks);
      }

      if (feedback !== undefined) {
        updateData.feedback = String(feedback);
      }

      if (status !== undefined) {
        updateData.status = String(status);

        if (status === "graded") {
          updateData.reviewedBy = authUser.id;
          updateData.gradedAt = new Date();
        }
      }

      const [updated] = await db
        .update(submissions)
        .set(updateData)
        .where(eq(submissions.id, submissionId))
        .returning();

      return res.status(200).json({ data: updated });
    } catch (error) {
      console.error("PATCH /submissions/:id error:", error);
      return res.status(500).json({ error: "Failed to update submission" });
    }
  },
);

// Delete submission
router.delete("/:id", requireAuth(), async (req: any, res) => {
  try {
    const submissionId = Number(req.params.id);

    if (!Number.isFinite(submissionId)) {
      return res.status(400).json({ error: "Invalid submission id" });
    }

    const authUser = req.user;

    const [existing] = await db
      .select({
        id: submissions.id,
        studentId: submissions.studentId,
        status: submissions.status,
        assignmentId: submissions.assignmentId,
      })
      .from(submissions)
      .where(eq(submissions.id, submissionId));

    if (!existing) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (authUser.role === "student") {
      if (existing.studentId !== authUser.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (existing.status === "graded") {
        return res
          .status(403)
          .json({ error: "Cannot delete graded submission" });
      }
    } else if (
      authUser.role === "teacher" ||
      authUser.role === "admin"
    ) {
      const [assignment] = await db
        .select({ classId: assignments.classId })
        .from(assignments)
        .where(eq(assignments.id, existing.assignmentId));

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      const canManage = await canManageClass(authUser, assignment.classId);

      if (!canManage) {
        return res.status(403).json({
          error: "Forbidden: Not your class",
        });
      }
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(submissions).where(eq(submissions.id, submissionId));

    return res.status(200).json({
      message: "Submission deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /submissions/:id error:", error);
    return res.status(500).json({ error: "Failed to delete submission" });
  }
});

export default router;