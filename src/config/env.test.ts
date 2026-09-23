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

  it("keeps consultation source settings optional for canonical reads", () => {
    const absentSource = parseServerEnv({ NODE_ENV: "development" });

    expect(absentSource.NODE_ENV).toBe("development");
    expect(absentSource.GOOGLE_SHEETS_SPREADSHEET_ID).toBeUndefined();
    expect(absentSource.GOOGLE_SHEETS_RANGE).toBeUndefined();
    expect(absentSource.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL).toBeUndefined();
    expect(absentSource.GOOGLE_SHEETS_PRIVATE_KEY).toBeUndefined();
    expect(absentSource.GOOGLE_SHEETS_HEADER_MAP).toBeUndefined();

    expect(
      parseServerEnv({
        NODE_ENV: "development",
        GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL: "partial@example.test",
      }).GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL,
    ).toBe("partial@example.test");
  });

  it("defers invalid optional consultation settings to the source boundary", () => {
    expect(
      parseServerEnv({
        NODE_ENV: "development",
        GOOGLE_SHEETS_HEADER_MAP: "x".repeat(4097),
      }).GOOGLE_SHEETS_HEADER_MAP,
    ).toHaveLength(4097);
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

  it("accepts only an explicit loopback consultation source in test mode", () => {
    const sourceUrl = "http://127.0.0.1:43127";

    expect(
      parseServerEnv({
        NODE_ENV: "test",
        SGTA_E2E_CONSULTATION_SOURCE_URL: sourceUrl,
      }).SGTA_E2E_CONSULTATION_SOURCE_URL,
    ).toBe(sourceUrl);
    expect(() =>
      parseServerEnv({
        NODE_ENV: "development",
        SGTA_E2E_CONSULTATION_SOURCE_URL: sourceUrl,
      }),
    ).toThrow("is available only when NODE_ENV is test");
    expect(() =>
      parseServerEnv({
        NODE_ENV: "test",
        SGTA_E2E_CONSULTATION_SOURCE_URL: "https://sheets.googleapis.com",
      }),
    ).toThrow("must be a loopback HTTP URL with an explicit port");
  });
});
