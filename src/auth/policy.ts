import { eq } from "drizzle-orm";

import type { Database } from "@/db/client-core";
import { user, type UserRole } from "@/db/schema";

import { isEnabledIdentity, normalizeEmail, type ProvisionedIdentity } from "./identity";

type UserLookupDatabase = Pick<Database, "select">;

export type AuthorizedIdentity = ProvisionedIdentity & {
  name: string;
};

export async function findProvisionedUserByEmail(
  db: UserLookupDatabase,
  email: string,
): Promise<ProvisionedIdentity | null> {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail.length === 0) {
    return null;
  }

  const [record] = await db
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
    })
    .from(user)
    .where(eq(user.email, normalizedEmail))
    .limit(1);

  return record ?? null;
}

export async function findProvisionedUserById(
  db: UserLookupDatabase,
  id: string,
): Promise<ProvisionedIdentity | null> {
  if (id.trim().length === 0) {
    return null;
  }

  const [record] = await db
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  return record ?? null;
}

export async function findAuthorizedUserById(
  db: UserLookupDatabase,
  id: string,
): Promise<AuthorizedIdentity | null> {
  if (id.trim().length === 0) {
    return null;
  }

  const [record] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  return record ?? null;
}

export function canCreateSessionForIdentity(
  identity: Pick<ProvisionedIdentity, "enabled"> | null | undefined,
) {
  return isEnabledIdentity(identity);
}

export function isSupportedApplicationRole(role: string): role is UserRole {
  return role === "ADMIN" || role === "TUTOR";
}
