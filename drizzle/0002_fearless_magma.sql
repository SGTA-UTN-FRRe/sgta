CREATE TYPE "public"."activity_kind" AS ENUM('MEETING', 'WORKSHOP', 'EXTRAORDINARY', 'RECOVERY');--> statement-breakpoint
CREATE TYPE "public"."hour_movement_direction" AS ENUM('CREDIT', 'DEBIT');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"kind" "activity_kind" NOT NULL,
	"activity_date" date NOT NULL,
	"duration_minutes" integer NOT NULL,
	"note" text,
	"actor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_duration_minutes_positive_check" CHECK ("activity"."duration_minutes" > 0),
	CONSTRAINT "activity_note_not_blank_check" CHECK ("activity"."note" IS NULL OR length(trim("activity"."note")) > 0)
);
--> statement-breakpoint
CREATE TABLE "hour_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"activity_kind" "activity_kind",
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hour_category_name_not_blank_check" CHECK (length(trim("hour_category"."name")) > 0),
	CONSTRAINT "hour_category_normalized_name_not_blank_check" CHECK (length(trim("hour_category"."normalized_name")) > 0),
	CONSTRAINT "hour_category_normalized_name_check" CHECK ("hour_category"."normalized_name" = lower(trim("hour_category"."name")))
);
--> statement-breakpoint
CREATE TABLE "hour_movement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"tutor_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"direction" "hour_movement_direction" NOT NULL,
	"duration_minutes" integer NOT NULL,
	"movement_date" date NOT NULL,
	"note" text,
	"activity_id" uuid,
	"reversal_of_movement_id" uuid,
	"actor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hour_movement_duration_minutes_positive_check" CHECK ("hour_movement"."duration_minutes" > 0),
	CONSTRAINT "hour_movement_note_not_blank_check" CHECK ("hour_movement"."note" IS NULL OR length(trim("hour_movement"."note")) > 0),
	CONSTRAINT "hour_movement_not_self_reversal_check" CHECK ("hour_movement"."reversal_of_movement_id" IS NULL OR "hour_movement"."reversal_of_movement_id" <> "hour_movement"."id")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_cycle_id_administrative_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."administrative_cycle"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_movement" ADD CONSTRAINT "hour_movement_cycle_id_administrative_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."administrative_cycle"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_movement" ADD CONSTRAINT "hour_movement_tutor_id_tutor_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_movement" ADD CONSTRAINT "hour_movement_category_id_hour_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."hour_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_movement" ADD CONSTRAINT "hour_movement_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_movement" ADD CONSTRAINT "hour_movement_reversal_of_movement_id_hour_movement_id_fk" FOREIGN KEY ("reversal_of_movement_id") REFERENCES "public"."hour_movement"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hour_movement" ADD CONSTRAINT "hour_movement_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_cycle_date_idx" ON "activity" USING btree ("cycle_id","activity_date");--> statement-breakpoint
CREATE INDEX "activity_kind_idx" ON "activity" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "hour_category_normalized_name_unique" ON "hour_category" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "hour_category_status_idx" ON "hour_category" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hour_movement_cycle_tutor_date_idx" ON "hour_movement" USING btree ("cycle_id","tutor_id","movement_date");--> statement-breakpoint
CREATE INDEX "hour_movement_category_idx" ON "hour_movement" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "hour_movement_activity_idx" ON "hour_movement" USING btree ("activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hour_movement_reversal_unique" ON "hour_movement" USING btree ("reversal_of_movement_id") WHERE "hour_movement"."reversal_of_movement_id" IS NOT NULL;