
import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { assignments } from "./assignment";
import { user } from "./auth";

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  submissionText: text("submission_text"),
  fileUrl: text("file_url"),
  marks: integer("marks"),
  feedback: text("feedback"),
  status: text("status").default("submitted"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  reviewedBy: text("reviewed_by").references(() => user.id),
  gradedAt: timestamp("graded_at"),
});
