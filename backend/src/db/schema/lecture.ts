import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { classes } from "./app";
import { user } from "./auth";

export const lectures = pgTable("lectures", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  notesUrl: text("notes_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});