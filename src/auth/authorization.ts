import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getDatabase } from "@/db/client";
import type { UserRole } from "@/db/schema";

import { AuthConfigurationError } from "./options";
import { getAuth } from "./index";
import { findAuthorizedUserById } from "./policy";

export type AuthorizedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthorizedUserOptions = {
  allowUnconfigured?: boolean;
};

export class AuthorizationUnavailableError extends Error {
  constructor() {
    super("Authorization data is temporarily unavailable.");
    this.name = "AuthorizationUnavailableError";
  }
}

export async function getAuthorizedUser(
  options: AuthorizedUserOptions = {},
): Promise<AuthorizedUser | null> {
  try {
    const requestHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: requestHeaders });
    const userId = session?.user?.id;

    if (typeof userId !== "string" || userId.trim().length === 0) {
      return null;
    }

    const identity = await findAuthorizedUserById(getDatabase(), userId);

    if (identity === null || identity.enabled !== true) {
      return null;
    }

    return {
      id: identity.id,
      name: identity.name,
      email: identity.email,
      role: identity.role,
    };
  } catch (error) {
    if (options.allowUnconfigured && error instanceof AuthConfigurationError) {
      return null;
    }

    throw new AuthorizationUnavailableError();
  }
}

export async function requireRole(role: UserRole): Promise<AuthorizedUser> {
  let user: AuthorizedUser | null;

  try {
    user = await getAuthorizedUser({ allowUnconfigured: true });
  } catch (error) {
    if (!(error instanceof AuthorizationUnavailableError)) {
      throw error;
    }

    redirect("/login?error=authorization_unavailable");
  }

  if (user === null) {
    redirect("/login");
  }

  if (user.role !== role) {
    redirect("/forbidden");
  }

  return user;
}

function authorizationError(status: 401 | 403, code: "unauthorized" | "forbidden") {
  return Response.json(
    { error: code },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function requireApiRole(
  role: UserRole,
): Promise<AuthorizedUser | Response> {
  let user: AuthorizedUser | null;

  try {
    user = await getAuthorizedUser({ allowUnconfigured: true });
  } catch (error) {
    if (!(error instanceof AuthorizationUnavailableError)) {
      throw error;
    }

    return Response.json(
      { error: "authorization_unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  if (user === null) {
    return authorizationError(401, "unauthorized");
  }

  if (user.role !== role) {
    return authorizationError(403, "forbidden");
  }

  return user;
}
