import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inArray } from "drizzle-orm";

import { db } from "../src/db";

import {
  account,
  announcements,
  assignments,
  classes,
  departments,
  enrollments,
  lectures,
  session,
  submissions,
  subjects,
  user,
} from "../src/db/schema";

import { auth } from "../src/lib/auth";

type SeedUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  password: string;
  image: string;
};

type SeedDepartment = {
  code: string;
  name: string;
  description: string;
};

type SeedSubject = {
  code: string;
  name: string;
  description: string;
  departmentCode: string;
};

type SeedClass = {
  name: string;
  description: string;
  capacity: number;
  status: "active" | "inactive" | "archived";
  inviteCode: string;
  subjectCode: string;
  teacherId: string;
  bannerUrl: string;
};

type SeedEnrollment = {
  classInviteCode: string;
  studentId: string;
};

type SeedAnnouncement = {
  classInviteCode: string;
  title: string;
  content: string;
  isPinned?: boolean;
};

type SeedAssignment = {
  classInviteCode: string;
  title: string;
  description: string;
  totalMarks: number;
  dueDaysFromNow: number;
  status: "draft" | "published" | "closed";
};

type SeedLecture = {
  classInviteCode: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  notesUrl?: string;
};

type SeedSubmission = {
  assignmentTitle: string;
  studentId: string;
  submissionText: string;
  marks?: number;
  feedback?: string;
  status: "submitted" | "graded" | "late";
};

type SeedData = {
  users: SeedUser[];
  departments: SeedDepartment[];
  subjects: SeedSubject[];
  classes: SeedClass[];
  enrollments: SeedEnrollment[];

  announcements: SeedAnnouncement[];
  assignments: SeedAssignment[];
  lectures: SeedLecture[];
  submissions: SeedSubmission[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadSeedData = async (): Promise<SeedData> => {
  const dataPath = path.join(__dirname, "data.json");
  const raw = await readFile(dataPath, "utf-8");

  return JSON.parse(raw) as SeedData;
};

const ensureMapValue = <T>(
  map: Map<string, T>,
  key: string,
  label: string
) => {
  const value = map.get(key);

  if (!value) {
    throw new Error(`Missing ${label} for key: ${key}`);
  }

  return value;
};

const retry = async <T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 5
): Promise<T> => {
  let retries = maxRetries;

  while (retries > 0) {
    try {
      return await fn();
    } catch (err) {
      retries--;

      console.error(
        `Failed ${label}. Retries left: ${retries}`,
        err
      );

      if (retries === 0) throw err;

      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );
    }
  }

  throw new Error(`Failed ${label}`);
};

