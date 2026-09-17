import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  getDatabase: vi.fn(),
  getSession: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: authMocks.headers }));
vi.mock("next/navigation", () => ({ redirect: authMocks.redirect }));
vi.mock("@/auth/index", () => ({ getAuth: authMocks.getAuth }));
vi.mock("@/db/client", () => ({ getDatabase: authMocks.getDatabase }));

import { GET as getAdminCycles } from "@/app/api/admin/cycles/route";
import { requireApiRole, requireRole } from "@/auth/authorization";
import { createAuthOptions } from "@/auth/options";
import type { AuthEnvironment } from "@/auth/options";
import { recordAuditEvent, listAuditEvents } from "@/db/audit-core";
import { account, administrativeCycle, auditEvent, session, user } from "@/db/schema";
import {
  closeAdministrativeCycle,
  createAdministrativeCycle,
  getCurrentAdministrativeCycle,
  listAdministrativeCycles,
} from "@/features/cycles/cycle-service";
import { provisionUser } from "@/auth/provisioning";

import {
  getIntegrationConnectionString,
  getIntegrationDatabase,
  POSTGRES_IMAGE,
} from "./setup";

const authEnvironment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://integration.invalid/sgta",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "integration-only-secret-123456789012345",
  GOOGLE_CLIENT_ID: "integration-google-client-id",
  GOOGLE_CLIENT_SECRET: "integration-google-client-secret",
  GOOGLE_HOSTED_DOMAIN: undefined,
  TEST_DATABASE_URL: undefined,
} satisfies AuthEnvironment;

async function resetDatabase() {
  await getIntegrationDatabase().execute(
    sql`TRUNCATE TABLE "audit_event", "session", "account", "verification", "administrative_cycle", "user" CASCADE`,
  );
}

async function seedIdentities() {
  const database = getIntegrationDatabase();
  const admin = await provisionUser(
    database,
    {
      email: "admin.integration@example.test",
      name: "Integration Admin",
      role: "ADMIN",
      enabled: true,
    },
    { source: "bootstrap" },
  );
  const tutor = await provisionUser(
    database,
    {
      email: "tutor.integration@example.test",
      name: "Integration Tutor",
      role: "TUTOR",
      enabled: true,
    },
    { actorId: admin.id, source: "admin" },
  );
  const disabled = await provisionUser(
    database,
    {
      email: "disabled.integration@example.test",
      name: "Disabled Identity",
      role: "TUTOR",
      enabled: false,
    },
    { actorId: admin.id, source: "admin" },
  );

  return { admin, tutor, disabled };
}

function getRows<T>(result: { rows: unknown[] }) {
  return result.rows as T[];
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
  authMocks.getDatabase.mockReturnValue(getIntegrationDatabase());
  authMocks.headers.mockResolvedValue(
    new Headers({ cookie: "better-auth.session=integration" }),
  );
  authMocks.getAuth.mockReturnValue({
    api: { getSession: authMocks.getSession },
  });
  authMocks.getSession.mockResolvedValue(null);
  authMocks.redirect.mockImplementation((path: string) => {
    throw new Error(`redirect:${path}`);
  });
});

