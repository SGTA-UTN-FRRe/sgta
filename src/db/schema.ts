import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { SafeAuditMetadata } from "./audit-validation";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "TUTOR"]);

export const administrativeCycleStatusEnum = pgEnum(
  "administrative_cycle_status",
  ["OPEN", "CLOSED"],
);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("TUTOR"),
    enabled: boolean("enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "user_email_normalized_check",
      sql`${table.email} = lower(${table.email})`,
    ),
    check("user_email_not_blank_check", sql`length(trim(${table.email})) > 0`),
    index("user_enabled_role_idx").on(table.enabled, table.role),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    index("account_user_id_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const administrativeCycle = pgTable(
  "administrative_cycle",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    status: administrativeCycleStatusEnum("status").notNull().default("OPEN"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "administrative_cycle_date_range_check",
      sql`${table.startDate} <= ${table.endDate}`,
    ),
    index("administrative_cycle_status_idx").on(table.status),
    index("administrative_cycle_dates_idx").on(
      table.startDate,
      table.endDate,
    ),
    uniqueIndex("administrative_cycle_one_open_idx")
      .on(table.status)
      .where(sql`${table.status} = 'OPEN'`),
  ],
);

export const auditEvent = pgTable(
  "audit_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata")
      .$type<SafeAuditMetadata>()
      .notNull()
      .default({}),
    requestId: text("request_id"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_event_actor_id_idx").on(table.actorId),
    index("audit_event_entity_idx").on(table.entityType, table.entityId),
    index("audit_event_action_idx").on(table.action),
    index("audit_event_created_at_idx").on(table.createdAt),
  ],
);

export const databaseSchema = {
  user,
  session,
  account,
  verification,
  administrativeCycle,
  auditEvent,
};

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type AdministrativeCycleStatus =
  (typeof administrativeCycleStatusEnum.enumValues)[number];

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type AdministrativeCycle = typeof administrativeCycle.$inferSelect;
export type NewAdministrativeCycle = typeof administrativeCycle.$inferInsert;
export type AuditEvent = typeof auditEvent.$inferSelect;
