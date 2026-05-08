import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inArray } from "drizzle-orm";

import { db } from "../src/db";
import {
  account,
  classes,
  departments,
  enrollments,
  session,
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

type SeedData = {
  users: SeedUser[];
  departments: SeedDepartment[];
  subjects: SeedSubject[];
  classes: SeedClass[];
  enrollments: SeedEnrollment[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadSeedData = async (): Promise<SeedData> => {
  const dataPath = path.join(__dirname, "data.json");
  const raw = await readFile(dataPath, "utf-8");
  return JSON.parse(raw) as SeedData;
};

const ensureMapValue = <T>(map: Map<string, T>, key: string, label: string) => {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Missing ${label} for key: ${key}`);
  }
  return value;
};

const retry = async <T>(fn: () => Promise<T>, label: string, maxRetries = 5): Promise<T> => {
  let retries = maxRetries;
  while (retries > 0) {
    try {
      return await fn();
    } catch (err) {
      retries--;
      console.error(`Failed ${label}. Retries left: ${retries}`, err);
      if (retries === 0) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`Failed ${label} after ${maxRetries} retries`);
};

const seed = async () => {
  const data = await loadSeedData();

  console.log("Cleaning data...");
  await retry(() => db.delete(enrollments), "delete enrollments");
  await retry(() => db.delete(classes), "delete classes");
  await retry(() => db.delete(subjects), "delete subjects");
  await retry(() => db.delete(departments), "delete departments");
  await retry(() => db.delete(session), "delete session");
  await retry(() => db.delete(account), "delete account");
  await retry(() => db.delete(user), "delete user");

  console.log("Creating users through BetterAuth...");
  const userIdMap = new Map<string, string>(); // Original ID -> BetterAuth gen UUID

  for (const seedUser of data.users) {
    const res = await retry(async () => {
      try {
        return await auth.api.signUpEmail({
          asResponse: false,
          body: {
            email: seedUser.email,
            password: seedUser.password,
            name: seedUser.name,
            role: seedUser.role,
          },
        });
      } catch (err: any) {
        // If BetterAuth says user already exists (e.g. from a partially failed previous run)
        // we might want to fetch it, but since we delete at start, it shouldn't happen
        // unless the delete itself failed and we are retrying the whole seed.
        throw err;
      }
    }, `create user ${seedUser.email}`);

    console.log(`Created user ${seedUser.email}`);
    userIdMap.set(seedUser.id, res.user.id);

    if (seedUser.image) {
      await retry(
        () =>
          db
            .update(user)
            .set({ image: seedUser.image })
            .where(inArray(user.id, [res.user.id])),
        `update user image ${seedUser.email}`
      );
    }
  }

  console.log("Seeding departments...");
  if (data.departments.length) {
    await retry(
      () =>
        db
          .insert(departments)
          .values(
            data.departments.map((dept) => ({
              code: dept.code,
              name: dept.name,
              description: dept.description,
            }))
          )
          .onConflictDoNothing({ target: departments.code }),
      "insert departments"
    );
  }

  const departmentCodes = data.departments.map((dept) => dept.code);
  const departmentRows =
    departmentCodes.length === 0
      ? []
      : await retry(
          () =>
            db
              .select({ id: departments.id, code: departments.code })
              .from(departments)
              .where(inArray(departments.code, departmentCodes)),
          "select departments"
        );
  const departmentMap = new Map(departmentRows.map((row) => [row.code, row.id]));

  console.log("Seeding subjects...");
  if (data.subjects.length) {
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
          .onConflictDoNothing({ target: subjects.code }),
      "insert subjects"
    );
  }

  const subjectCodes = data.subjects.map((subject) => subject.code);
  const subjectRows =
    subjectCodes.length === 0
      ? []
      : await retry(
          () =>
            db
              .select({ id: subjects.id, code: subjects.code })
              .from(subjects)
              .where(inArray(subjects.code, subjectCodes)),
          "select subjects"
        );
  const subjectMap = new Map(subjectRows.map((row) => [row.code, row.id]));

  console.log("Seeding classes...");
  if (data.classes.length) {
    const classesToInsert = data.classes.map((classItem) => ({
      name: classItem.name,
      description: classItem.description,
      capacity: classItem.capacity,
      status: classItem.status,
      inviteCode: classItem.inviteCode,
      subjectId: ensureMapValue(subjectMap, classItem.subjectCode, "subject"),
      teacherId: ensureMapValue(userIdMap, classItem.teacherId, "teacherId"),
      bannerUrl: classItem.bannerUrl,
      bannerCldPubId: null,
      schedules: [],
    }));

    await retry(
      () =>
        db
          .insert(classes)
          .values(classesToInsert)
          .onConflictDoNothing({ target: classes.inviteCode }),
      "insert classes"
    );
  }

  const classInviteCodes = data.classes.map((classItem) => classItem.inviteCode);
  const classRows =
    classInviteCodes.length === 0
      ? []
      : await retry(
          () =>
            db
              .select({ id: classes.id, inviteCode: classes.inviteCode })
              .from(classes)
              .where(inArray(classes.inviteCode, classInviteCodes)),
          "select classes"
        );
  const classMap = new Map(classRows.map((row) => [row.inviteCode, row.id]));

  console.log("Seeding enrollments...");
  if (data.enrollments && data.enrollments.length) {
    const enrollmentsToInsert = data.enrollments.map((enr) => ({
      studentId: ensureMapValue(userIdMap, enr.studentId, "studentId"),
      classId: ensureMapValue(classMap, enr.classInviteCode, "classInviteCode"),
    }));

    await retry(
      () => db.insert(enrollments).values(enrollmentsToInsert),
      "insert enrollments"
    );
  }
};

seed()
  .then(() => {
    console.log("Seed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
