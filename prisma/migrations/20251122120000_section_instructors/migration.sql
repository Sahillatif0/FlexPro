ALTER TABLE "courses"
    DROP COLUMN IF EXISTS "instructorId";

ALTER TABLE "course_sections"
    ADD COLUMN "instructorId" TEXT,
    ADD CONSTRAINT "course_sections_instructorId_fkey"
        FOREIGN KEY ("instructorId")
        REFERENCES "users"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
