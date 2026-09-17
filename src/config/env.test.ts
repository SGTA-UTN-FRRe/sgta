import {
  EnvironmentValidationError,
  getDatabaseUrl,
  parseServerEnv,
} from "./env";

describe("server environment configuration", () => {
  it("allows the public shell to run in development without secrets", () => {
    expect(parseServerEnv({ NODE_ENV: "development" })).toEqual({
      NODE_ENV: "development",
    });
  });

  it("requires the production server configuration", () => {
    expect(() => parseServerEnv({ NODE_ENV: "production" })).toThrow(
      EnvironmentValidationError,
    );

    try {
      parseServerEnv({ NODE_ENV: "production" });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect((error as EnvironmentValidationError).message).toContain(
        "DATABASE_URL",
      );
      expect((error as EnvironmentValidationError).message).toContain(
        "BETTER_AUTH_SECRET",
      );
    }
  });

  it("validates production values without exposing their contents", () => {
    const env = parseServerEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db.example.test:5432/sgta",
      BETTER_AUTH_URL: "https://sgta.example.test",
      BETTER_AUTH_SECRET: "a".repeat(32),
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      GOOGLE_HOSTED_DOMAIN: "example.test",
    });

    expect(env.BETTER_AUTH_SECRET).toBe("a".repeat(32));
    expect(env.GOOGLE_HOSTED_DOMAIN).toBe("example.test");
  });

  it("rejects incomplete Google credentials", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "development",
        GOOGLE_CLIENT_ID: "client-id",
      }),
    ).toThrow("must be provided together");
  });

  it("reports malformed URLs through the environment error", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "development",
        BETTER_AUTH_URL: "not-a-url",
      }),
    ).toThrow(EnvironmentValidationError);
  });

  it("keeps the test database target explicit", () => {
    const env = parseServerEnv({
      NODE_ENV: "test",
      TEST_DATABASE_URL: "postgres://test.example.test:5432/sgta_test",
    });

    expect(getDatabaseUrl("test", env)).toBe(
      "postgres://test.example.test:5432/sgta_test",
    );
    expect(() => getDatabaseUrl("application", env)).toThrow("DATABASE_URL");
  });
});
