CREATE TYPE "public"."schedule_modality" AS ENUM('IN_PERSON', 'VIRTUAL');--> statement-breakpoint
ALTER TABLE "schedule_assignment" DROP CONSTRAINT "schedule_assignment_modality_not_blank_check";--> statement-breakpoint
ALTER TABLE "schedule_assignment" ALTER COLUMN "modality" SET DEFAULT 'IN_PERSON'::"public"."schedule_modality";--> statement-breakpoint
ALTER TABLE "schedule_assignment" ALTER COLUMN "modality" SET DATA TYPE "public"."schedule_modality" USING "modality"::"public"."schedule_modality";--> statement-breakpoint
ALTER TABLE "schedule_assignment" ALTER COLUMN "modality" SET NOT NULL;