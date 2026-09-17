import type { UserRole } from "@/db/schema";

export const AUTH_ERROR_CODES = {
  identityNotProvisioned: "identity_not_provisioned",
  providerEmailUnverified: "provider_email_unverified",
  providerNotAllowed: "provider_not_allowed",
} as const;

export type ProvisionedIdentity = {
  id: string;
  email: string;
  role: UserRole;
  enabled: boolean;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isEnabledIdentity(
  identity: Pick<ProvisionedIdentity, "enabled"> | null | undefined,
) {
  return identity?.enabled === true;
}