describe("PostgreSQL foundation integration", () => {
  it("applies the pinned migration to the isolated container and reruns it safely", async () => {
    const database = getIntegrationDatabase();
    const tables = getRows<{ table_name: string }>(
      await database.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('user', 'session', 'account', 'verification', 'administrative_cycle', 'audit_event')
        ORDER BY table_name
      `),
    );
    const migrations = getRows<{ migration_count: string }>(
      await database.execute(sql`
        SELECT count(*)::text AS migration_count
        FROM "drizzle"."__drizzle_migrations"
      `),
    );
    const enumValues = getRows<{ typname: string; enumlabel: string }>(
      await database.execute(sql`
        SELECT type.typname, enum.enumlabel
        FROM pg_type AS type
        JOIN pg_enum AS enum ON enum.enumtypid = type.oid
        WHERE type.typname IN ('user_role', 'administrative_cycle_status')
        ORDER BY type.typname, enum.enumsortorder
      `),
    );

    expect(POSTGRES_IMAGE).toBe("postgres:16.4-alpine");
    expect(tables.map((row) => row.table_name)).toEqual([
      "account",
      "administrative_cycle",
      "audit_event",
      "session",
      "user",
      "verification",
    ]);
    expect(migrations[0]?.migration_count).toBe("1");
    expect(enumValues).toEqual([
      { typname: "administrative_cycle_status", enumlabel: "OPEN" },
      { typname: "administrative_cycle_status", enumlabel: "CLOSED" },
      { typname: "user_role", enumlabel: "ADMIN" },
      { typname: "user_role", enumlabel: "TUTOR" },
    ]);
    expect(getIntegrationConnectionString()).toMatch(
      /^postgres(?:ql)?:\/\/[^/]+\/sgta_integration$/,
    );
  });

  it("enforces date, open-cycle, foreign-key, cascade, and audit actor constraints", async () => {
    const database = getIntegrationDatabase();

    await expect(
      database.insert(administrativeCycle).values({
        name: "Invalid cycle",
        startDate: "2027-12-31",
        endDate: "2027-01-01",
        status: "OPEN",
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await database.insert(administrativeCycle).values({
      name: "Open cycle",
      startDate: "2027-01-01",
      endDate: "2027-12-31",
      status: "OPEN",
    });
    await expect(
      database.insert(administrativeCycle).values({
        name: "Second open cycle",
        startDate: "2028-01-01",
        endDate: "2028-12-31",
        status: "OPEN",
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await database.insert(administrativeCycle).values({
      name: "Closed cycle",
      startDate: "2028-01-01",
      endDate: "2028-12-31",
      status: "CLOSED",
    });

    await expect(
      database.insert(session).values({
        id: "orphan-session",
        token: "orphan-session-token",
        userId: "missing-user",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ cause: { code: "23503" } });

    const relationshipUserId = "relationship-user";
    await database.insert(user).values({
      id: relationshipUserId,
      name: "Relationship User",
      email: "relationship@example.test",
      emailVerified: true,
      role: "ADMIN",
      enabled: true,
    });
    await database.insert(session).values({
      id: "relationship-session",
      token: "relationship-session-token",
      userId: relationshipUserId,
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    await database.insert(account).values({
      id: "relationship-account",
      accountId: "relationship-account-id",
      providerId: "google",
      userId: relationshipUserId,
    });
    await database.insert(auditEvent).values({
      actorId: relationshipUserId,
      action: "relationship.test",
      entityType: "user",
      entityId: relationshipUserId,
      metadata: {},
    });

    await database.delete(user).where(eq(user.id, relationshipUserId));

    await expect(
      database
        .select({ id: session.id })
        .from(session)
        .where(eq(session.id, "relationship-session")),
    ).resolves.toEqual([]);
    await expect(
      database
        .select({ id: account.id })
        .from(account)
        .where(eq(account.id, "relationship-account")),
    ).resolves.toEqual([]);
    await expect(
      database
        .select({ actorId: auditEvent.actorId })
        .from(auditEvent)
        .where(eq(auditEvent.action, "relationship.test")),
    ).resolves.toEqual([{ actorId: null }]);
  });

  it("persists provisioned roles and applies Google and session gates to real rows", async () => {
    const database = getIntegrationDatabase();
    const { admin, disabled } = await seedIdentities();
    const options = createAuthOptions(authEnvironment, database);
    const google = options.socialProviders?.google;
    const validateUserInfo = options.user?.validateUserInfo;
    const sessionBefore = options.databaseHooks?.session?.create?.before;

    expect(google).toMatchObject({
      disableImplicitSignUp: true,
      disableSignUp: true,
    });
    expect(options.emailAndPassword).toMatchObject({
      enabled: false,
      disableSignUp: true,
    });

    const unknownResult = await validateUserInfo?.({
      user: { email: "unknown.integration@example.test" },
      source: {
        action: "create-user",
        method: "oauth",
        oauth: { providerId: "google" },
      },
    } as never);
    const disabledResult = await validateUserInfo?.({
      user: { email: disabled.email },
      source: {
        action: "create-user",
        method: "oauth",
        oauth: { providerId: "google" },
      },
    } as never);
    const enabledResult = await validateUserInfo?.({
      user: { email: admin.email },
      source: {
        action: "create-user",
        method: "oauth",
        oauth: { providerId: "google" },
      },
    } as never);

    expect(unknownResult?.error).toBe("identity_not_provisioned");
    expect(disabledResult?.error).toBe("identity_not_provisioned");
    expect(enabledResult).toBeUndefined();
    await expect(sessionBefore?.({ userId: admin.id } as never)).resolves.toBe(true);
    await expect(sessionBefore?.({ userId: disabled.id } as never)).resolves.toBe(false);

    const persistedUsers = await database
      .select({ email: user.email, role: user.role, enabled: user.enabled })
      .from(user)
      .orderBy(user.email);
    expect(persistedUsers).toEqual([
      { email: "admin.integration@example.test", role: "ADMIN", enabled: true },
      { email: "disabled.integration@example.test", role: "TUTOR", enabled: false },
      { email: "tutor.integration@example.test", role: "TUTOR", enabled: true },
    ]);
  });

  it("records a post-creation session audit with no credential metadata", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const options = createAuthOptions(authEnvironment, database);
    const sessionId = "integration-session";

    await database.insert(session).values({
      id: sessionId,
      token: "integration-session-token",
      userId: admin.id,
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    await options.databaseHooks?.session?.create?.after?.({
      id: sessionId,
      userId: admin.id,
    } as never);

    const [event] = await database
      .select({
        actorId: auditEvent.actorId,
        action: auditEvent.action,
        entityType: auditEvent.entityType,
        entityId: auditEvent.entityId,
        metadata: auditEvent.metadata,
        createdAt: auditEvent.createdAt,
      })
      .from(auditEvent)
      .where(
        and(
          eq(auditEvent.action, "session.created"),
          eq(auditEvent.entityId, sessionId),
        ),
      )
      .limit(1);

    expect(event).toMatchObject({
      actorId: admin.id,
      action: "session.created",
      entityType: "session",
      entityId: sessionId,
      metadata: {},
    });
    expect(event?.createdAt).toBeInstanceOf(Date);
    expect(JSON.stringify(event?.metadata)).not.toContain("integration-session-token");
  });

  it("enforces DB-backed page and API role authorization", async () => {
    const { admin, tutor } = await seedIdentities();

    authMocks.getSession.mockResolvedValue({
      user: { id: admin.id, role: "TUTOR" },
    });
    await expect(requireRole("ADMIN")).resolves.toMatchObject({
      id: admin.id,
      role: "ADMIN",
    });
    const adminResponse = await getAdminCycles();
    expect(adminResponse.status).toBe(200);

    authMocks.getSession.mockResolvedValue({
      user: { id: tutor.id, role: "ADMIN" },
    });
    await expect(requireRole("TUTOR")).resolves.toMatchObject({
      id: tutor.id,
      role: "TUTOR",
    });
    await expect(requireRole("ADMIN")).rejects.toThrow("redirect:/forbidden");

    const tutorApiResponse = await requireApiRole("ADMIN");
    expect(tutorApiResponse).toBeInstanceOf(Response);
    expect(tutorApiResponse).toHaveProperty("status", 403);
    await expect((tutorApiResponse as Response).json()).resolves.toEqual({
      error: "forbidden",
    });
    const tutorCycleResponse = await getAdminCycles();
    expect(tutorCycleResponse.status).toBe(403);
  });

  it("records the complete cycle lifecycle with actor attribution and history", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const created = await createAdministrativeCycle(
      database,
      {
        name: "Integration Cycle 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      },
      {
        actorId: admin.id,
        requestId: "cycle-request-1",
        ipAddress: "203.0.113.20",
      },
    );

    await expect(getCurrentAdministrativeCycle(database)).resolves.toMatchObject({
      id: created.id,
      status: "OPEN",
    });

    const closed = await closeAdministrativeCycle(database, created.id, {
      actorId: admin.id,
      requestId: "cycle-request-2",
      ipAddress: "203.0.113.20",
    });

    expect(closed).toMatchObject({ id: created.id, status: "CLOSED" });
    await expect(getCurrentAdministrativeCycle(database)).resolves.toBeNull();
    await expect(listAdministrativeCycles(database)).resolves.toEqual([
      expect.objectContaining({ id: created.id, status: "CLOSED" }),
    ]);
    await expect(
      closeAdministrativeCycle(database, created.id, { actorId: admin.id }),
    ).rejects.toMatchObject({ code: "cycle_already_closed" });

    const cycleEvents = await listAuditEvents(database, 100);
    const lifecycleEvents = cycleEvents.filter(
      (event) => event.entityId === created.id,
    );
    expect(lifecycleEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: admin.id,
          action: "cycle.created",
          entityType: "administrative_cycle",
          metadata: {
            startDate: "2027-01-01",
            endDate: "2027-12-31",
            status: "OPEN",
          },
        }),
        expect.objectContaining({
          actorId: admin.id,
          action: "cycle.closed",
          entityType: "administrative_cycle",
          metadata: { previousStatus: "OPEN", status: "CLOSED" },
        }),
      ]),
    );
    expect(
      lifecycleEvents.some((event) => event.requestId === "cycle-request-1"),
    ).toBe(true);
    expect(
      lifecycleEvents.some((event) => event.requestId === "cycle-request-2"),
    ).toBe(true);
  });

  it("rejects sensitive audit metadata before it reaches PostgreSQL", async () => {
    const database = getIntegrationDatabase();

    await expect(
      recordAuditEvent(database, {
        action: "sensitive.integration.test",
        entityType: "test",
        entityId: "sensitive-1",
        metadata: { authorization: "Bearer synthetic-token" },
      }),
    ).rejects.toThrow();

    await expect(
      database
        .select({ id: auditEvent.id })
        .from(auditEvent)
        .where(eq(auditEvent.action, "sensitive.integration.test")),
    ).resolves.toEqual([]);
  });
});
