import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import type { BetterAuthOptions } from "better-auth";

import type { ServerEnv } from "@/config/env";
import type { Database } from "@/db/client-core";
import { account, session, user, verification } from "@/db/schema";

import {
  canCreateSessionForIdentity,
  findProvisionedUserByEmail,
  findProvisionedUserById,
} from "./policy";
import { AUTH_ERROR_CODES, isEnabledIdentity, normalizeEmail } from "./identity";

const requiredAuthKeys = [
  "DATABASE_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const satisfies readonly (keyof ServerEnv)[];

export type AuthEnvironment = ServerEnv &
  Required<
    Pick<
      ServerEnv,
      "DATABASE_URL" | "BETTER_AUTH_URL" | "BETTER_AUTH_SECRET" | "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET"
    >
  >;

export class AuthConfigurationError extends Error {
  constructor(missingKeys: readonly string[]) {
    super(
      [
        "Authentication is not configured.",
        ...missingKeys.map((key) => `- ${key}: is required to start Better Auth`),
      ].join("\n"),
    );
    this.name = "AuthConfigurationError";
  }
}

export function requireAuthEnvironment(env: ServerEnv): AuthEnvironment {
  const missingKeys = requiredAuthKeys.filter((key) => env[key] === undefined);

  if (missingKeys.length > 0) {
    throw new AuthConfigurationError(missingKeys);
  }

  return env as AuthEnvironment;
}

function hasServerOwnedUserField(data: Record<string, unknown>) {
  return "role" in data || "enabled" in data;
}

type SessionEnvelope = {
  session: {
    token: string;
  };
  user: {
    id: string;
  };
};

function getSessionEnvelope(value: unknown): SessionEnvelope | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as {
    session?: { token?: unknown };
    user?: { id?: unknown };
  };

  if (
    typeof candidate.session?.token !== "string" ||
    typeof candidate.user?.id !== "string"
  ) {
    return null;
  }

  return {
    session: { token: candidate.session.token },
    user: { id: candidate.user.id },
  };
}

export function createAuthOptions(env: AuthEnvironment, db: Database) {
  const revalidateSessionAfter = createAuthMiddleware(async (context) => {
    if (context.path !== "/get-session") {
      return;
    }

    const sessionEnvelope =
      getSessionEnvelope(context.context.returned) ??
      getSessionEnvelope(context.context.session);

    if (sessionEnvelope === null) {
      return;
    }

    const identity = await findProvisionedUserById(
      db,
      sessionEnvelope.user.id,
    );

    if (!isEnabledIdentity(identity)) {
      await context.context.internalAdapter.deleteSession(
        sessionEnvelope.session.token,
      );
      return null;
    }
  });

  const options = {
    appName: "SGTA",
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
      transaction: true,
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        hd: env.GOOGLE_HOSTED_DOMAIN,
        disableImplicitSignUp: true,
        disableSignUp: true,
        prompt: "select_account",
        scope: ["openid", "email", "profile"],
      },
    },
    emailAndPassword: {
      enabled: false,
      disableSignUp: true,
    },
    disabledPaths: ["/sign-in/email", "/sign-up/email"],
    user: {
      additionalFields: {
        role: {
          type: "string",
          fieldName: "role",
          required: true,
          returned: true,
          input: false,
          defaultValue: "TUTOR",
        },
        enabled: {
          type: "boolean",
          fieldName: "enabled",
          required: true,
          returned: true,
          input: false,
          defaultValue: false,
        },
      },
      changeEmail: { enabled: false },
      deleteUser: { enabled: false },
      validateUserInfo: async ({ user: incomingUser, source }) => {
        if (
          source.method !== "oauth" ||
          source.oauth?.providerId !== "google"
        ) {
          return {
            error: AUTH_ERROR_CODES.providerNotAllowed,
            errorDescription: "Only the configured Google identity is allowed.",
          };
        }

        const email =
          typeof incomingUser.email === "string"
            ? normalizeEmail(incomingUser.email)
            : "";
        const identity = await findProvisionedUserByEmail(db, email);

        if (!isEnabledIdentity(identity)) {
          return {
            error: AUTH_ERROR_CODES.identityNotProvisioned,
            errorDescription: "The SGTA identity is not enabled.",
          };
        }

        if (
          source.oauth.profile !== undefined &&
          source.oauth.profile.email_verified !== true
        ) {
          return {
            error: AUTH_ERROR_CODES.providerEmailUnverified,
            errorDescription: "The Google identity email is not verified.",
          };
        }
      },
    },
    account: {
      encryptOAuthTokens: true,
      updateAccountOnSignIn: true,
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        updateUserInfoOnLink: false,
      },
    },
    session: {
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: env.NODE_ENV === "production",
      database: { validateSchema: true },
    },
    plugins: [nextCookies()],
    databaseHooks: {
      user: {
        update: {
          before: async (data) => {
            if (hasServerOwnedUserField(data)) {
              return false;
            }
          },
        },
      },
      account: {
        create: {
          before: async (data) => {
            const identity = await findProvisionedUserById(db, data.userId);
            return canCreateSessionForIdentity(identity);
          },
        },
      },
      session: {
        create: {
          before: async (data) => {
            const identity = await findProvisionedUserById(db, data.userId);
            return canCreateSessionForIdentity(identity);
          },
        },
      },
    },
    hooks: {
      after: revalidateSessionAfter,
    },
  } satisfies BetterAuthOptions;

  return options;
}
