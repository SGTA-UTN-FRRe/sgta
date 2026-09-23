import "server-only";

import { createHash } from "node:crypto";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { getServerEnv } from "@/config/env";
import { recordAuditEvent } from "@/db/audit-core";
import { getDatabase } from "@/db/client";
import type { Database } from "@/db/client-core";
import {
  career,
  consultationDuplicateCandidate,
  consultationImportRun,
  consultationStaging,
  tutor,
} from "@/db/schema";
import { normalizeName } from "@/features/tutors/tutor-validation";

import {
  CONSULTATION_SOURCE_ERROR_CODES,
  ConsultationSourceError,
  createGoogleSheetsConsultationSourceAdapter,
  type ConsultationSourceAdapter,
} from "./consultation-source";
import {
  consultationImportOptionsSchema,
  consultationSourceRowSchema,
  resolveConsultationSourceConfig,
  type ConsultationImportSummary,
  type ConsultationSourceConfigurationResult,
  type ConsultationSourceRow,
} from "./consultation-validation";

const importInputSchema = z
  .object({
    actorId: z.string().trim().min(1).max(255),
    requestId: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[A-Za-z0-9._:-]+$/)
      .optional(),
    maxRows: consultationImportOptionsSchema.shape.maxRows,
  })
  .strict()
  .transform((input) => ({
    ...input,
    maxRows: input.maxRows ?? 1000,
  }));

const importLeaseMs = 30 * 60 * 1000;
const duplicateQueryBatchSize = 100;
const stagingQueryBatchSize = 500;
const maxDuplicateMatches = 20_000;
const duplicateRuleCode = "exact_person_date_career_tutor";
const duplicateAnomaly = "POSSIBLE_DUPLICATE" as const;

class ConsultationImportFailure extends Error {
  constructor(readonly code: string) {
    super("The consultation import could not safely complete.");
    this.name = "ConsultationImportFailure";
  }
}

type CareerReference = Pick<typeof career.$inferSelect, "id" | "name" | "normalizedName">;
type DuplicateKeyInput = {
  careerId: string | null;
  tutorId: string | null;
  normalizedConsultationDate: string | null;
  normalizedStudentFirstName: string | null;
  normalizedStudentLastName: string | null;
};
type TutorReference = Pick<
  typeof tutor.$inferSelect,
  "id" | "firstName" | "lastName" | "preferredDisplayName"
>;

type ReferenceMatch = { id: string | null; count: number };
type AliasIndex = Map<string, Set<string>>;

export type ConsultationReferenceResolver = {
  resolveCareer(value: string): ReferenceMatch;
  resolveTutor(value: string): ReferenceMatch;
};

export type NormalizedConsultationSourceRow = {
  sourceRowKey: string;
  sourceFingerprint: string;
  rawCareer: string | null;
  rawStudentFirstName: string | null;
  rawStudentLastName: string | null;
  rawConsultationDate: string | null;
  rawTutor: string | null;
  rawAcademicStage: string | null;
  rawModality: string | null;
  rawTopic: string | null;
  rawContact: string | null;
  normalizedCareer: string | null;
  careerId: string | null;
  normalizedStudentFirstName: string | null;
  normalizedStudentLastName: string | null;
  normalizedConsultationDate: string | null;
  normalizedTutor: string | null;
  tutorId: string | null;
  normalizedAcademicStage: string | null;
  normalizedModality: string | null;
  normalizedTopic: string | null;
  normalizedContact: string | null;
  anomalyFlags: (typeof consultationStaging.$inferSelect.anomalyFlags)[number][];
};

export type ConsultationImportResult = {
  outcome: "completed" | "failed" | "conflict";
  summary: ConsultationImportSummary;
};

export type ConsultationImportDependencies = {
  db?: Database;
  sourceConfiguration?: ConsultationSourceConfigurationResult;
  sourceAdapter?: ConsultationSourceAdapter;
  now?: () => Date;
};

function buildAliasIndex(entries: Array<{ id: string; aliases: Array<string | null> }>) {
  const index: AliasIndex = new Map();

  for (const entry of entries) {
    for (const alias of entry.aliases) {
      if (alias === null) {
        continue;
      }

      const normalized = normalizeName(alias);
      if (normalized.length === 0) {
        continue;
      }

      const ids = index.get(normalized) ?? new Set<string>();
      ids.add(entry.id);
      index.set(normalized, ids);
    }
  }

  return index;
}

function resolveAlias(index: AliasIndex, value: string): ReferenceMatch {
  const matches = index.get(normalizeName(value));
  if (matches === undefined || matches.size === 0) {
    return { id: null, count: 0 };
  }

  return {
    id: matches.size === 1 ? [...matches][0] ?? null : null,
    count: matches.size,
  };
}

