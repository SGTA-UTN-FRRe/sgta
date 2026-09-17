import "server-only";

import { betterAuth, type Auth } from "better-auth";

import { getServerEnv } from "@/config/env";
import { getDatabase } from "@/db/client";

import {
  createAuthOptions,
  requireAuthEnvironment,
} from "./options";

type AuthOptions = ReturnType<typeof createAuthOptions>;
type ApplicationAuth = Auth<AuthOptions>;

let authInstance: ApplicationAuth | undefined;

export function getAuth() {
  if (authInstance === undefined) {
    const env = requireAuthEnvironment(getServerEnv());
    authInstance = betterAuth(createAuthOptions(env, getDatabase()));
  }

  return authInstance;
}
