ALTER TABLE "tutor" DROP CONSTRAINT "tutor_last_name_not_blank_check";--> statement-breakpoint
ALTER TABLE "tutor" ALTER COLUMN "last_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tutor" ADD CONSTRAINT "tutor_last_name_not_blank_check" CHECK ("tutor"."last_name" IS NULL OR length(trim("tutor"."last_name")) > 0);