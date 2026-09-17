CREATE TYPE "public"."record_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "career" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_name_not_blank_check" CHECK (length(trim("career"."name")) > 0),
	CONSTRAINT "career_normalized_name_not_blank_check" CHECK (length(trim("career"."normalized_name")) > 0),
	CONSTRAINT "career_normalized_name_check" CHECK ("career"."normalized_name" = lower(trim("career"."name")))
);
--> statement-breakpoint
CREATE TABLE "scholarship_reference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"normalized_type" text NOT NULL,
	"known_required_hours" integer,
	"notes" text,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scholarship_reference_type_not_blank_check" CHECK (length(trim("scholarship_reference"."type")) > 0),
	CONSTRAINT "scholarship_reference_normalized_type_not_blank_check" CHECK (length(trim("scholarship_reference"."normalized_type")) > 0),
	CONSTRAINT "scholarship_reference_normalized_type_check" CHECK ("scholarship_reference"."normalized_type" = lower(trim("scholarship_reference"."type"))),
	CONSTRAINT "scholarship_reference_hours_non_negative_check" CHECK ("scholarship_reference"."known_required_hours" IS NULL OR "scholarship_reference"."known_required_hours" >= 0)
);
--> statement-breakpoint
CREATE TABLE "subject" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"career_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_name_not_blank_check" CHECK (length(trim("subject"."name")) > 0),
	CONSTRAINT "subject_normalized_name_not_blank_check" CHECK (length(trim("subject"."normalized_name")) > 0),
	CONSTRAINT "subject_normalized_name_check" CHECK ("subject"."normalized_name" = lower(trim("subject"."name")))
);
--> statement-breakpoint
CREATE TABLE "tutor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"preferred_display_name" text,
	"institutional_identifier" text,
	"normalized_institutional_identifier" text,
	"primary_career_id" uuid NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_first_name_not_blank_check" CHECK (length(trim("tutor"."first_name")) > 0),
	CONSTRAINT "tutor_last_name_not_blank_check" CHECK (length(trim("tutor"."last_name")) > 0),
	CONSTRAINT "tutor_preferred_display_name_check" CHECK ("tutor"."preferred_display_name" IS NULL OR length(trim("tutor"."preferred_display_name")) > 0),
	CONSTRAINT "tutor_institutional_identifier_check" CHECK ("tutor"."institutional_identifier" IS NULL OR length(trim("tutor"."institutional_identifier")) > 0),
	CONSTRAINT "tutor_institutional_identifier_normalized_check" CHECK ((
        ("tutor"."institutional_identifier" IS NULL AND "tutor"."normalized_institutional_identifier" IS NULL)
        OR
        (
          "tutor"."institutional_identifier" IS NOT NULL
          AND "tutor"."normalized_institutional_identifier" IS NOT NULL
          AND length(trim("tutor"."normalized_institutional_identifier")) > 0
          AND "tutor"."normalized_institutional_identifier" = lower(trim("tutor"."institutional_identifier"))
        )
      ))
);
--> statement-breakpoint
CREATE TABLE "tutor_cycle_membership" (
	"tutor_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"scholarship_reference_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_cycle_membership_pk" PRIMARY KEY("tutor_id","cycle_id")
);
--> statement-breakpoint
CREATE TABLE "tutor_subject" (
	"tutor_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_subject_pk" PRIMARY KEY("tutor_id","subject_id")
);
--> statement-breakpoint
ALTER TABLE "subject" ADD CONSTRAINT "subject_career_id_career_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."career"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor" ADD CONSTRAINT "tutor_primary_career_id_career_id_fk" FOREIGN KEY ("primary_career_id") REFERENCES "public"."career"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_cycle_membership" ADD CONSTRAINT "tutor_cycle_membership_tutor_id_tutor_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_cycle_membership" ADD CONSTRAINT "tutor_cycle_membership_cycle_id_administrative_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."administrative_cycle"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_cycle_membership" ADD CONSTRAINT "tutor_cycle_membership_scholarship_reference_id_scholarship_reference_id_fk" FOREIGN KEY ("scholarship_reference_id") REFERENCES "public"."scholarship_reference"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_subject" ADD CONSTRAINT "tutor_subject_tutor_id_tutor_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_subject" ADD CONSTRAINT "tutor_subject_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "career_normalized_name_unique" ON "career" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "career_status_idx" ON "career" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "scholarship_reference_normalized_type_unique" ON "scholarship_reference" USING btree ("normalized_type");--> statement-breakpoint
CREATE INDEX "scholarship_reference_status_idx" ON "scholarship_reference" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_career_normalized_name_unique" ON "subject" USING btree ("career_id","normalized_name");--> statement-breakpoint
CREATE INDEX "subject_career_status_idx" ON "subject" USING btree ("career_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tutor_institutional_identifier_unique" ON "tutor" USING btree ("normalized_institutional_identifier") WHERE "tutor"."normalized_institutional_identifier" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "tutor_primary_career_idx" ON "tutor" USING btree ("primary_career_id");--> statement-breakpoint
CREATE INDEX "tutor_status_idx" ON "tutor" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tutor_cycle_membership_cycle_idx" ON "tutor_cycle_membership" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "tutor_cycle_membership_scholarship_reference_idx" ON "tutor_cycle_membership" USING btree ("scholarship_reference_id");--> statement-breakpoint
CREATE INDEX "tutor_subject_subject_idx" ON "tutor_subject" USING btree ("subject_id");