export function createConsultationReferenceResolver(
  careers: CareerReference[],
  tutors: TutorReference[],
): ConsultationReferenceResolver {
  const careerIndex = buildAliasIndex(
    careers.map((entry) => ({
      id: entry.id,
      aliases: [entry.name, entry.normalizedName],
    })),
  );
  const tutorIndex = buildAliasIndex(
    tutors.map((entry) => ({
      id: entry.id,
      aliases: [
        entry.preferredDisplayName,
        `${entry.firstName} ${entry.lastName}`,
        `${entry.lastName}, ${entry.firstName}`,
      ],
    })),
  );

  return {
    resolveCareer: (value) => resolveAlias(careerIndex, value),
    resolveTutor: (value) => resolveAlias(tutorIndex, value),
  };
}

function normalizeDisplayText(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  return normalized.length === 0 ? null : normalized;
}

function normalizeIndexedText(value: string | null) {
  return value === null ? null : normalizeName(value);
}

function parseDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseConsultationDate(value: string | null | undefined) {
  const normalized = normalizeDisplayText(value);
  if (normalized === null) {
    return null;
  }

  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso !== null) {
    return parseDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const dayFirst = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dayFirst !== null) {
    return parseDateParts(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));
  }

  return null;
}

function addMissingOrResolutionAnomaly(
  anomalies: Set<(typeof consultationStaging.$inferSelect.anomalyFlags)[number]>,
  value: string | null,
  match: ReferenceMatch,
  codes: {
    missing: (typeof consultationStaging.$inferSelect.anomalyFlags)[number];
    unresolved: (typeof consultationStaging.$inferSelect.anomalyFlags)[number];
    ambiguous: (typeof consultationStaging.$inferSelect.anomalyFlags)[number];
  },
) {
  if (value === null) {
    anomalies.add(codes.missing);
  } else if (match.count === 0) {
    anomalies.add(codes.unresolved);
  } else if (match.count > 1) {
    anomalies.add(codes.ambiguous);
  }
}

export function normalizeConsultationSourceRow(
  row: ConsultationSourceRow,
  resolver: ConsultationReferenceResolver,
): NormalizedConsultationSourceRow {
  const rawCareer = row.career ?? null;
  const rawTutor = row.tutor ?? null;
  const normalizedCareer = normalizeDisplayText(rawCareer);
  const normalizedTutor = normalizeDisplayText(rawTutor);
  const careerMatch =
    normalizedCareer === null
      ? { id: null, count: 0 }
      : resolver.resolveCareer(normalizedCareer);
  const tutorMatch =
    normalizedTutor === null
      ? { id: null, count: 0 }
      : resolver.resolveTutor(normalizedTutor);
  const rawFirstName = row.studentFirstName ?? null;
  const rawLastName = row.studentLastName ?? null;
  const rawDate = row.consultationDate ?? null;
  const rawAcademicStage = row.academicStage ?? null;
  const rawModality = row.modality ?? null;
  const rawTopic = row.topic ?? null;
  const rawContact = row.contact ?? null;
  const normalizedFirstName = normalizeDisplayText(rawFirstName);
  const normalizedLastName = normalizeDisplayText(rawLastName);
  const consultationDate = parseConsultationDate(rawDate);
  const normalizedAcademicStage = normalizeDisplayText(rawAcademicStage);
  const normalizedModality = normalizeDisplayText(rawModality);
  const normalizedTopic = normalizeDisplayText(rawTopic);
  const normalizedContact = normalizeDisplayText(rawContact);
  const anomalies = new Set<
    (typeof consultationStaging.$inferSelect.anomalyFlags)[number]
  >();

  addMissingOrResolutionAnomaly(anomalies, normalizedCareer, careerMatch, {
    missing: "MISSING_CAREER",
    unresolved: "UNRESOLVED_CAREER",
    ambiguous: "AMBIGUOUS_CAREER",
  });
  addMissingOrResolutionAnomaly(anomalies, normalizedTutor, tutorMatch, {
    missing: "MISSING_TUTOR",
    unresolved: "UNRESOLVED_TUTOR",
    ambiguous: "AMBIGUOUS_TUTOR",
  });

  if (normalizedFirstName === null) {
    anomalies.add("MISSING_STUDENT_FIRST_NAME");
  }
  if (normalizedLastName === null) {
    anomalies.add("MISSING_STUDENT_LAST_NAME");
  }
  if (consultationDate === null) {
    anomalies.add("INVALID_CONSULTATION_DATE");
  }
  if (normalizedAcademicStage === null) {
    anomalies.add("MISSING_ACADEMIC_STAGE");
  }
  if (normalizedModality === null) {
    anomalies.add("MISSING_MODALITY");
  }
  if (normalizedTopic === null) {
    anomalies.add("MISSING_TOPIC");
  }

  return {
    sourceRowKey: row.sourceRowKey,
    sourceFingerprint: row.sourceFingerprint,
    rawCareer,
    rawStudentFirstName: rawFirstName,
    rawStudentLastName: rawLastName,
    rawConsultationDate: rawDate,
    rawTutor,
    rawAcademicStage,
    rawModality,
    rawTopic,
    rawContact,
    normalizedCareer:
      normalizedCareer === null ? null : normalizeName(normalizedCareer),
    careerId: careerMatch.id,
    normalizedStudentFirstName:
      normalizedFirstName === null ? null : normalizeName(normalizedFirstName),
    normalizedStudentLastName:
      normalizedLastName === null ? null : normalizeName(normalizedLastName),
    normalizedConsultationDate: consultationDate,
    normalizedTutor:
      normalizedTutor === null ? null : normalizeName(normalizedTutor),
    tutorId: tutorMatch.id,
    normalizedAcademicStage: normalizeIndexedText(normalizedAcademicStage),
    normalizedModality: normalizeIndexedText(normalizedModality),
    normalizedTopic: normalizeIndexedText(normalizedTopic),
    normalizedContact: normalizeIndexedText(normalizedContact),
    anomalyFlags: [...anomalies],
  };
}

