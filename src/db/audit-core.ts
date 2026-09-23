import "server-only";

import { desc } from "drizzle-orm";

import { auditEvent } from "./schema";
import {
  parseAuditEventInput,
  type AuditEventInput,
} from "./audit-validation";
import type { Database } from "./client-core";

export type AuditDatabase = Pick<Database, "insert">;
export type AuditQueryDatabase = Pick<Database, "select">;

export type SafeAuditEvent = Pick<
  typeof auditEvent.$inferSelect,
  | "id"
  | "actorId"
  | "action"
  | "entityType"
  | "entityId"
  | "metadata"
  | "requestId"
  | "ipAddress"
  | "createdAt"
>;

export async function recordAuditEvent<TDatabase extends AuditDatabase>(
  db: TDatabase,
  input: AuditEventInput,
) {
  const parsed = parseAuditEventInput(input);
  const [event] = await db
    .insert(auditEvent)
    .values({
      actorId: parsed.actorId ?? null,
      action: parsed.action,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      metadata: parsed.metadata,
      requestId: parsed.requestId ?? null,
      ipAddress: parsed.ipAddress ?? null,
    })
    .returning();

  if (event === undefined) {
    throw new Error("The audit event could not be persisted.");
  }

  return event;
}

export function createAuditRecorder<TDatabase extends AuditDatabase>(
  db: TDatabase,
) {
  return (input: AuditEventInput) => recordAuditEvent(db, input);
}

export async function listAuditEvents(
  db: AuditQueryDatabase,
  limit = 50,
): Promise<SafeAuditEvent[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);

  return db
    .select({
      id: auditEvent.id,
      actorId: auditEvent.actorId,
      action: auditEvent.action,
      entityType: auditEvent.entityType,
      entityId: auditEvent.entityId,
      metadata: auditEvent.metadata,
      requestId: auditEvent.requestId,
      ipAddress: auditEvent.ipAddress,
      createdAt: auditEvent.createdAt,
    })
    .from(auditEvent)
    .orderBy(desc(auditEvent.createdAt))
    .limit(boundedLimit);
}
