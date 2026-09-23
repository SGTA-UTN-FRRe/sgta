CREATE TYPE "public"."consultation_anomaly_code" AS ENUM('MISSING_SOURCE_ROW_KEY', 'MISSING_CAREER', 'UNRESOLVED_CAREER', 'AMBIGUOUS_CAREER', 'MISSING_STUDENT_FIRST_NAME', 'MISSING_STUDENT_LAST_NAME', 'INVALID_CONSULTATION_DATE', 'MISSING_TUTOR', 'UNRESOLVED_TUTOR', 'AMBIGUOUS_TUTOR', 'MISSING_ACADEMIC_STAGE', 'MISSING_MODALITY', 'MISSING_TOPIC', 'POSSIBLE_DUPLICATE', 'SOURCE_ROW_CHANGED');--> statement-breakpoint
CREATE TYPE "public"."consultation_classification" AS ENUM('SUBJECT', 'GENERAL', 'PENDING_CLASSIFICATION');--> statement-breakpoint
CREATE TYPE "public"."consultation_duplicate_decision" AS ENUM('PENDING', 'DUPLICATE', 'NOT_DUPLICATE');--> statement-breakpoint
CREATE TYPE "public"."consultation_import_run_status" AS ENUM('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."consultation_source_provider" AS ENUM('GOOGLE_SHEETS');--> statement-breakpoint
CREATE TYPE "public"."consultation_staging_status" AS ENUM('PENDING_REVIEW', 'READY', 'CONSOLIDATED', 'DUPLICATE');--> statement-breakpoint
CREATE TABLE "consultation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staging_id" uuid NOT NULL,
	"cycle_id" uuid,
	"consultation_date" date NOT NULL,
	"student_first_name" text NOT NULL,
	"student_last_name" text NOT NULL,
	"student_contact" text,
	"career_id" uuid NOT NULL,
	"tutor_id" uuid NOT NULL,
	"academic_stage" text,
	"modality" text,
	"raw_topic" text,
	"classification" "consultation_classification" NOT NULL,
	"subject_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consultation_classification_subject_check" CHECK (("consultation"."classification" = 'SUBJECT' AND "consultation"."subject_id" IS NOT NULL) OR ("consultation"."classification" = 'GENERAL' AND "consultation"."subject_id" IS NULL)),
	CONSTRAINT "consultation_student_name_bounds_check" CHECK (length(trim("consultation"."student_first_name")) BETWEEN 1 AND 200 AND length(trim("consultation"."student_last_name")) BETWEEN 1 AND 200 AND ("consultation"."student_contact" IS NULL OR length("consultation"."student_contact") <= 320) AND ("consultation"."academic_stage" IS NULL OR length("consultation"."academic_stage") <= 200) AND ("consultation"."modality" IS NULL OR length("consultation"."modality") <= 100) AND ("consultation"."raw_topic" IS NULL OR length("consultation"."raw_topic") <= 4000))
);
--> statement-breakpoint
CREATE TABLE "consultation_duplicate_candidate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_staging_id" uuid NOT NULL,
	"second_staging_id" uuid NOT NULL,
	"rule_code" text NOT NULL,
	"match_key_hash" text NOT NULL,
	"decision" "consultation_duplicate_decision" DEFAULT 'PENDING' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consultation_duplicate_candidate_order_check" CHECK ("consultation_duplicate_candidate"."first_staging_id" < "consultation_duplicate_candidate"."second_staging_id"),
	CONSTRAINT "consultation_duplicate_candidate_rule_code_check" CHECK ("consultation_duplicate_candidate"."rule_code" ~ '^[a-z0-9_]{1,80}$'),
	CONSTRAINT "consultation_duplicate_candidate_match_hash_check" CHECK ("consultation_duplicate_candidate"."match_key_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "consultation_duplicate_candidate_decision_check" CHECK (("consultation_duplicate_candidate"."decision" = 'PENDING' AND "consultation_duplicate_candidate"."decided_by" IS NULL AND "consultation_duplicate_candidate"."decided_at" IS NULL) OR ("consultation_duplicate_candidate"."decision" IN ('DUPLICATE', 'NOT_DUPLICATE') AND "consultation_duplicate_candidate"."decided_by" IS NOT NULL AND "consultation_duplicate_candidate"."decided_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "consultation_import_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"status" "consultation_import_run_status" DEFAULT 'RUNNING' NOT NULL,
	"source_spreadsheet_id" text,
	"source_range" text,
	"new_rows" integer DEFAULT 0 NOT NULL,
	"already_processed_rows" integer DEFAULT 0 NOT NULL,
	"review_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_candidates" integer DEFAULT 0 NOT NULL,
	"error_rows" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"request_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "consultation_import_run_counts_non_negative_check" CHECK ("consultation_import_run"."new_rows" >= 0 AND "consultation_import_run"."already_processed_rows" >= 0 AND "consultation_import_run"."review_rows" >= 0 AND "consultation_import_run"."duplicate_candidates" >= 0 AND "consultation_import_run"."error_rows" >= 0),
	CONSTRAINT "consultation_import_run_completion_check" CHECK (("consultation_import_run"."status" = 'RUNNING' AND "consultation_import_run"."completed_at" IS NULL) OR ("consultation_import_run"."status" <> 'RUNNING' AND "consultation_import_run"."completed_at" IS NOT NULL)),
	CONSTRAINT "consultation_import_run_source_bounds_check" CHECK (("consultation_import_run"."source_spreadsheet_id" IS NULL OR length(trim("consultation_import_run"."source_spreadsheet_id")) BETWEEN 1 AND 256) AND ("consultation_import_run"."source_range" IS NULL OR length(trim("consultation_import_run"."source_range")) BETWEEN 1 AND 256)),
	CONSTRAINT "consultation_import_run_error_code_check" CHECK ("consultation_import_run"."error_code" IS NULL OR "consultation_import_run"."error_code" ~ '^[a-z0-9_]{1,80}$'),
	CONSTRAINT "consultation_import_run_request_id_check" CHECK ("consultation_import_run"."request_id" IS NULL OR length(trim("consultation_import_run"."request_id")) BETWEEN 1 AND 255)
);
--> statement-breakpoint
CREATE TABLE "consultation_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_provider" "consultation_source_provider" DEFAULT 'GOOGLE_SHEETS' NOT NULL,
	"source_spreadsheet_id" text NOT NULL,
	"source_tab" text NOT NULL,
	"source_row_key" text NOT NULL,
	"source_fingerprint" text NOT NULL,
	"previous_source_fingerprint" text,
	"first_seen_run_id" uuid NOT NULL,
	"last_seen_run_id" uuid NOT NULL,
	"raw_career" text,
	"raw_student_first_name" text,
	"raw_student_last_name" text,
	"raw_consultation_date" text,
	"raw_tutor" text,
	"raw_academic_stage" text,
	"raw_modality" text,
	"raw_topic" text,
	"raw_contact" text,
	"normalized_career" text,
	"career_id" uuid,
	"normalized_student_first_name" text,
	"normalized_student_last_name" text,
	"normalized_consultation_date" date,
	"normalized_tutor" text,
	"tutor_id" uuid,
	"normalized_academic_stage" text,
	"normalized_modality" text,
	"normalized_topic" text,
	"normalized_contact" text,
	"anomaly_flags" "consultation_anomaly_code"[] DEFAULT ARRAY[]::consultation_anomaly_code[] NOT NULL,
	"status" "consultation_staging_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"classification" "consultation_classification" DEFAULT 'PENDING_CLASSIFICATION' NOT NULL,
	"subject_id" uuid,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_version" integer DEFAULT 1 NOT NULL,
	"source_changed_at" timestamp with time zone,
	"source_change_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consultation_staging_source_identity_bounds_check" CHECK (length(trim("consultation_staging"."source_spreadsheet_id")) BETWEEN 1 AND 256 AND length(trim("consultation_staging"."source_tab")) BETWEEN 1 AND 200 AND length(trim("consultation_staging"."source_row_key")) BETWEEN 1 AND 255),
	CONSTRAINT "consultation_staging_source_fingerprint_check" CHECK ("consultation_staging"."source_fingerprint" ~ '^[0-9a-f]{64}$' AND ("consultation_staging"."previous_source_fingerprint" IS NULL OR "consultation_staging"."previous_source_fingerprint" ~ '^[0-9a-f]{64}$')),
	CONSTRAINT "consultation_staging_anomaly_flags_bounds_check" CHECK (cardinality("consultation_staging"."anomaly_flags") <= 32),
	CONSTRAINT "consultation_staging_raw_field_bounds_check" CHECK (("consultation_staging"."raw_career" IS NULL OR length("consultation_staging"."raw_career") <= 300) AND ("consultation_staging"."raw_student_first_name" IS NULL OR length("consultation_staging"."raw_student_first_name") <= 200) AND ("consultation_staging"."raw_student_last_name" IS NULL OR length("consultation_staging"."raw_student_last_name") <= 200) AND ("consultation_staging"."raw_consultation_date" IS NULL OR length("consultation_staging"."raw_consultation_date") <= 100) AND ("consultation_staging"."raw_tutor" IS NULL OR length("consultation_staging"."raw_tutor") <= 300) AND ("consultation_staging"."raw_academic_stage" IS NULL OR length("consultation_staging"."raw_academic_stage") <= 200) AND ("consultation_staging"."raw_modality" IS NULL OR length("consultation_staging"."raw_modality") <= 100) AND ("consultation_staging"."raw_topic" IS NULL OR length("consultation_staging"."raw_topic") <= 4000) AND ("consultation_staging"."raw_contact" IS NULL OR length("consultation_staging"."raw_contact") <= 320)),
	CONSTRAINT "consultation_staging_normalized_field_bounds_check" CHECK (("consultation_staging"."normalized_career" IS NULL OR length("consultation_staging"."normalized_career") <= 300) AND ("consultation_staging"."normalized_student_first_name" IS NULL OR length("consultation_staging"."normalized_student_first_name") <= 200) AND ("consultation_staging"."normalized_student_last_name" IS NULL OR length("consultation_staging"."normalized_student_last_name") <= 200) AND ("consultation_staging"."normalized_tutor" IS NULL OR length("consultation_staging"."normalized_tutor") <= 300) AND ("consultation_staging"."normalized_academic_stage" IS NULL OR length("consultation_staging"."normalized_academic_stage") <= 200) AND ("consultation_staging"."normalized_modality" IS NULL OR length("consultation_staging"."normalized_modality") <= 100) AND ("consultation_staging"."normalized_topic" IS NULL OR length("consultation_staging"."normalized_topic") <= 4000) AND ("consultation_staging"."normalized_contact" IS NULL OR length("consultation_staging"."normalized_contact") <= 320)),
	CONSTRAINT "consultation_staging_classification_subject_check" CHECK (("consultation_staging"."classification" = 'SUBJECT' AND "consultation_staging"."subject_id" IS NOT NULL) OR ("consultation_staging"."classification" <> 'SUBJECT' AND "consultation_staging"."subject_id" IS NULL)),
	CONSTRAINT "consultation_staging_review_state_check" CHECK (("consultation_staging"."status" NOT IN ('READY', 'CONSOLIDATED', 'DUPLICATE') OR ("consultation_staging"."reviewed_by" IS NOT NULL AND "consultation_staging"."reviewed_at" IS NOT NULL)) AND ("consultation_staging"."status" <> 'READY' OR (cardinality("consultation_staging"."anomaly_flags") = 0 AND "consultation_staging"."classification" IN ('SUBJECT', 'GENERAL'))) AND ("consultation_staging"."status" <> 'CONSOLIDATED' OR "consultation_staging"."classification" IN ('SUBJECT', 'GENERAL'))),
	CONSTRAINT "consultation_staging_review_version_check" CHECK ("consultation_staging"."review_version" > 0 AND "consultation_staging"."source_change_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "consultation" ADD CONSTRAINT "consultation_staging_id_consultation_staging_id_fk" FOREIGN KEY ("staging_id") REFERENCES "public"."consultation_staging"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation" ADD CONSTRAINT "consultation_cycle_id_administrative_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."administrative_cycle"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation" ADD CONSTRAINT "consultation_career_id_career_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."career"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation" ADD CONSTRAINT "consultation_tutor_id_tutor_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation" ADD CONSTRAINT "consultation_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_duplicate_candidate" ADD CONSTRAINT "consultation_duplicate_candidate_first_staging_id_consultation_staging_id_fk" FOREIGN KEY ("first_staging_id") REFERENCES "public"."consultation_staging"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_duplicate_candidate" ADD CONSTRAINT "consultation_duplicate_candidate_second_staging_id_consultation_staging_id_fk" FOREIGN KEY ("second_staging_id") REFERENCES "public"."consultation_staging"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_duplicate_candidate" ADD CONSTRAINT "consultation_duplicate_candidate_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_import_run" ADD CONSTRAINT "consultation_import_run_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_staging" ADD CONSTRAINT "consultation_staging_first_seen_run_id_consultation_import_run_id_fk" FOREIGN KEY ("first_seen_run_id") REFERENCES "public"."consultation_import_run"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_staging" ADD CONSTRAINT "consultation_staging_last_seen_run_id_consultation_import_run_id_fk" FOREIGN KEY ("last_seen_run_id") REFERENCES "public"."consultation_import_run"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_staging" ADD CONSTRAINT "consultation_staging_career_id_career_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."career"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_staging" ADD CONSTRAINT "consultation_staging_tutor_id_tutor_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_staging" ADD CONSTRAINT "consultation_staging_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_staging" ADD CONSTRAINT "consultation_staging_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_staging_unique" ON "consultation" USING btree ("staging_id");--> statement-breakpoint
CREATE INDEX "consultation_date_idx" ON "consultation" USING btree ("consultation_date","id");--> statement-breakpoint
CREATE INDEX "consultation_classification_date_idx" ON "consultation" USING btree ("classification","consultation_date");--> statement-breakpoint
CREATE INDEX "consultation_career_date_idx" ON "consultation" USING btree ("career_id","consultation_date");--> statement-breakpoint
CREATE INDEX "consultation_tutor_date_idx" ON "consultation" USING btree ("tutor_id","consultation_date");--> statement-breakpoint
CREATE INDEX "consultation_subject_date_idx" ON "consultation" USING btree ("subject_id","consultation_date") WHERE "consultation"."subject_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "consultation_cycle_date_idx" ON "consultation" USING btree ("cycle_id","consultation_date") WHERE "consultation"."cycle_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_duplicate_candidate_pair_unique" ON "consultation_duplicate_candidate" USING btree ("first_staging_id","second_staging_id");--> statement-breakpoint
CREATE INDEX "consultation_duplicate_candidate_decision_created_idx" ON "consultation_duplicate_candidate" USING btree ("decision","created_at");--> statement-breakpoint
CREATE INDEX "consultation_duplicate_candidate_first_staging_idx" ON "consultation_duplicate_candidate" USING btree ("first_staging_id");--> statement-breakpoint
CREATE INDEX "consultation_duplicate_candidate_second_staging_idx" ON "consultation_duplicate_candidate" USING btree ("second_staging_id");--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_import_run_active_source_unique" ON "consultation_import_run" USING btree ("source_spreadsheet_id","source_range") WHERE "consultation_import_run"."status" = 'RUNNING' AND "consultation_import_run"."source_spreadsheet_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "consultation_import_run_status_started_idx" ON "consultation_import_run" USING btree ("status","started_at");--> statement-breakpoint
CREATE INDEX "consultation_import_run_actor_started_idx" ON "consultation_import_run" USING btree ("actor_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_staging_source_identity_unique" ON "consultation_staging" USING btree ("source_provider","source_spreadsheet_id","source_tab","source_row_key");--> statement-breakpoint
CREATE INDEX "consultation_staging_review_updated_idx" ON "consultation_staging" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "consultation_staging_source_run_idx" ON "consultation_staging" USING btree ("last_seen_run_id");--> statement-breakpoint
CREATE INDEX "consultation_staging_career_idx" ON "consultation_staging" USING btree ("career_id") WHERE "consultation_staging"."career_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "consultation_staging_tutor_idx" ON "consultation_staging" USING btree ("tutor_id") WHERE "consultation_staging"."tutor_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "consultation_staging_subject_idx" ON "consultation_staging" USING btree ("subject_id") WHERE "consultation_staging"."subject_id" IS NOT NULL;