function resolveSourceConfiguration(
  override?: ConsultationSourceConfigurationResult,
): ConsultationSourceConfigurationResult {
  if (override !== undefined) {
    return override;
  }

  try {
    return resolveConsultationSourceConfig(getServerEnv());
  } catch {
    return {
      status: "invalid",
      code: "source_configuration_invalid",
      issues: [],
    };
  }
}

function sourceFailureCode(error: unknown) {
  if (error instanceof ConsultationSourceError) {
    return error.code;
  }

  return CONSULTATION_SOURCE_ERROR_CODES.unavailable;
}

function createDefaultSourceAdapter(
  config: Parameters<typeof createGoogleSheetsConsultationSourceAdapter>[0],
): ConsultationSourceAdapter {
  const environment = getServerEnv();

  if (environment.NODE_ENV !== "test") {
    return createGoogleSheetsConsultationSourceAdapter(config);
  }

  const apiBaseUrl = environment.SGTA_E2E_CONSULTATION_SOURCE_URL;
  if (apiBaseUrl === undefined) {
    return {
      async readRows() {
        throw new ConsultationSourceError(CONSULTATION_SOURCE_ERROR_CODES.unavailable);
      },
    };
  }

  return createGoogleSheetsConsultationSourceAdapter(config, {
    apiBaseUrl,
    getAccessToken: async () => "sgta-test-consultation-reader-token",
  });
}

function toTimestamp(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function summaryFromRun(
  run: typeof consultationImportRun.$inferSelect | null,
  lastSuccessfulAt: Date | null,
): ConsultationImportSummary {
  return {
    runId: run?.id ?? null,
    status: run?.status ?? null,
    startedAt: toTimestamp(run?.startedAt),
    completedAt: toTimestamp(run?.completedAt),
    lastSuccessfulAt: toTimestamp(lastSuccessfulAt),
    newRows: run?.newRows ?? 0,
    alreadyProcessedRows: run?.alreadyProcessedRows ?? 0,
    reviewRows: run?.reviewRows ?? 0,
    duplicateCandidates: run?.duplicateCandidates ?? 0,
    errorRows: run?.errorRows ?? 0,
    errorCode: run?.errorCode ?? null,
  };
}

async function readLastSuccessfulAt(db: Database) {
  const [run] = await db
    .select({ completedAt: consultationImportRun.completedAt })
    .from(consultationImportRun)
    .where(
      inArray(consultationImportRun.status, ["SUCCEEDED", "PARTIAL"]),
    )
    .orderBy(desc(consultationImportRun.completedAt))
    .limit(1);

  return run?.completedAt ?? null;
}

function isUniqueViolation(error: unknown) {
  const seen = new Set<object>();
  let current = error;

  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current);
    const queryError = current as { code?: unknown; cause?: unknown };
    if (queryError.code === "23505") {
      return true;
    }
    current = queryError.cause;
  }

  return false;
}

async function createFailedRun(
  db: Database,
  input: z.output<typeof importInputSchema>,
  configuration: ConsultationSourceConfigurationResult,
  code: string,
  now: Date,
) {
  const config = configuration.status === "configured" ? configuration.config : null;
  return db.transaction(async (tx) => {
    const [run] = await tx
      .insert(consultationImportRun)
      .values({
        actorId: input.actorId,
        status: "FAILED",
        sourceSpreadsheetId: config?.spreadsheetId ?? null,
        sourceRange: config?.range ?? null,
        errorCode: code,
        requestId: input.requestId ?? null,
        startedAt: now,
        completedAt: now,
      })
      .returning();

    if (run === undefined) {
      throw new Error("The consultation import failure could not be recorded.");
    }

    await recordAuditEvent(tx, {
      actorId: input.actorId,
      action: "consultation_import.failed",
      entityType: "consultation_import_run",
      entityId: run.id,
      requestId: input.requestId,
      metadata: { status: "FAILED", errorCode: code },
    });

    return run;
  });
}