const seed = async () => {
  const data = await loadSeedData();

  console.log("Cleaning data...");

  await retry(() => db.delete(submissions), "delete submissions");
  await retry(() => db.delete(assignments), "delete assignments");
  await retry(() => db.delete(announcements), "delete announcements");
  await retry(() => db.delete(lectures), "delete lectures");

  await retry(() => db.delete(enrollments), "delete enrollments");
  await retry(() => db.delete(classes), "delete classes");
  await retry(() => db.delete(subjects), "delete subjects");
  await retry(() => db.delete(departments), "delete departments");

  await retry(() => db.delete(session), "delete session");
  await retry(() => db.delete(account), "delete account");
  await retry(() => db.delete(user), "delete user");

  console.log("Creating users through BetterAuth...");

  const userIdMap = new Map<string, string>();

  for (const seedUser of data.users) {
    const res = await retry(
      async () =>
        await auth.api.signUpEmail({
          asResponse: false,
          body: {
            email: seedUser.email,
            password: seedUser.password,
            name: seedUser.name,
            role: seedUser.role,
          },
        }),
      `create user ${seedUser.email}`
    );

    userIdMap.set(seedUser.id, res.user.id);

    if (seedUser.image) {
      await retry(
        () =>
          db
            .update(user)
            .set({ image: seedUser.image })
            .where(inArray(user.id, [res.user.id])),
        `update image ${seedUser.email}`
      );
    }
  }

  console.log("Seeding departments...");

  await retry(
    () =>
      db
        .insert(departments)
        .values(data.departments)
        .onConflictDoNothing({
          target: departments.code,
        }),
    "insert departments"
  );

  const departmentRows = await retry(
    () =>
      db
        .select({
          id: departments.id,
          code: departments.code,
        })
        .from(departments),
    "select departments"
  );

  const departmentMap = new Map(
    departmentRows.map((row) => [row.code, row.id])
  );

  console.log("Seeding subjects...");

  const subjectsToInsert = data.subjects.map((subject) => ({
    code: subject.code,
    name: subject.name,
    description: subject.description,

    departmentId: ensureMapValue(
      departmentMap,
      subject.departmentCode,
      "department"
    ),
  }));

  await retry(
    () =>
      db
        .insert(subjects)
        .values(subjectsToInsert)
        .onConflictDoNothing({
          target: subjects.code,
        }),
    "insert subjects"
  );

  const subjectRows = await retry(
    () =>
      db
        .select({
          id: subjects.id,
          code: subjects.code,
        })
        .from(subjects),
    "select subjects"
  );

  const subjectMap = new Map(
    subjectRows.map((row) => [row.code, row.id])
  );

  console.log("Seeding classes...");

  const classesToInsert = data.classes.map((classItem) => ({
    name: classItem.name,
    description: classItem.description,
    capacity: classItem.capacity,
    status: classItem.status,
    inviteCode: classItem.inviteCode,

    subjectId: ensureMapValue(
      subjectMap,
      classItem.subjectCode,
      "subject"
    ),

    teacherId: ensureMapValue(
      userIdMap,
      classItem.teacherId,
      "teacherId"
    ),

    bannerUrl: classItem.bannerUrl,
    bannerCldPubId: null,
    schedules: [],
  }));

  await retry(
    () =>
      db
        .insert(classes)
        .values(classesToInsert)
        .onConflictDoNothing({
          target: classes.inviteCode,
        }),
    "insert classes"
  );

  const classRows = await retry(
    () =>
      db
        .select({
          id: classes.id,
          inviteCode: classes.inviteCode,
        })
        .from(classes),
    "select classes"
  );

  const classMap = new Map(
    classRows.map((row) => [row.inviteCode, row.id])
  );

  console.log("Seeding enrollments...");

  const enrollmentsToInsert = data.enrollments.map((enrollment) => ({
    studentId: ensureMapValue(
      userIdMap,
      enrollment.studentId,
      "studentId"
    ),

    classId: ensureMapValue(
      classMap,
      enrollment.classInviteCode,
      "classInviteCode"
    ),
  }));

  await retry(
    () => db.insert(enrollments).values(enrollmentsToInsert),
    "insert enrollments"
  );

  console.log("Seeding announcements...");

  const announcementsToInsert = data.announcements.map(
    (announcement) => {
      const originalClass = data.classes.find(
        (c) =>
          c.inviteCode === announcement.classInviteCode
      );

      if (!originalClass) {
        throw new Error(
          `Missing class ${announcement.classInviteCode}`
        );
      }

      return {
        classId: ensureMapValue(
          classMap,
          announcement.classInviteCode,
          "classInviteCode"
        ),

        teacherId: ensureMapValue(
          userIdMap,
          originalClass.teacherId,
          "teacherId"
        ),

        title: announcement.title,
        content: announcement.content,
        isPinned: announcement.isPinned ?? false,
      };
    }
  );

  await retry(
    () =>
      db.insert(announcements).values(announcementsToInsert),
    "insert announcements"
  );

  console.log("Seeding assignments...");

  const insertedAssignments: any[] = [];

  for (const assignment of data.assignments) {
    const originalClass = data.classes.find(
      (c) =>
        c.inviteCode === assignment.classInviteCode
    );

    if (!originalClass) {
      throw new Error(
        `Missing class ${assignment.classInviteCode}`
      );
    }

    const inserted = await retry(
      () =>
        db
          .insert(assignments)
          .values({
            classId: ensureMapValue(
              classMap,
              assignment.classInviteCode,
              "classInviteCode"
            ),

            teacherId: ensureMapValue(
              userIdMap,
              originalClass.teacherId,
              "teacherId"
            ),

            title: assignment.title,
            description: assignment.description,
            totalMarks: assignment.totalMarks,

            dueDate: new Date(
              Date.now() +
                assignment.dueDaysFromNow *
                  24 *
                  60 *
                  60 *
                  1000
            ),

            status: assignment.status,
          })
          .returning(),
      `insert assignment ${assignment.title}`
    );

    insertedAssignments.push(inserted[0]);
  }

  console.log("Seeding lectures...");

  const lecturesToInsert = data.lectures.map((lecture) => {
    const originalClass = data.classes.find(
      (c) =>
        c.inviteCode === lecture.classInviteCode
    );

    if (!originalClass) {
      throw new Error(
        `Missing class ${lecture.classInviteCode}`
      );
    }

    return {
      classId: ensureMapValue(
        classMap,
        lecture.classInviteCode,
        "classInviteCode"
      ),

      teacherId: ensureMapValue(
        userIdMap,
        originalClass.teacherId,
        "teacherId"
      ),

      title: lecture.title,
      description: lecture.description,
      videoUrl: lecture.videoUrl,

      thumbnailUrl:
        lecture.thumbnailUrl ?? null,

      notesUrl:
        lecture.notesUrl ?? null,
    };
  });

  await retry(
    () => db.insert(lectures).values(lecturesToInsert),
    "insert lectures"
  );

  console.log("Seeding submissions...");

  const assignmentMap = new Map(
    insertedAssignments.map((a) => [a.title, a.id])
  );

  const submissionsToInsert = data.submissions.map(
    (submission) => ({
      assignmentId: ensureMapValue(
        assignmentMap,
        submission.assignmentTitle,
        "assignmentTitle"
      ),

      studentId: ensureMapValue(
        userIdMap,
        submission.studentId,
        "studentId"
      ),

      submissionText: submission.submissionText,

      marks: submission.marks ?? null,

      feedback: submission.feedback ?? null,

      status: submission.status,
    })
  );

  await retry(
    () => db.insert(submissions).values(submissionsToInsert),
    "insert submissions"
  );

  console.log("Seed completed successfully!");
};

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });

