ALTER TABLE "activity" DROP CONSTRAINT "activity_duty_occurrence_id_duty_occurrence_id_fk";
--> statement-breakpoint
ALTER TABLE "hour_movement" DROP CONSTRAINT "hour_movement_attendance_record_id_attendance_record_id_fk";
--> statement-breakpoint
DROP INDEX "activity_duty_occurrence_idx";--> statement-breakpoint
DROP INDEX "hour_movement_attendance_idx";--> statement-breakpoint
ALTER TABLE "activity" DROP COLUMN "duty_occurrence_id";--> statement-breakpoint
ALTER TABLE "hour_movement" DROP COLUMN "attendance_record_id";