async function reserveImportLease(
  db: Database,
  input: z.output<typeof importInputSchema>,
  config: Extract<ConsultationSourceConfigurationResult, { status: "configured" }>["config"],
  now: Date,
) {
  return db.transaction(async (tx) => {
    const staleBefore = new Date(now.getTime() - importLeaseMs);
    const staleRuns = await tx
      .update(consultationImportRun)
      .set({
        status: "FAILED",
        completedAt: now,
        errorCode: "import_lease_expired",
      })
      .where(
        and(
          eq(consultationImportRun.status, "RUNNING"),
          eq(consultationImportRun.sourceSpreadsheetId, config.spreadsheetId),
          eq(consultationImportRun.sourceRange, config.range),
          lt(consultationImportRun.startedAt, staleBefore),
        ),
      )
      .returning({ id: consultationImportRun.id });

    for (const staleRun of staleRuns) {
      await recordAuditEvent(tx, {
        actorId: input.actorId,
        action: "consultation_import.lease_recovered",
        entityType: "consultation_import_run",
        entityId: staleRun.id,
        requestId: input.requestId,
        metadata: { status: "FAILED", errorCode: "import_lease_expired" },
      });
    }

    const [run] = await tx
      .insert(consultationImportRun)
      .values({
        actorId: input.actorId,
        status: "RUNNING",
        sourceSpreadsheetId: config.spreadsheetId,
        sourceRange: config.range,
        requestId: input.requestId ?? null,
        startedAt: now,
      })
      .returning();

    if (run === undefined) {
      throw new Error("The consultation import lease could not be created.");
    }

    await recordAuditEvent(tx, {
      actorId: input.actorId,
      action: "consultation_import.started",
      entityType: "consultation_import_run",
      entityId: run.id,
      requestId: input.requestId,
      metadata: { status: "RUNNING" },
    });

    return run;
  });
}

async function findActiveRun(
  db: Database,
  config: Extract<ConsultationSourceConfigurationResult, { status: "configured" }>["config"],
) {
  const [run] = await db
    .select()
    .from(consultationImportRun)
    .where(
      and(
        eq(consultationImportRun.status, "RUNNING"),
        eq(consultationImportRun.sourceSpreadsheetId, config.spreadsheetId),
        eq(consultationImportRun.sourceRange, config.range),
      ),
    )
    .orderBy(desc(consultationImportRun.startedAt))
    .limit(1);

  return run ?? null;
}

function duplicateKey(row: DuplicateKeyInput) {
  if (
    row.careerId === null ||
    row.tutorId === null ||
    row.normalizedConsultationDate === null ||
    row.normalizedStudentFirstName === null ||
    row.normalizedStudentLastName === null
  ) {
    return null;
  }

  return JSON.stringify([
    row.careerId,
    row.tutorId,
    row.normalizedConsultationDate,
    row.normalizedStudentFirstName,
    row.normalizedStudentLastName,
  ]);
}

async function findDuplicateGroups(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  incoming: DuplicateKeyInput[],
) {
  const uniqueRows = new Map<string, DuplicateKeyInput>();
  for (const row of incoming) {
    const key = duplicateKey(row);
    if (key !== null && !uniqueRows.has(key)) {
      uniqueRows.set(key, row);
    }
  }

  const queryRows = [...uniqueRows.values()];
  if (queryRows.length === 0) {
    return [];
  }

  let totalMatches = 0;
  const groups: Array<{
    key: string;
    hash: string;
    ids: string[];
    members: Array<{
      id: string;
      anomalyFlags: (typeof consultationStaging.$inferSelect.anomalyFlags)[number][];
    }>;
  }> = [];

  for (let offset = 0; offset < queryRows.length; offset += duplicateQueryBatchSize) {
    const chunk = queryRows.slice(offset, offset + duplicateQueryBatchSize);
    const predicates = chunk.map((row) =>
      and(
        eq(consultationStaging.careerId, row.careerId!),
        eq(consultationStaging.tutorId, row.tutorId!),
        eq(consultationStaging.normalizedConsultationDate, row.normalizedConsultationDate!),
        eq(consultationStaging.normalizedStudentFirstName, row.normalizedStudentFirstName!),
        eq(consultationStaging.normalizedStudentLastName, row.normalizedStudentLastName!),
      ),
    );
    const matches = await tx
      .select({
        id: consultationStaging.id,
        careerId: consultationStaging.careerId,
        tutorId: consultationStaging.tutorId,
        normalizedConsultationDate: consultationStaging.normalizedConsultationDate,
        normalizedStudentFirstName: consultationStaging.normalizedStudentFirstName,
        normalizedStudentLastName: consultationStaging.normalizedStudentLastName,
        anomalyFlags: consultationStaging.anomalyFlags,
      })
      .from(consultationStaging)
      .where(or(...predicates))
      .orderBy(asc(consultationStaging.id))
      .limit(maxDuplicateMatches + 1);

    totalMatches += matches.length;
    if (matches.length > maxDuplicateMatches || totalMatches > maxDuplicateMatches) {
      throw new ConsultationImportFailure("import_duplicate_match_limit_exceeded");
    }

    const grouped = new Map<string, typeof matches>();
    for (const match of matches) {
      const key = duplicateKey(match);
      if (key === null) {
        continue;
      }

      const members = grouped.get(key) ?? [];
      members.push(match);
      grouped.set(key, members);
    }

    for (const [key, members] of grouped) {
      if (members.length < 2) {
        continue;
      }

      groups.push({
        key,
        hash: createHash("sha256").update(key).digest("hex"),
        ids: members.map((member) => member.id),
        members: members.map((member) => ({
          id: member.id,
          anomalyFlags: member.anomalyFlags,
        })),
      });
    }
  }

  return groups;
}

