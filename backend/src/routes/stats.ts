import express from "express";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../db/index";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

// Overview counts for core entities
router.get("/overview", requireAuth(), async (req: any, res) => {
  try {
    const authUser = req.user;
    console.log(`[Stats/Overview] Role: ${authUser.role}, UserID: ${authUser.id}`);

    if (authUser.role === "admin") {
      const [
        usersCount,
        teachersCount,
        adminsCount,
        subjectsCount,
        departmentsCount,
        classesCount,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(user),
        db.select({ count: sql<number>`count(*)` }).from(user).where(eq(user.role, "teacher")),
        db.select({ count: sql<number>`count(*)` }).from(user).where(eq(user.role, "admin")),
        db.select({ count: sql<number>`count(*)` }).from(subjects),
        db.select({ count: sql<number>`count(*)` }).from(departments),
        db.select({ count: sql<number>`count(*)` }).from(classes),
      ]);

      return res.status(200).json({
        data: {
          users: Number(usersCount[0]?.count ?? 0),
          teachers: Number(teachersCount[0]?.count ?? 0),
          admins: Number(adminsCount[0]?.count ?? 0),
          subjects: Number(subjectsCount[0]?.count ?? 0),
          departments: Number(departmentsCount[0]?.count ?? 0),
          classes: Number(classesCount[0]?.count ?? 0),
        },
      });
    }

    if (authUser.role === "teacher") {
      const [classesCount, studentsCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(classes).where(eq(classes.teacherId, authUser.id)),
        db.select({ count: sql<number>`count(distinct ${enrollments.studentId})` })
          .from(enrollments)
          .leftJoin(classes, eq(enrollments.classId, classes.id))
          .where(eq(classes.teacherId, authUser.id)),
      ]);

      return res.status(200).json({
        data: {
          myClasses: Number(classesCount[0]?.count ?? 0),
          totalStudents: Number(studentsCount[0]?.count ?? 0),
        },
      });
    }

    if (authUser.role === "student") {
      const [enrolledCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(enrollments)
        .where(eq(enrollments.studentId, authUser.id));

      return res.status(200).json({
        data: {
          enrolledClasses: Number(enrolledCount?.count ?? 0),
        },
      });
    }

    res.status(200).json({ data: {} });
  } catch (error) {
    console.error("GET /stats/overview error:", error);
    res.status(500).json({ error: "Failed to fetch overview stats" });
  }
});

// Latest activity summaries
router.get("/latest", requireAuth(), async (req: any, res) => {
  try {
    const { limit = 5 } = req.query;
    const limitPerPage = parsePositiveInt(limit, 5);
    const authUser = req.user;

    if (authUser.role === "admin") {
      const [latestClasses, latestTeachers] = await Promise.all([
        db.select({
          id: classes.id,
          name: classes.name,
          inviteCode: classes.inviteCode,
          bannerUrl: classes.bannerUrl,
          createdAt: classes.createdAt,
          subject: {
            id: subjects.id,
            name: subjects.name,
            code: subjects.code,
          },
          teacher: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          },
        })
          .from(classes)
          .leftJoin(subjects, eq(classes.subjectId, subjects.id))
          .leftJoin(user, eq(classes.teacherId, user.id))
          .orderBy(desc(classes.createdAt))
          .limit(limitPerPage),
        db.select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          createdAt: user.createdAt,
        }).from(user).where(eq(user.role, "teacher")).orderBy(desc(user.createdAt)).limit(limitPerPage),
      ]);
      return res.status(200).json({ data: { latestClasses, latestTeachers } });
    }

    if (authUser.role === "teacher") {
      const myLatestClasses = await db
        .select({
          id: classes.id,
          name: classes.name,
          inviteCode: classes.inviteCode,
          bannerUrl: classes.bannerUrl,
          createdAt: classes.createdAt,
          subject: {
            id: subjects.id,
            name: subjects.name,
            code: subjects.code,
          },
        })
        .from(classes)
        .leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .where(eq(classes.teacherId, authUser.id))
        .orderBy(desc(classes.createdAt))
        .limit(limitPerPage);
      return res.status(200).json({ data: { myLatestClasses } });
    }

    if (authUser.role === "student") {
      const myEnrollments = await db
        .select({
          id: enrollments.id,
          createdAt: enrollments.createdAt,
          class: {
            id: classes.id,
            name: classes.name,
            inviteCode: classes.inviteCode,
            bannerUrl: classes.bannerUrl,
          },
          subject: {
            id: subjects.id,
            name: subjects.name,
            code: subjects.code,
          },
          teacher: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          },
        })
        .from(enrollments)
        .leftJoin(classes, eq(enrollments.classId, classes.id))
        .leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .leftJoin(user, eq(classes.teacherId, user.id))
        .where(eq(enrollments.studentId, authUser.id))
        .orderBy(desc(enrollments.createdAt))
        .limit(limitPerPage);
      return res.status(200).json({ data: { myEnrollments } });
    }

    res.status(200).json({ data: {} });
  } catch (error) {
    console.error("GET /stats/latest error:", error);
    res.status(500).json({ error: "Failed to fetch latest stats" });
  }
});

// Aggregates for charts
router.get("/charts", requireAuth(["admin", "teacher"]), async (req, res) => {
  try {
    const [usersByRole, subjectsByDepartment, classesBySubject] =
      await Promise.all([
        db.select({ role: user.role, total: sql<number>`count(*)` }).from(user).groupBy(user.role),
        db.select({ departmentId: departments.id, departmentName: departments.name, totalSubjects: sql<number>`count(${subjects.id})` })
          .from(departments)
          .leftJoin(subjects, eq(subjects.departmentId, departments.id))
          .groupBy(departments.id, departments.name),
        db.select({ subjectId: subjects.id, subjectName: subjects.name, totalClasses: sql<number>`count(${classes.id})` })
          .from(subjects)
          .leftJoin(classes, eq(classes.subjectId, subjects.id))
          .groupBy(subjects.id, subjects.name),
      ]);

    res.status(200).json({
      data: {
        usersByRole,
        subjectsByDepartment,
        classesBySubject,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch chart stats" });
  }
});

export default router;
