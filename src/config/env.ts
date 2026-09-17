import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const optionalPostgresUrl = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .min(1)
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
          url.hostname.length > 0
        );
      } catch {
        return false;
      }
    }, "must be a PostgreSQL connection URL")
    .optional(),
);

const optionalApplicationUrl = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .url("must be a valid URL")
    .refine((value) => isHttpUrl(value), "must use http or https")
    .optional(),
);

function isHttpUrl(value: string) {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

const optionalSecret = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(32, "must contain at least 32 characters").optional(),
);

const optionalNonEmptyString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalHostedDomain = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .min(1)
    .max(253)
    .regex(
      /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/,
      "must be a valid hosted domain",
    )
    .optional(),
);

const serverEnvSchema = z
  .object({
    NODE_ENV: z.preprocess(
      emptyToUndefined,
      z.enum(["development", "test", "production"]).default("development"),
    ),
    DATABASE_URL: optionalPostgresUrl,
    BETTER_AUTH_URL: optionalApplicationUrl,
    BETTER_AUTH_SECRET: optionalSecret,
    GOOGLE_CLIENT_ID: optionalNonEmptyString,
    GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
    GOOGLE_HOSTED_DOMAIN: optionalHostedDomain,
    TEST_DATABASE_URL: optionalPostgresUrl,
  })
  .superRefine((value, context) => {
    const hasClientId = value.GOOGLE_CLIENT_ID !== undefined;
    const hasClientSecret = value.GOOGLE_CLIENT_SECRET !== undefined;

    if (hasClientId !== hasClientSecret) {
      context.addIssue({
        code: "custom",
        path: [hasClientId ? "GOOGLE_CLIENT_SECRET" : "GOOGLE_CLIENT_ID"],
        message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided together",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export type EnvironmentIssue = {
  path: string[];
  message: string;
};

export class EnvironmentValidationError extends Error {
  readonly issues: readonly EnvironmentIssue[];

  constructor(issues: readonly EnvironmentIssue[]) {
    super(
      ["Invalid server environment configuration.", ...issues.map(formatIssue)].join(
        "\n",
      ),
    );
    this.name = "EnvironmentValidationError";
    this.issues = issues;
  }
}

function formatIssue(issue: EnvironmentIssue) {
  const path = issue.path.length > 0 ? issue.path.join(".") : "environment";
  return `- ${path}: ${issue.message}`;
}

const productionRequiredKeys = [
  "DATABASE_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const satisfies readonly (keyof ServerEnv)[];

export type ParseServerEnvOptions = {
  requireProduction?: boolean;
};

export function parseServerEnv(
  input: NodeJS.ProcessEnv = process.env,
  options: ParseServerEnvOptions = {},
): ServerEnv {
  const parsed = serverEnvSchema.safeParse(input);

  if (!parsed.success) {
    throw new EnvironmentValidationError(
      parsed.error.issues.map((issue) => ({
        path: issue.path.map(String),
        message: issue.message,
      })),
    );
  }

  const requireProduction =
    options.requireProduction ?? parsed.data.NODE_ENV === "production";

  if (requireProduction) {
    const missing = productionRequiredKeys
      .filter((key) => parsed.data[key] === undefined)
      .map((key) => ({
        path: [key],
        message: "is required when NODE_ENV is production",
      }));

    if (missing.length > 0) {
      throw new EnvironmentValidationError(missing);
    }
  }

  return parsed.data;
}

export function getServerEnv() {
  return parseServerEnv();
}

export type DatabaseTarget = "application" | "test";

export function getDatabaseUrl(
  target: DatabaseTarget = "application",
  env: ServerEnv = getServerEnv(),
) {
  const key = target === "test" ? "TEST_DATABASE_URL" : "DATABASE_URL";
  const value = env[key];

  if (value === undefined) {
    throw new EnvironmentValidationError([
      {
        path: [key],
        message: `is required for the ${target} database target`,
      },
    ]);
  }

  return value;
}