function sourceFields(row: NormalizedConsultationSourceRow) {
  return {
    sourceFingerprint: row.sourceFingerprint,
    rawCareer: row.rawCareer,
    rawStudentFirstName: row.rawStudentFirstName,
    rawStudentLastName: row.rawStudentLastName,
    rawConsultationDate: row.rawConsultationDate,
    rawTutor: row.rawTutor,
    rawAcademicStage: row.rawAcademicStage,
    rawModality: row.rawModality,
    rawTopic: row.rawTopic,
    rawContact: row.rawContact,
    normalizedCareer: row.normalizedCareer,
    careerId: row.careerId,
    normalizedStudentFirstName: row.normalizedStudentFirstName,
    normalizedStudentLastName: row.normalizedStudentLastName,
    normalizedConsultationDate: row.normalizedConsultationDate,
    normalizedTutor: row.normalizedTutor,
    tutorId: row.tutorId,
    normalizedAcademicStage: row.normalizedAcademicStage,
    normalizedModality: row.normalizedModality,
    normalizedTopic: row.normalizedTopic,
    normalizedContact: row.normalizedContact,
    anomalyFlags: row.anomalyFlags,
  };
}

async function persistSourceBatch(
  db: Database,
  runId: string,
  input: z.output<typeof importInputSchema>,
  config: Extract<ConsultationSourceConfigurationResult, { status: "configured" }>["config"],
  sourceTab: string,
  sourceRows: unknown[],
  now: Date,
) {
  return db.transaction(async (tx) => {
    const [lease] = await tx
      .select({
        status: consultationImportRun.status,
        startedAt: consultationImportRun.startedAt,
      })
      .from(consultationImportRun)
      .where(eq(consultationImportRun.id, runId))
      .for("update");

    if (
      lease === undefined ||
      lease.status !== "RUNNING" ||
      lease.startedAt.getTime() <= now.getTime() - importLeaseMs
    ) {
      throw new ConsultationImportFailure("import_lease_expired");
    }

    const [careers, tutors] = await Promise.all([
      tx.select({ id: career.id, name: career.name, normalizedName: career.normalizedName }).from(career),
      tx
        .select({
          id: tutor.id,
          firstName: tutor.firstName,
          lastName: tutor.lastName,
          preferredDisplayName: tutor.preferredDisplayName,
        })
        .from(tutor),
    ]);
    const resolver = createConsultationReferenceResolver(careers, tutors);
    const normalizedRows: NormalizedConsultationSourceRow[] = [];
    let rowErrors = 0;
    const seenRowKeys = new Set<string>();

    for (const value of sourceRows) {
      const parsed = consultationSourceRowSchema.safeParse(value);
      if (!parsed.success) {
        rowErrors += 1;
        continue;
      }

      if (seenRowKeys.has(parsed.data.sourceRowKey)) {
        rowErrors += 1;
        continue;
      }

      seenRowKeys.add(parsed.data.sourceRowKey);
      normalizedRows.push(normalizeConsultationSourceRow(parsed.data, resolver));
    }

    const identityRows = normalizedRows;
    const existingByRowKey = new Map<string, typeof consultationStaging.$inferSelect>();
    for (let offset = 0; offset < identityRows.length; offset += stagingQueryBatchSize) {
      const keys = identityRows
        .slice(offset, offset + stagingQueryBatchSize)
        .map((row) => row.sourceRowKey);
      if (keys.length === 0) {
        continue;
      }

      const existing = await tx
        .select()
        .from(consultationStaging)
        .where(
          and(
            eq(consultationStaging.sourceProvider, "GOOGLE_SHEETS"),
            eq(consultationStaging.sourceSpreadsheetId, config.spreadsheetId),
            eq(consultationStaging.sourceTab, sourceTab),
            inArray(consultationStaging.sourceRowKey, keys),
          ),
        );
      for (const row of existing) {
        existingByRowKey.set(row.sourceRowKey, row);
      }
    }

    const rowsToInsert = normalizedRows.filter(
      (row) => !existingByRowKey.has(row.sourceRowKey),
    );
    const insertedRowKeys = new Set<string>();
    for (let offset = 0; offset < rowsToInsert.length; offset += stagingQueryBatchSize) {
      const chunk = rowsToInsert.slice(offset, offset + stagingQueryBatchSize);
      const inserted = await tx
        .insert(consultationStaging)
        .values(
          chunk.map((row) => ({
            sourceProvider: "GOOGLE_SHEETS" as const,
            sourceSpreadsheetId: config.spreadsheetId,
            sourceTab,
            sourceRowKey: row.sourceRowKey,
            ...sourceFields(row),
            firstSeenRunId: runId,
            lastSeenRunId: runId,
            status: "PENDING_REVIEW" as const,
            classification: "PENDING_CLASSIFICATION" as const,
            firstSeenAt: now,
            lastSeenAt: now,
            createdAt: now,
            updatedAt: now,
          })),
        )
        .onConflictDoNothing()
        .returning({ sourceRowKey: consultationStaging.sourceRowKey });
      for (const row of inserted) {
        insertedRowKeys.add(row.sourceRowKey);
      }
    }

    const concurrentRowKeys = rowsToInsert
      .filter((row) => !insertedRowKeys.has(row.sourceRowKey))
      .map((row) => row.sourceRowKey);
    for (let offset = 0; offset < concurrentRowKeys.length; offset += stagingQueryBatchSize) {
      const existing = await tx
        .select()
        .from(consultationStaging)
        .where(
          and(
            eq(consultationStaging.sourceProvider, "GOOGLE_SHEETS"),
            eq(consultationStaging.sourceSpreadsheetId, config.spreadsheetId),
            eq(consultationStaging.sourceTab, sourceTab),
            inArray(consultationStaging.sourceRowKey, concurrentRowKeys.slice(offset, offset + stagingQueryBatchSize)),
          ),
        );
      for (const row of existing) {
        existingByRowKey.set(row.sourceRowKey, row);
      }
    }

    const changedRows: Array<{
      existing: typeof consultationStaging.$inferSelect;
      incoming: NormalizedConsultationSourceRow;
    }> = [];
    const unchangedIds: string[] = [];
    let alreadyProcessedRows = 0;

    for (const incoming of normalizedRows) {
      if (insertedRowKeys.has(incoming.sourceRowKey)) {
        continue;
      }

      const existing = existingByRowKey.get(incoming.sourceRowKey);
      if (existing === undefined) {
        // A concurrent source range may have inserted this identity after our initial read.
        continue;
      }

      if (existing.sourceFingerprint === incoming.sourceFingerprint) {
        unchangedIds.push(existing.id);
        alreadyProcessedRows += 1;
      } else {
        changedRows.push({ existing, incoming });
      }
    }

    if (unchangedIds.length > 0) {
      for (let offset = 0; offset < unchangedIds.length; offset += stagingQueryBatchSize) {
        await tx
          .update(consultationStaging)
          .set({ lastSeenRunId: runId, lastSeenAt: now, updatedAt: now })
          .where(inArray(consultationStaging.id, unchangedIds.slice(offset, offset + stagingQueryBatchSize)));
      }
    }

    for (const { existing, incoming } of changedRows) {
      await tx
        .update(consultationStaging)
        .set({
          ...sourceFields(incoming),
          previousSourceFingerprint: existing.sourceFingerprint,
          anomalyFlags: [...new Set([...incoming.anomalyFlags, "SOURCE_ROW_CHANGED" as const])],
          lastSeenRunId: runId,
          lastSeenAt: now,
          status: "PENDING_REVIEW",
          classification: "PENDING_CLASSIFICATION",
          subjectId: null,
          reviewedBy: null,
          reviewedAt: null,
          acknowledgedAnomalies: [],
          reviewVersion: existing.reviewVersion + 1,
          sourceChangedAt: now,
          sourceChangeCount: existing.sourceChangeCount + 1,
          updatedAt: now,
        })
        .where(eq(consultationStaging.id, existing.id));
    }

    const rowKeys = normalizedRows.map((row) => row.sourceRowKey);
    const stagedRows: Array<typeof consultationStaging.$inferSelect> = [];
    for (let offset = 0; offset < rowKeys.length; offset += stagingQueryBatchSize) {
      const existing = await tx
        .select()
        .from(consultationStaging)
        .where(
          and(
            eq(consultationStaging.sourceProvider, "GOOGLE_SHEETS"),
            eq(consultationStaging.sourceSpreadsheetId, config.spreadsheetId),
            eq(consultationStaging.sourceTab, sourceTab),
            inArray(consultationStaging.sourceRowKey, rowKeys.slice(offset, offset + stagingQueryBatchSize)),
          ),
        );
      stagedRows.push(...existing);
    }

    const duplicateGroups = await findDuplicateGroups(tx, stagedRows);
    const candidateRows: Array<{
      firstStagingId: string;
      secondStagingId: string;
      ruleCode: string;
      matchKeyHash: string;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    const duplicateReviewIds = new Set<string>();

    for (const group of duplicateGroups) {
      const sortedIds = [...group.ids].sort();
      const [anchor, ...others] = sortedIds;
      if (anchor === undefined) {
        continue;
      }

      for (const other of others) {
        candidateRows.push({
          firstStagingId: anchor,
          secondStagingId: other,
          ruleCode: duplicateRuleCode,
          matchKeyHash: group.hash,
          createdAt: now,
          updatedAt: now,
        });
      }

    }

    const changedCandidateIds = new Set<string>();
    for (let offset = 0; offset < candidateRows.length; offset += stagingQueryBatchSize) {
      const changedCandidates = await tx
        .insert(consultationDuplicateCandidate)
        .values(candidateRows.slice(offset, offset + stagingQueryBatchSize))
        .onConflictDoUpdate({
          target: [
            consultationDuplicateCandidate.firstStagingId,
            consultationDuplicateCandidate.secondStagingId,
          ],
          set: {
            matchKeyHash: sql`excluded.match_key_hash`,
            decision: "PENDING",
            duplicateStagingId: null,
            decidedBy: null,
            decidedAt: null,
            updatedAt: now,
          },
          setWhere: sql`${consultationDuplicateCandidate.matchKeyHash} <> excluded.match_key_hash`,
        })
        .returning({
          firstStagingId: consultationDuplicateCandidate.firstStagingId,
          secondStagingId: consultationDuplicateCandidate.secondStagingId,
        });
      for (const candidate of changedCandidates) {
        changedCandidateIds.add(candidate.firstStagingId);
        changedCandidateIds.add(candidate.secondStagingId);
      }
    }

    for (const group of duplicateGroups) {
      const hasNewAnomaly = group.members.some(
        (member) => !member.anomalyFlags.includes(duplicateAnomaly),
      );
      const hasChangedCandidate = group.ids.some((id) => changedCandidateIds.has(id));
      if (hasNewAnomaly || hasChangedCandidate) {
        for (const id of group.ids) {
          duplicateReviewIds.add(id);
        }
      }
    }

    const idsToReopen = [...duplicateReviewIds];
    for (let offset = 0; offset < idsToReopen.length; offset += stagingQueryBatchSize) {
      await tx
        .update(consultationStaging)
        .set({
          anomalyFlags: sql`CASE WHEN ${duplicateAnomaly}::consultation_anomaly_code = ANY(${consultationStaging.anomalyFlags}) THEN ${consultationStaging.anomalyFlags} ELSE array_append(${consultationStaging.anomalyFlags}, ${duplicateAnomaly}::consultation_anomaly_code) END`,
          status: "PENDING_REVIEW",
          classification: "PENDING_CLASSIFICATION",
          subjectId: null,
          reviewedBy: null,
          reviewedAt: null,
          acknowledgedAnomalies: [],
          reviewVersion: sql`${consultationStaging.reviewVersion} + 1`,
          updatedAt: now,
        })
        .where(inArray(consultationStaging.id, idsToReopen.slice(offset, offset + stagingQueryBatchSize)));
    }

    const importedRowKeys = new Set(normalizedRows.map((row) => row.sourceRowKey));
    const importedStaging = stagedRows.filter((row) => importedRowKeys.has(row.sourceRowKey));
    const importedIds = importedStaging.map((row) => row.id);
    const finalImported = importedIds.length === 0
      ? []
      : await tx
          .select({ id: consultationStaging.id, status: consultationStaging.status })
          .from(consultationStaging)
          .where(inArray(consultationStaging.id, importedIds));
    const reviewRows = finalImported.filter((row) => row.status === "PENDING_REVIEW").length;
    const newRows = insertedRowKeys.size;
    const duplicateCandidates = candidateRows.length;
    const completedStatus = rowErrors > 0 ? "PARTIAL" as const : "SUCCEEDED" as const;

    const [run] = await tx
      .update(consultationImportRun)
      .set({
        status: completedStatus,
        newRows,
        alreadyProcessedRows,
        reviewRows,
        duplicateCandidates,
        errorRows: rowErrors,
        errorCode: rowErrors > 0 ? "source_rows_invalid" : null,
        completedAt: now,
      })
      .where(eq(consultationImportRun.id, runId))
      .returning();

    if (run === undefined) {
      throw new Error("The consultation import run could not be completed.");
    }

    await recordAuditEvent(tx, {
      actorId: input.actorId,
      action:
        completedStatus === "PARTIAL"
          ? "consultation_import.partial"
          : "consultation_import.succeeded",
      entityType: "consultation_import_run",
      entityId: run.id,
      requestId: input.requestId,
      metadata: {
        status: completedStatus,
        newRows,
        alreadyProcessedRows,
        reviewRows,
        duplicateCandidates,
        errorRows: rowErrors,
        ...(rowErrors > 0 ? { errorCode: "source_rows_invalid" } : {}),
      },
    });

    return { run, lastSuccessfulAt: now };
  });
}

async function failReservedRun(
  db: Database,
  runId: string,
  input: z.output<typeof importInputSchema>,
  errorCode: string,
  now: Date,
) {
  return db.transaction(async (tx) => {
    const [updatedRun] = await tx
      .update(consultationImportRun)
      .set({ status: "FAILED", completedAt: now, errorCode: errorCode.slice(0, 80) })
      .where(
        and(
          eq(consultationImportRun.id, runId),
          eq(consultationImportRun.status, "RUNNING"),
        ),
      )
      .returning();

    if (updatedRun !== undefined) {
      await recordAuditEvent(tx, {
        actorId: input.actorId,
        action: "consultation_import.failed",
        entityType: "consultation_import_run",
        entityId: updatedRun.id,
        requestId: input.requestId,
        metadata: { status: "FAILED", errorCode: updatedRun.errorCode ?? "import_failed" },
      });
    }

    if (updatedRun !== undefined) {
      return updatedRun;
    }

    const [existingRun] = await tx
      .select()
      .from(consultationImportRun)
      .where(eq(consultationImportRun.id, runId))
      .limit(1);
    return existingRun ?? null;
  });
}

export async function importConsultationRows(
  rawInput: unknown,
  dependencies: ConsultationImportDependencies = {},
): Promise<ConsultationImportResult> {
  const input = importInputSchema.parse(rawInput);
  const db = dependencies.db ?? getDatabase();
  const now = dependencies.now ?? (() => new Date());
  const startedAt = now();
  const configuration = resolveSourceConfiguration(dependencies.sourceConfiguration);

  if (configuration.status !== "configured") {
    const errorCode =
      configuration.status === "unavailable"
        ? configuration.code
        : configuration.code;
    const run = await createFailedRun(db, input, configuration, errorCode, startedAt);
    const lastSuccessfulAt = await readLastSuccessfulAt(db);
    return { outcome: "failed", summary: summaryFromRun(run, lastSuccessfulAt) };
  }

  const config = configuration.config;
  let run: typeof consultationImportRun.$inferSelect;
  try {
    run = await reserveImportLease(db, input, config, startedAt);
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    const activeRun = await findActiveRun(db, config);
    if (activeRun === null) {
      throw error;
    }

    await recordAuditEvent(db, {
      actorId: input.actorId,
      action: "consultation_import.conflict",
      entityType: "consultation_import_run",
      entityId: activeRun.id,
      requestId: input.requestId,
      metadata: { status: "RUNNING", errorCode: "import_already_running" },
    });
    return {
      outcome: "conflict",
      summary: summaryFromRun(activeRun, await readLastSuccessfulAt(db)),
    };
  }

  const source = dependencies.sourceAdapter ?? createDefaultSourceAdapter(config);
  let batch: Awaited<ReturnType<ConsultationSourceAdapter["readRows"]>>;
  try {
    batch = await source.readRows({ maxRows: input.maxRows });
    if (
      typeof batch.sourceTab !== "string" ||
      batch.sourceTab.normalize("NFKC").trim().length === 0 ||
      batch.sourceTab.normalize("NFKC").trim().length > 200 ||
      !Array.isArray(batch.rows)
    ) {
      throw new ConsultationSourceError(CONSULTATION_SOURCE_ERROR_CODES.responseInvalid);
    }
    if (batch.rows.length > input.maxRows) {
      throw new ConsultationSourceError(CONSULTATION_SOURCE_ERROR_CODES.rowLimitExceeded);
    }
    batch = { ...batch, sourceTab: batch.sourceTab.normalize("NFKC").trim() };
  } catch (error) {
    const failedRun = await failReservedRun(db, run.id, input, sourceFailureCode(error), now());
    return {
      outcome: "failed",
      summary: summaryFromRun(failedRun, await readLastSuccessfulAt(db)),
    };
  }

  try {
    const result = await persistSourceBatch(
      db,
      run.id,
      input,
      config,
      batch.sourceTab,
      batch.rows,
      now(),
    );
    return {
      outcome: "completed",
      summary: summaryFromRun(result.run, result.lastSuccessfulAt),
    };
  } catch (error) {
    const errorCode =
      error instanceof ConsultationImportFailure
        ? error.code
        : "import_persistence_failed";
    const failedRun = await failReservedRun(
      db,
      run.id,
      input,
      errorCode,
      now(),
    );
    return {
      outcome: "failed",
      summary: summaryFromRun(failedRun, await readLastSuccessfulAt(db)),
    };
  }
}
