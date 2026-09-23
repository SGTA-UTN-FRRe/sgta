import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { recordAuditEvent } from "@/db/audit-core";
import type { Database } from "@/db/client-core";
import { user, type UserRole } from "@/db/schema";

import { normalizeEmail } from "./identity";

export const provisionUserInputSchema = z
  .object({
    email: z.string().trim().email().transform(normalizeEmail),
    name: z.string().trim().min(1).max(200),
    role: z.enum(["ADMIN", "TUTOR"]),
    enabled: z.boolean(),
  })
  .strict();

export type ProvisionUserInput = z.input<typeof provisionUserInputSchema>;
export type ParsedProvisionUserInput = z.output<typeof provisionUserInputSchema>;

export type ProvisioningContext = {
  actorId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  source?: "admin" | "bootstrap";
};

export type SafeProvisionedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  enabled: boolean;
};

export function parseProvisionUserInput(
  input: ProvisionUserInput,
): ParsedProvisionUserInput {
  return provisionUserInputSchema.parse(input);
}

export function toSafeProvisionedUser(
  record: Pick<SafeProvisionedUser, "id" | "name" | "email" | "role" | "enabled">,
): SafeProvisionedUser {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    enabled: record.enabled,
  };
}

export async function provisionUser(
  db: Database,
  input: ProvisionUserInput,
  context: ProvisioningContext = {},
): Promise<SafeProvisionedUser> {
  const parsed = parseProvisionUserInput(input);

  return db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, parsed.email))
      .limit(1);

    const [record] = await transaction
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        name: parsed.name,
        email: parsed.email,
        emailVerified: true,
        role: parsed.role,
        enabled: parsed.enabled,
      })
      .onConflictDoUpdate({
        target: user.email,
        set: {
          name: parsed.name,
          emailVerified: true,
          role: parsed.role,
          enabled: parsed.enabled,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        enabled: user.enabled,
      });

    if (record === undefined) {
      throw new Error("The provisioned user could not be persisted.");
    }

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: existing === undefined ? "user.provisioned.created" : "user.provisioned.updated",
      entityType: "user",
      entityId: record.id,
      metadata: {
        enabled: record.enabled,
        role: record.role,
        source: context.source ?? "admin",
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return toSafeProvisionedUser(record);
  });
}
