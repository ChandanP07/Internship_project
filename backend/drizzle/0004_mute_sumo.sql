CREATE TABLE "lectures" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"teacher_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"notes_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "graded_at" timestamp;--> statement-breakpoint
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;