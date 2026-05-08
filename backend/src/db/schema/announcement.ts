
import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

import { classes } from "./app";
import { user } from "./auth";

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
