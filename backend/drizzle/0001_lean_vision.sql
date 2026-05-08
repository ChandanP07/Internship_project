DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'enrollment_status' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE "public"."enrollment_status" AS ENUM('pending', 'approved', 'rejected');
    END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "classes"
    ADD COLUMN IF NOT EXISTS "class_code" varchar(10);
--> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'classes_class_code_unique'
    ) THEN
        ALTER TABLE "classes"
            ADD CONSTRAINT "classes_class_code_unique" UNIQUE("class_code");
    END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "enrollments"
    ADD COLUMN IF NOT EXISTS "status" "enrollment_status" DEFAULT 'pending';
--> statement-breakpoint

UPDATE "enrollments"
SET "status" = 'pending'
WHERE "status" IS NULL;
--> statement-breakpoint

ALTER TABLE "enrollments"
    ALTER COLUMN "status" SET DEFAULT 'pending';
--> statement-breakpoint

ALTER TABLE "enrollments"
    ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'enrollments_student_class_unique'
    ) THEN
        ALTER TABLE "enrollments"
            ADD CONSTRAINT "enrollments_student_class_unique" UNIQUE("student_id", "class_id");
    END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "classes_class_code_idx"
    ON "classes" USING btree ("class_code");
--> statement-breakpoint

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'classes'
          AND column_name = 'class_code'
          AND is_nullable = 'YES'
    ) AND NOT EXISTS (
        SELECT 1
        FROM "classes"
        WHERE "class_code" IS NULL
    ) THEN
        ALTER TABLE "classes"
            ALTER COLUMN "class_code" SET NOT NULL;
    END IF;
END $$;
