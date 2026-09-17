export type LoginAuthState =
  | "default"
  | "loading"
  | "error"
  | "permission-denied";

const permissionDeniedErrorCodes = new Set([
  "account_not_linked",
  "email_not_found",
  "email_not_verified",
  "identity_not_provisioned",
  "provider_email_unverified",
  "signup_disabled",
]);

function getErrorCode(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const candidate = value as {
    code?: unknown;
    error?: unknown;
    body?: { code?: unknown };
    data?: { code?: unknown; error?: { code?: unknown } };
  };

  for (const code of [
    candidate.code,
    candidate.body?.code,
    candidate.data?.code,
    candidate.data?.error?.code,
  ]) {
    if (typeof code === "string") {
      return code;
    }
  }

  if (candidate.error !== undefined) {
    return getErrorCode(candidate.error);
  }

  return undefined;
}

export function loginStateFromAuthErrorCode(
  code: string | undefined,
): LoginAuthState {
  if (code === undefined || code.trim().length === 0) {
    return "default";
  }

  return permissionDeniedErrorCodes.has(code)
    ? "permission-denied"
    : "error";
}

export function loginStateFromAuthError(error: unknown): LoginAuthState {
  return loginStateFromAuthErrorCode(getErrorCode(error));
}
