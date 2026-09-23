DROP INDEX "consultation_staging_review_updated_idx";--> statement-breakpoint
CREATE INDEX "consultation_staging_pending_queue_idx" ON "consultation_staging" USING btree ("normalized_consultation_date","id") WHERE "consultation_staging"."status" = 'PENDING_REVIEW';--> statement-breakpoint
CREATE INDEX "hour_movement_movement_date_idx" ON "hour_movement" USING btree ("movement_date");