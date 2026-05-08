
import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { classes } from "./app";
import { user } from "./auth";

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  attachmentUrl: text("attachment_url"),
  totalMarks: integer("total_marks").default(100),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").default("published"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
