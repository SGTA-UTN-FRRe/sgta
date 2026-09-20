CREATE TYPE "public"."attendance_debit_status" AS ENUM('NOT_PROPOSED', 'PROPOSED', 'CANCELLED', 'CONFIRMED');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('PENDING', 'PRESENT', 'ABSENT');--> statement-breakpoint
CREATE TYPE "public"."schedule_assignment_kind" AS ENUM('DUTY', 'RECOVERY');--> statement-breakpoint
CREATE TYPE "public"."schedule_assignment_pattern" AS ENUM('WEEKDAY', 'DATE');--> statement-breakpoint
CREATE TYPE "public"."schedule_plan_kind" AS ENUM('REGULAR', 'SPECIAL');--> statement-breakpoint
CREATE TABLE "attendance_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"status" "attendance_status" DEFAULT 'PENDING' NOT NULL,
	"debit_status" "attendance_debit_status" DEFAULT 'NOT_PROPOSED' NOT NULL,
	"proposed_debit_minutes" integer,
	"recognized_debit_minutes" integer,
	"actor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_record_proposed_debit_minutes_check" CHECK ("attendance_record"."proposed_debit_minutes" IS NULL OR "attendance_record"."proposed_debit_minutes" >= 0),
	CONSTRAINT "attendance_record_recognized_debit_minutes_check" CHECK ("attendance_record"."recognized_debit_minutes" IS NULL OR "attendance_record"."recognized_debit_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "duty_occurrence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"tutor_id" uuid NOT NULL,
	"occurrence_date" date NOT NULL,
	"start_minutes" integer NOT NULL,
	"end_minutes" integer NOT NULL,
	"kind" "schedule_assignment_kind" NOT NULL,
	"modality" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "duty_occurrence_time_range_check" CHECK ("duty_occurrence"."start_minutes" >= 0 AND "duty_occurrence"."start_minutes" < 1440 AND "duty_occurrence"."end_minutes" > 0 AND "duty_occurrence"."end_minutes" <= 1440 AND "duty_occurrence"."start_minutes" < "duty_occurrence"."end_minutes"),
	CONSTRAINT "duty_occurrence_modality_not_blank_check" CHECK ("duty_occurrence"."modality" IS NULL OR length(trim("duty_occurrence"."modality")) > 0)
);
--> statement-breakpoint
CREATE TABLE "schedule_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"tutor_id" uuid NOT NULL,
	"pattern" "schedule_assignment_pattern" NOT NULL,
	"weekday" integer,
	"assignment_date" date,
	"start_minutes" integer NOT NULL,
	"end_minutes" integer NOT NULL,
	"kind" "schedule_assignment_kind" DEFAULT 'DUTY' NOT NULL,
	"modality" text,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_assignment_pattern_check" CHECK ((
        ("schedule_assignment"."pattern" = 'WEEKDAY' AND "schedule_assignment"."weekday" IS NOT NULL AND "schedule_assignment"."assignment_date" IS NULL)
        OR
        ("schedule_assignment"."pattern" = 'DATE' AND "schedule_assignment"."weekday" IS NULL AND "schedule_assignment"."assignment_date" IS NOT NULL)
      )),
	CONSTRAINT "schedule_assignment_weekday_check" CHECK ("schedule_assignment"."weekday" IS NULL OR ("schedule_assignment"."weekday" >= 1 AND "schedule_assignment"."weekday" <= 7)),
	CONSTRAINT "schedule_assignment_time_range_check" CHECK ("schedule_assignment"."start_minutes" >= 0 AND "schedule_assignment"."start_minutes" < 1440 AND "schedule_assignment"."end_minutes" > 0 AND "schedule_assignment"."end_minutes" <= 1440 AND "schedule_assignment"."start_minutes" < "schedule_assignment"."end_minutes"),
	CONSTRAINT "schedule_assignment_modality_not_blank_check" CHECK ("schedule_assignment"."modality" IS NULL OR length(trim("schedule_assignment"."modality")) > 0)
);
--> statement-breakpoint
CREATE TABLE "schedule_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "schedule_plan_kind" NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_plan_name_not_blank_check" CHECK (length(trim("schedule_plan"."name")) > 0),
	CONSTRAINT "schedule_plan_validity_check" CHECK ("schedule_plan"."valid_from" <= "schedule_plan"."valid_to")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "duty_occurrence_id" uuid;--> statement-breakpoint
ALTER TABLE "hour_movement" ADD COLUMN "attendance_record_id" uuid;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_occurrence_id_duty_occurrence_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."duty_occurrence"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duty_occurrence" ADD CONSTRAINT "duty_occurrence_cycle_id_administrative_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."administrative_cycle"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duty_occurrence" ADD CONSTRAINT "duty_occurrence_plan_id_schedule_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."schedule_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duty_occurrence" ADD CONSTRAINT "duty_occurrence_assignment_id_schedule_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."schedule_assignment"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duty_occurrence" ADD CONSTRAINT "duty_occurrence_tutor_id_tutor_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignment" ADD CONSTRAINT "schedule_assignment_plan_id_schedule_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."schedule_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignment" ADD CONSTRAINT "schedule_assignment_tutor_id_tutor_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_plan" ADD CONSTRAINT "schedule_plan_cycle_id_administrative_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."administrative_cycle"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_record_occurrence_unique" ON "attendance_record" USING btree ("occurrence_id");--> statement-breakpoint
CREATE INDEX "attendance_record_status_idx" ON "attendance_record" USING btree ("status","debit_status");--> statement-breakpoint
CREATE UNIQUE INDEX "duty_occurrence_assignment_date_unique" ON "duty_occurrence" USING btree ("assignment_id","occurrence_date");--> statement-breakpoint
CREATE INDEX "duty_occurrence_cycle_date_idx" ON "duty_occurrence" USING btree ("cycle_id","occurrence_date");--> statement-breakpoint
CREATE INDEX "duty_occurrence_tutor_date_idx" ON "duty_occurrence" USING btree ("tutor_id","occurrence_date");--> statement-breakpoint
CREATE INDEX "schedule_assignment_plan_status_idx" ON "schedule_assignment" USING btree ("plan_id","status");--> statement-breakpoint
CREATE INDEX "schedule_assignment_tutor_status_idx" ON "schedule_assignment" USING btree ("tutor_id","status");--> statement-breakpoint
CREATE INDEX "schedule_assignment_date_idx" ON "schedule_assignment" USING btree ("assignment_date");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_plan_active_regular_unique" ON "schedule_plan" USING btree ("cycle_id") WHERE "schedule_plan"."kind" = 'REGULAR' AND "schedule_plan"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "schedule_plan_cycle_status_idx" ON "schedule_plan" USING btree ("cycle_id","status");--> statement-breakpoint
CREATE INDEX "schedule_plan_cycle_validity_idx" ON "schedule_plan" USING btree ("cycle_id","valid_from","valid_to");--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_duty_occurrence_id_duty_occurrence_id_fk" FOREIGN KEY ("duty_occurrence_id") REFERENCES "public"."duty_occurrence"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_movement" ADD CONSTRAINT "hour_movement_attendance_record_id_attendance_record_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_record"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_duty_occurrence_idx" ON "activity" USING btree ("duty_occurrence_id");--> statement-breakpoint
CREATE INDEX "hour_movement_attendance_idx" ON "hour_movement" USING btree ("attendance_record_id");