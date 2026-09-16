import { auditEvent } from "./schema";
import {
  parseAuditEventInput,
  type AuditEventInput,
} from "./audit-validation";
import type { Database } from "./client-core";

export type AuditDatabase = Pick<Database, "insert">;

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
