import express from "express";
import { and, desc, eq, getTableColumns, or } from "drizzle-orm";

import { db } from "../db/index";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

const getEnrollmentDetails = async (enrollmentId: number) => {
  const [enrollment] = await db
    .select({
      ...getTableColumns(enrollments),
      class: {
        ...getTableColumns(classes),
      },
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
    .from(enrollments)
    .leftJoin(classes, eq(enrollments.classId, classes.id))
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .leftJoin(user, eq(classes.teacherId, user.id))
    .where(eq(enrollments.id, enrollmentId));

  return enrollment;
};

// Get enrollments (filtered by role)
router.get("/", requireAuth(), async (req: any, res) => {
  try {
    const authUser = req.user;

    let query = db
      .select({
        ...getTableColumns(enrollments),
        class: getTableColumns(classes),
        subject: getTableColumns(subjects),
        student: { id: user.id, name: user.name, email: user.email, image: user.image },
      })
      .from(enrollments)
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(enrollments.studentId, user.id));

    if (authUser.role === "student") {
      query = query.where(eq(enrollments.studentId, authUser.id)) as any;
    } else if (authUser.role === "teacher") {
      query = query.where(eq(classes.teacherId, authUser.id)) as any;
    }

    const results = await query.orderBy(desc(enrollments.createdAt));

    res.status(200).json({ data: results });
  } catch (error) {
    console.error("GET /enrollments error:", error);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
});

// Get pending enrollments for a teacher
router.get("/pending", requireAuth(["teacher", "admin"]), async (req: any, res) => {
  try {
    const authUser = req.user;

    const query = db
      .select({
        ...getTableColumns(enrollments),
        class: getTableColumns(classes),
        student: { id: user.id, name: user.name, email: user.email, image: user.image },
      })
      .from(enrollments)
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .where(
        and(
          eq(enrollments.status, "pending"),
          authUser.role === "teacher" ? eq(classes.teacherId, authUser.id) : undefined
        )
      );

    const results = await query.orderBy(desc(enrollments.createdAt));
    res.status(200).json({ data: results });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pending enrollments" });
  }
});

// Join class by classCode (Student)
router.post("/join", requireAuth(["student"]), async (req: any, res) => {
  try {
    const { classCode } = req.body;
    const authUser = req.user;

    if (!classCode) return res.status(400).json({ error: "classCode is required" });

    const [classRecord] = await db
      .select()
      .from(classes)
      .where(or(eq(classes.classCode, classCode), eq(classes.inviteCode, classCode)));

    if (!classRecord) return res.status(404).json({ error: "Class not found" });

    const [existingEnrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, classRecord.id),
          eq(enrollments.studentId, authUser.id)
        )
      );

    if (existingEnrollment)
      return res.status(409).json({ error: "Already enrolled or request pending" });

    const [createdEnrollment] = await db
      .insert(enrollments)
      .values({
        classId: classRecord.id,
        studentId: authUser.id,
        status: "pending",
      })
      .returning({ id: enrollments.id });

    res.status(201).json({ message: "Join request sent", data: createdEnrollment });
  } catch (error) {
    console.error("POST /enrollments/join error:", error);
    res.status(500).json({ error: "Failed to join class" });
  }
});

// Approve/Reject enrollment — supports both PATCH and PUT for client compatibility
const handleEnrollmentAction = async (req: any, res: any) => {
  try {
    const enrollmentId = Number(req.params.id);
    const { action } = req.body; // "approve" | "reject"
    const authUser = req.user;

    const [enrollment] = await db
      .select({
        id: enrollments.id,
        teacherId: classes.teacherId,
      })
      .from(enrollments)
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .where(eq(enrollments.id, enrollmentId));

    if (!enrollment) return res.status(404).json({ error: "Enrollment not found" });

    if (authUser.role === "teacher" && enrollment.teacherId !== authUser.id) {
      return res.status(403).json({ error: "Forbidden: Not your class" });
    }

    if (action === "approve") {
      await db
        .update(enrollments)
        .set({ status: "approved" })
        .where(eq(enrollments.id, enrollmentId));
    } else if (action === "reject") {
      await db.delete(enrollments).where(eq(enrollments.id, enrollmentId));
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    res.status(200).json({ message: `Enrollment ${action}d successfully` });
  } catch (error) {
    res.status(500).json({ error: "Failed to process enrollment" });
  }
};

router.patch("/:id", requireAuth(["teacher", "admin"]), handleEnrollmentAction);
router.put("/:id", requireAuth(["teacher", "admin"]), handleEnrollmentAction);

// Delete enrollment (leave class or remove student)
router.delete("/:id", requireAuth(), async (req: any, res) => {
  try {
    const enrollmentId = Number(req.params.id);
    const authUser = req.user;

    const [enrollment] = await db
      .select({ studentId: enrollments.studentId, teacherId: classes.teacherId })
      .from(enrollments)
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .where(eq(enrollments.id, enrollmentId));

    if (!enrollment) return res.status(404).json({ error: "Enrollment not found" });

    const isOwner = authUser.role === "student" && enrollment.studentId === authUser.id;
    const isTeacherOfClass =
      authUser.role === "teacher" && enrollment.teacherId === authUser.id;
    const isAdmin = authUser.role === "admin";

    if (!isOwner && !isTeacherOfClass && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(enrollments).where(eq(enrollments.id, enrollmentId));

    res.status(200).json({ message: "Unenrolled successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to unenroll" });
  }
});

export default router;