import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { recordAuditEvent } from "@/db/audit-core";
import { getDatabase } from "@/db/client";
import type { Database } from "@/db/client-core";
import {
  administrativeCycle,
  career,
  consultation,
  consultationDuplicateCandidate,
  consultationImportRun,
  consultationStaging,
  subject,
  tutor,
} from "@/db/schema";
import { normalizeName } from "@/features/tutors/tutor-validation";

import { importConsultationRows } from "./consultation-import-service";
import {
  consultationFiltersSchema,
  consultationImportOptionsSchema,
  consultationReviewDetailQuerySchema,
  consultationReviewDecisionSchema,
  consultationReviewDetailSchema,
  consultationWorkspaceSchema,
  type ConsultationFilters,
  type ConsultationImportOptions,
  type ConsultationReviewDecision,
  type ConsultationReviewDetailQuery,
  type ConsultationReviewDetail,
  type ConsultationWorkspace,
} from "./consultation-validation";

type ConsultationTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type AnomalyCode = (typeof consultationStaging.$inferSelect.anomalyFlags)[number];
type DuplicateDecisionInput = NonNullable<
  ConsultationReviewDecision["duplicateDecisions"]
>[number];

export const CONSULTATION_ERROR_CODES = {
  validationError: "validation_error",
  notFound: "not_found",
  staleReview: "stale_review",
  duplicateDecisionConflict: "duplicate_decision_conflict",
  canonicalDuplicateConflict: "canonical_duplicate_conflict",
  queryFailed: "query_failed",
  transactionFailed: "transaction_failed",
} as const;

export type ConsultationErrorCode =
  (typeof CONSULTATION_ERROR_CODES)[keyof typeof CONSULTATION_ERROR_CODES];

export class ConsultationServiceError extends Error {
  constructor(readonly code: ConsultationErrorCode) {
    super("The consultation operation could not safely complete.");
    this.name = "ConsultationServiceError";
  }
}

export type ConsultationRequestContext = {
  actorId: string;
  requestId?: string;
  ipAddress?: string;
};

export type ConsultationReviewResult = {
  outcome: "review_saved" | "consolidated" | "duplicate";
  review: ConsultationReviewDetail;
};

type CanonicalListRow = {
  id: string;
  stagingId: string;
  status: typeof consultationStaging.$inferSelect.status;
  reviewVersion: number;
  consultationDate: string;
  studentFirstName: string;
  studentLastName: string;
  studentContact: string | null;
  career: string;
  tutor: string;
  academicStage: string | null;
  modality: string | null;
  rawTopic: string | null;
  classification: typeof consultationStaging.$inferSelect.classification;
  subject: string | null;
};

function cleanText(value: string | null) {
  if (value === null) {
    return null;
  }

  const cleaned = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  return cleaned.length === 0 ? null : cleaned;
}

function listItem(row: CanonicalListRow) {
  return {
    ...row,
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function consultationSearch(value: string): SQL {
  const pattern = `%${escapeLike(value)}%`;

  return or(
    ilike(consultation.studentFirstName, pattern),
    ilike(consultation.studentLastName, pattern),
    ilike(career.name, pattern),
    ilike(tutor.firstName, pattern),
    ilike(tutor.lastName, pattern),
    ilike(consultation.rawTopic, pattern),
  )!;
}

function canonicalPredicates(filters: ConsultationFilters): SQL[] {
  const predicates: SQL[] = [];

  if (filters.status !== "ALL" && filters.status !== "CONSOLIDATED") {
    predicates.push(sql`false`);
  }
  if (filters.careerId !== undefined) {
    predicates.push(eq(consultation.careerId, filters.careerId));
  }
  if (filters.tutorId !== undefined) {
    predicates.push(eq(consultation.tutorId, filters.tutorId));
  }
  if (filters.fromDate !== undefined) {
    predicates.push(gte(consultation.consultationDate, filters.fromDate));
  }
  if (filters.toDate !== undefined) {
    predicates.push(lte(consultation.consultationDate, filters.toDate));
  }
  if (filters.classification !== undefined) {
    if (filters.classification === "PENDING_CLASSIFICATION") {
      predicates.push(sql`false`);
    } else {
      predicates.push(eq(consultation.classification, filters.classification));
    }
  }
  if (filters.search !== undefined) {
    predicates.push(consultationSearch(filters.search));
  }

  return predicates;
}

function reviewQueuePredicates(filters: ConsultationFilters): SQL[] {
  const predicates: SQL[] = [
    eq(consultationStaging.status, "PENDING_REVIEW"),
  ];

  if (filters.status !== "ALL" && filters.status !== "PENDING_REVIEW") {
    predicates.push(sql`false`);
  }
  if (filters.careerId !== undefined) {
    predicates.push(eq(consultationStaging.careerId, filters.careerId));
  }
  if (filters.tutorId !== undefined) {
    predicates.push(eq(consultationStaging.tutorId, filters.tutorId));
  }
  if (filters.fromDate !== undefined) {
    predicates.push(
      gte(consultationStaging.normalizedConsultationDate, filters.fromDate),
    );
  }
  if (filters.toDate !== undefined) {
    predicates.push(
      lte(consultationStaging.normalizedConsultationDate, filters.toDate),
    );
  }
  if (filters.classification !== undefined) {
    predicates.push(
      eq(consultationStaging.classification, filters.classification),
    );
  }
  if (filters.search !== undefined) {
    const pattern = `%${escapeLike(filters.search)}%`;
    predicates.push(
      or(
        ilike(consultationStaging.rawStudentFirstName, pattern),
        ilike(consultationStaging.rawStudentLastName, pattern),
        ilike(consultationStaging.normalizedCareer, pattern),
        ilike(consultationStaging.normalizedTutor, pattern),
        ilike(consultationStaging.rawTopic, pattern),
      )!,
    );
  }

  return predicates;
}

async function getImportSummary(db: Database) {
  const [latest] = await db
    .select()
    .from(consultationImportRun)
    .orderBy(desc(consultationImportRun.startedAt))
    .limit(1);
  const [successful] = await db
    .select({ completedAt: consultationImportRun.completedAt })
    .from(consultationImportRun)
    .where(inArray(consultationImportRun.status, ["SUCCEEDED", "PARTIAL"]))
    .orderBy(desc(consultationImportRun.completedAt))
    .limit(1);

  return {
    runId: latest?.id ?? null,
    status: latest?.status ?? null,
    startedAt: latest?.startedAt?.toISOString() ?? null,
    completedAt: latest?.completedAt?.toISOString() ?? null,
    lastSuccessfulAt: successful?.completedAt?.toISOString() ?? null,
    newRows: latest?.newRows ?? 0,
    alreadyProcessedRows: latest?.alreadyProcessedRows ?? 0,
    reviewRows: latest?.reviewRows ?? 0,
    duplicateCandidates: latest?.duplicateCandidates ?? 0,
    errorRows: latest?.errorRows ?? 0,
    errorCode: latest?.errorCode ?? null,
  };
}

export async function getConsultationWorkspace(
  db: Database = getDatabase(),
  rawFilters: unknown = {},
): Promise<ConsultationWorkspace> {
  const filters = consultationFiltersSchema.parse(rawFilters);

  try {
    const canonicalWhere = and(...canonicalPredicates(filters));
    const canonicalQuery = db
      .select({
        id: consultation.id,
        stagingId: consultation.stagingId,
        status: consultationStaging.status,
        reviewVersion: consultationStaging.reviewVersion,
        consultationDate: consultation.consultationDate,
        studentFirstName: consultation.studentFirstName,
        studentLastName: consultation.studentLastName,
        studentContact: consultation.studentContact,
        career: career.name,
        tutor: sql<string>`coalesce(${tutor.preferredDisplayName}, ${tutor.firstName} || ' ' || ${tutor.lastName})`,
        academicStage: consultation.academicStage,
        modality: consultation.modality,
        rawTopic: consultation.rawTopic,
        classification: consultation.classification,
        subject: subject.name,
      })
      .from(consultation)
      .innerJoin(
        consultationStaging,
        eq(consultationStaging.id, consultation.stagingId),
      )
      .innerJoin(career, eq(career.id, consultation.careerId))
      .innerJoin(tutor, eq(tutor.id, consultation.tutorId))
      .leftJoin(subject, eq(subject.id, consultation.subjectId));
    const canonicalRowsQuery = canonicalWhere
      ? canonicalQuery.where(canonicalWhere)
      : canonicalQuery;
    const [canonicalRows, totalResult, pendingResult, queueRows, importSummary] =
      await Promise.all([
        canonicalRowsQuery
          .orderBy(desc(consultation.consultationDate), desc(consultation.id))
          .limit(filters.limit)
          .offset(filters.offset),
        canonicalWhere
          ? db
              .select({ total: count() })
              .from(consultation)
              .innerJoin(
                consultationStaging,
                eq(consultationStaging.id, consultation.stagingId),
              )
              .innerJoin(career, eq(career.id, consultation.careerId))
              .innerJoin(tutor, eq(tutor.id, consultation.tutorId))
              .where(canonicalWhere)
          : db.select({ total: count() }).from(consultation),
        db
          .select({ total: count() })
          .from(consultationStaging)
          .where(eq(consultationStaging.status, "PENDING_REVIEW")),
        db
          .select({
            stagingId: consultationStaging.id,
            consultationDate: consultationStaging.normalizedConsultationDate,
            studentFirstName: consultationStaging.rawStudentFirstName,
            studentLastName: consultationStaging.rawStudentLastName,
            career: sql<string | null>`coalesce(${career.name}, ${consultationStaging.rawCareer})`,
            tutor: sql<string | null>`coalesce(${tutor.preferredDisplayName}, ${tutor.firstName} || ' ' || ${tutor.lastName}, ${consultationStaging.rawTutor})`,
            status: consultationStaging.status,
            classification: consultationStaging.classification,
            reviewVersion: consultationStaging.reviewVersion,
            anomalyFlags: consultationStaging.anomalyFlags,
            acknowledgedAnomalies: consultationStaging.acknowledgedAnomalies,
            hasCanonical: sql<boolean>`${consultation.id} IS NOT NULL`,
          })
          .from(consultationStaging)
          .leftJoin(career, eq(career.id, consultationStaging.careerId))
          .leftJoin(tutor, eq(tutor.id, consultationStaging.tutorId))
          .leftJoin(consultation, eq(consultation.stagingId, consultationStaging.id))
          .where(and(...reviewQueuePredicates(filters)))
          .orderBy(asc(consultationStaging.normalizedConsultationDate), asc(consultationStaging.id))
          .limit(filters.limit)
          .offset(filters.offset),
        getImportSummary(db),
      ]);
    const [total] = totalResult;
    const [pending] = pendingResult;

    return consultationWorkspaceSchema.parse({
      rows: canonicalRows.map((row) => listItem(row)),
      reviewQueue: queueRows,
      pendingReviewCount: pending?.total ?? 0,
      totalRows: total?.total ?? 0,
      import: importSummary,
      pagination: { limit: filters.limit, offset: filters.offset },
    });
  } catch (error) {
    if (error instanceof ConsultationServiceError) {
      throw error;
    }
    throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.queryFailed);
  }
}

async function canonicalForStaging(
  db: Database | ConsultationTransaction,
  stagingId: string,
) {
  const [row] = await db
    .select({
      id: consultation.id,
      stagingId: consultation.stagingId,
      status: consultationStaging.status,
      reviewVersion: consultationStaging.reviewVersion,
      consultationDate: consultation.consultationDate,
      studentFirstName: consultation.studentFirstName,
      studentLastName: consultation.studentLastName,
      studentContact: consultation.studentContact,
      career: career.name,
      tutor: sql<string>`coalesce(${tutor.preferredDisplayName}, ${tutor.firstName} || ' ' || ${tutor.lastName})`,
      academicStage: consultation.academicStage,
      modality: consultation.modality,
      rawTopic: consultation.rawTopic,
      classification: consultation.classification,
      subject: subject.name,
    })
    .from(consultation)
    .innerJoin(
      consultationStaging,
      eq(consultationStaging.id, consultation.stagingId),
    )
    .innerJoin(career, eq(career.id, consultation.careerId))
    .innerJoin(tutor, eq(tutor.id, consultation.tutorId))
    .leftJoin(subject, eq(subject.id, consultation.subjectId))
    .where(eq(consultation.stagingId, stagingId))
    .limit(1);

  return row === undefined ? null : listItem(row);
}

export async function getConsultationReview(
  db: Database = getDatabase(),
  stagingId: string,
  rawQuery: unknown = {},
): Promise<ConsultationReviewDetail> {
  const query = consultationReviewDetailQuerySchema.parse(rawQuery);
  try {
    const [row] = await db
      .select()
      .from(consultationStaging)
      .where(eq(consultationStaging.id, stagingId))
      .limit(1);

    if (row === undefined) {
      throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.notFound);
    }

    const [candidates, candidateCountRows, careers, tutors, subjects, canonical] = await Promise.all([
      db
        .select()
        .from(consultationDuplicateCandidate)
        .where(
          or(
            eq(consultationDuplicateCandidate.firstStagingId, stagingId),
            eq(consultationDuplicateCandidate.secondStagingId, stagingId),
          ),
        )
        .orderBy(
          asc(consultationDuplicateCandidate.createdAt),
          asc(consultationDuplicateCandidate.id),
        )
        .limit(query.candidateLimit)
        .offset(query.candidateOffset),
      db
        .select({ total: count() })
        .from(consultationDuplicateCandidate)
        .where(
          or(
            eq(consultationDuplicateCandidate.firstStagingId, stagingId),
            eq(consultationDuplicateCandidate.secondStagingId, stagingId),
          ),
        ),
      db
        .select({ id: career.id, name: career.name, status: career.status })
        .from(career)
        .orderBy(asc(career.name), asc(career.id))
        .limit(5000),
      db
        .select({
          id: tutor.id,
          name: sql<string>`coalesce(${tutor.preferredDisplayName}, ${tutor.firstName} || ' ' || ${tutor.lastName})`,
          status: tutor.status,
        })
        .from(tutor)
        .orderBy(asc(tutor.lastName), asc(tutor.firstName), asc(tutor.id))
        .limit(5000),
      db
        .select({
          id: subject.id,
          careerId: subject.careerId,
          name: subject.name,
          status: subject.status,
        })
        .from(subject)
        .orderBy(asc(subject.name), asc(subject.id))
        .limit(5000),
      canonicalForStaging(db, stagingId),
    ]);

    const peerIds = candidates.map((candidate) =>
      candidate.firstStagingId === stagingId
        ? candidate.secondStagingId
        : candidate.firstStagingId,
    );
    const peerRows = peerIds.length === 0
      ? []
      : await db
          .select({
            id: consultationStaging.id,
            consultationDate: consultationStaging.normalizedConsultationDate,
            studentFirstName: consultationStaging.rawStudentFirstName,
            studentLastName: consultationStaging.rawStudentLastName,
            career: sql<string | null>`coalesce(${career.name}, ${consultationStaging.rawCareer})`,
            tutor: sql<string | null>`coalesce(${tutor.preferredDisplayName}, ${tutor.firstName} || ' ' || ${tutor.lastName}, ${consultationStaging.rawTutor})`,
            status: consultationStaging.status,
            hasCanonical: sql<boolean>`${consultation.id} IS NOT NULL`,
          })
          .from(consultationStaging)
          .leftJoin(career, eq(career.id, consultationStaging.careerId))
          .leftJoin(tutor, eq(tutor.id, consultationStaging.tutorId))
          .leftJoin(consultation, eq(consultation.stagingId, consultationStaging.id))
          .where(inArray(consultationStaging.id, peerIds));
    const peers = new Map(peerRows.map((peer) => [peer.id, peer]));

    return consultationReviewDetailSchema.parse({
      id: row.id,
      status: row.status,
      classification: row.classification,
      reviewVersion: row.reviewVersion,
      sourceRow: {
        sourceRowKey: row.sourceRowKey,
        sourceFingerprint: row.sourceFingerprint,
        career: row.rawCareer,
        studentFirstName: row.rawStudentFirstName,
        studentLastName: row.rawStudentLastName,
        consultationDate: row.rawConsultationDate,
        tutor: row.rawTutor,
        academicStage: row.rawAcademicStage,
        modality: row.rawModality,
        topic: row.rawTopic,
        contact: row.rawContact,
      },
      normalized: {
        career: row.normalizedCareer,
        careerId: row.careerId,
        studentFirstName: row.normalizedStudentFirstName,
        studentLastName: row.normalizedStudentLastName,
        consultationDate: row.normalizedConsultationDate,
        tutor: row.normalizedTutor,
        tutorId: row.tutorId,
        academicStage: row.normalizedAcademicStage,
        modality: row.normalizedModality,
        topic: row.normalizedTopic,
        contact: row.normalizedContact,
      },
      anomalyFlags: row.anomalyFlags,
      acknowledgedAnomalies: row.acknowledgedAnomalies,
      canonical,
      duplicateCandidateCount: candidateCountRows[0]?.total ?? 0,
      duplicateCandidatesOffset: query.candidateOffset,
      duplicateCandidatesLimit: query.candidateLimit,
      duplicateCandidates: candidates.map((candidate) => {
        const peerId = candidate.firstStagingId === stagingId
          ? candidate.secondStagingId
          : candidate.firstStagingId;
        const peer = peers.get(peerId);
        if (peer === undefined) {
          throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.queryFailed);
        }
        return {
          candidateId: candidate.id,
          peerStagingId: peerId,
          decision: candidate.decision,
          duplicateStagingId: candidate.duplicateStagingId,
          isCurrentDuplicate: candidate.duplicateStagingId === stagingId,
          peer: {
            consultationDate: peer.consultationDate,
            studentFirstName: cleanText(peer.studentFirstName),
            studentLastName: cleanText(peer.studentLastName),
            career: cleanText(peer.career),
            tutor: cleanText(peer.tutor),
            status: peer.status,
            hasCanonical: peer.hasCanonical,
          },
        };
      }),
      references: { careers, tutors, subjects },
    });
  } catch (error) {
    if (error instanceof ConsultationServiceError) {
      throw error;
    }
    throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.queryFailed);
  }
}

function removeAnomalies(
  anomalies: AnomalyCode[],
  remove: AnomalyCode[],
) {
  const removed = new Set(remove);
  return anomalies.filter((anomaly) => !removed.has(anomaly));
}

async function duplicateDecisionsAlreadyApplied(
  tx: ConsultationTransaction,
  stagingId: string,
  decisions: DuplicateDecisionInput[],
) {
  for (const decision of decisions) {
    const [candidate] = await tx
      .select()
      .from(consultationDuplicateCandidate)
      .where(eq(consultationDuplicateCandidate.id, decision.candidateId))
      .for("update")
      .limit(1);
    if (
      candidate === undefined ||
      (candidate.firstStagingId !== stagingId &&
        candidate.secondStagingId !== stagingId) ||
      candidate.decision !== decision.decision ||
      candidate.duplicateStagingId !==
        (decision.decision === "DUPLICATE" ? stagingId : null)
    ) {
      return false;
    }
  }
  return true;
}

async function recordReviewDecision(
  tx: ConsultationTransaction,
  staging: typeof consultationStaging.$inferSelect,
  input: ConsultationReviewDecision,
  context: ConsultationRequestContext,
  now: Date,
) {
  if (
    staging.reviewedBy !== null &&
    staging.reviewedAt !== null &&
    (input.careerId === undefined || input.careerId === staging.careerId) &&
    (input.tutorId === undefined || input.tutorId === staging.tutorId) &&
    (input.consultationDate === undefined ||
      input.consultationDate === staging.normalizedConsultationDate) &&
    (input.classification === undefined ||
      input.classification === staging.classification) &&
    (input.subjectId === undefined || input.subjectId === staging.subjectId) &&
    (input.acknowledgedAnomalies === undefined ||
      [...input.acknowledgedAnomalies].sort().join(",") ===
        [...staging.acknowledgedAnomalies].sort().join(",")) &&
    await duplicateDecisionsAlreadyApplied(
      tx,
      staging.id,
      [...(input.duplicateDecisions ?? [])].sort((left, right) =>
        left.candidateId.localeCompare(right.candidateId),
      ),
    )
  ) {
    return staging.status;
  }
  if (staging.reviewVersion !== input.expectedVersion) {
    throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.staleReview);
  }

  const careerId = input.careerId ?? staging.careerId;
  const tutorId = input.tutorId ?? staging.tutorId;
  const consultationDate = input.consultationDate ?? staging.normalizedConsultationDate;
  const classification = input.classification ?? staging.classification;
  let selectedCareerName: string | null = null;
  let selectedTutorName: string | null = null;

  if (input.careerId !== undefined) {
    const [selectedCareer] = await tx
      .select({ name: career.name })
      .from(career)
      .where(eq(career.id, input.careerId))
      .limit(1);
    if (selectedCareer === undefined) {
      throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.notFound);
    }
    selectedCareerName = selectedCareer.name;
  }
  if (input.tutorId !== undefined) {
    const [selectedTutor] = await tx
      .select({
        firstName: tutor.firstName,
        lastName: tutor.lastName,
        preferredDisplayName: tutor.preferredDisplayName,
      })
      .from(tutor)
      .where(eq(tutor.id, input.tutorId))
      .limit(1);
    if (selectedTutor === undefined) {
      throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.notFound);
    }
    selectedTutorName =
      selectedTutor.preferredDisplayName ?? `${selectedTutor.firstName} ${selectedTutor.lastName}`;
  }

  let subjectId = staging.subjectId;
  if (classification === "SUBJECT") {
    subjectId = input.subjectId === undefined ? staging.subjectId : input.subjectId;
    if (subjectId === null) {
      throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.validationError);
    }
    const [selectedSubject] = await tx
      .select({ id: subject.id, careerId: subject.careerId })
      .from(subject)
      .where(eq(subject.id, subjectId))
      .limit(1);
    if (selectedSubject === undefined) {
      throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.notFound);
    }
    if (careerId === null || selectedSubject.careerId !== careerId) {
      throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.validationError);
    }
  } else {
    subjectId = null;
  }

  const acknowledgedAnomalies = input.acknowledgedAnomalies ?? staging.acknowledgedAnomalies;
  if (acknowledgedAnomalies.some((anomaly) => !staging.anomalyFlags.includes(anomaly))) {
    throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.validationError);
  }

  const duplicateDecisionChanges: string[] = [];
  const requestedDuplicateDecisions = [...(input.duplicateDecisions ?? [])].sort(
    (left, right) => left.candidateId.localeCompare(right.candidateId),
  );
  for (const requested of requestedDuplicateDecisions) {
    const [candidate] = await tx
      .select()
      .from(consultationDuplicateCandidate)
      .where(eq(consultationDuplicateCandidate.id, requested.candidateId))
      .for("update")
      .limit(1);
    if (
      candidate === undefined ||
      (candidate.firstStagingId !== staging.id && candidate.secondStagingId !== staging.id)
    ) {
      throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.notFound);
    }
    if (requested.decision === "DUPLICATE" && staging.status === "CONSOLIDATED") {
      throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.canonicalDuplicateConflict);
    }

    const duplicateStagingId = requested.decision === "DUPLICATE" ? staging.id : null;
    if (
      requested.decision === "DUPLICATE" &&
      candidate.decision === "DUPLICATE" &&
      candidate.duplicateStagingId !== null &&
      candidate.duplicateStagingId !== staging.id
    ) {
      throw new ConsultationServiceError(
        CONSULTATION_ERROR_CODES.duplicateDecisionConflict,
      );
    }
    if (
      candidate.decision === requested.decision &&
      candidate.duplicateStagingId === duplicateStagingId
    ) {
      continue;
    }
    await tx
      .update(consultationDuplicateCandidate)
      .set({
        decision: requested.decision,
        duplicateStagingId,
        decidedBy: context.actorId,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(consultationDuplicateCandidate.id, candidate.id));
    duplicateDecisionChanges.push(candidate.id);
  }

  const candidates = await tx
    .select()
    .from(consultationDuplicateCandidate)
    .where(
      or(
        eq(consultationDuplicateCandidate.firstStagingId, staging.id),
        eq(consultationDuplicateCandidate.secondStagingId, staging.id),
      ),
    );
  const hasPendingDuplicate = candidates.some(
    (candidate) =>
      candidate.decision === "PENDING" ||
      (candidate.decision === "DUPLICATE" && candidate.duplicateStagingId === null),
  );
  const currentIsDuplicate = candidates.some(
    (candidate) =>
      candidate.decision === "DUPLICATE" && candidate.duplicateStagingId === staging.id,
  );
  const resolvedAnomalies = removeAnomalies(staging.anomalyFlags, [
    ...(input.careerId === undefined
      ? []
      : ["MISSING_CAREER", "UNRESOLVED_CAREER", "AMBIGUOUS_CAREER"] as AnomalyCode[]),
    ...(input.tutorId === undefined
      ? []
      : ["MISSING_TUTOR", "UNRESOLVED_TUTOR", "AMBIGUOUS_TUTOR"] as AnomalyCode[]),
    ...(input.consultationDate === undefined ? [] : ["INVALID_CONSULTATION_DATE"] as AnomalyCode[]),
    ...(!hasPendingDuplicate ? ["POSSIBLE_DUPLICATE"] as AnomalyCode[] : []),
  ]);
  const blockers = resolvedAnomalies.filter(
    (anomaly) => !acknowledgedAnomalies.includes(anomaly),
  );
  const hasRequiredCanonicalValues =
    careerId !== null &&
    tutorId !== null &&
    consultationDate !== null &&
    cleanText(staging.rawStudentFirstName) !== null &&
    cleanText(staging.rawStudentLastName) !== null;

  if (
    currentIsDuplicate &&
    (await canonicalForStaging(tx, staging.id)) !== null
  ) {
    throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.canonicalDuplicateConflict);
  }

  let nextStatus: typeof consultationStaging.$inferSelect.status;
  if (currentIsDuplicate && !hasPendingDuplicate) {
    nextStatus = "DUPLICATE";
  } else if (
    classification !== "PENDING_CLASSIFICATION" &&
    !hasPendingDuplicate &&
    blockers.length === 0 &&
    hasRequiredCanonicalValues
  ) {
    nextStatus = "CONSOLIDATED";
  } else {
    nextStatus = "PENDING_REVIEW";
  }

  const normalizedCareer = selectedCareerName === null
    ? staging.normalizedCareer
    : normalizeName(selectedCareerName);
  const normalizedTutor = selectedTutorName === null
    ? staging.normalizedTutor
    : normalizeName(selectedTutorName);

  const [updated] = await tx
    .update(consultationStaging)
    .set({
      careerId,
      tutorId,
      normalizedCareer,
      normalizedTutor,
      normalizedConsultationDate: consultationDate,
      anomalyFlags: resolvedAnomalies,
      acknowledgedAnomalies,
      classification,
      subjectId,
      status: nextStatus,
      reviewedBy: context.actorId,
      reviewedAt: now,
      reviewVersion: staging.reviewVersion + 1,
      updatedAt: now,
    })
    .where(
      and(
        eq(consultationStaging.id, staging.id),
        eq(consultationStaging.reviewVersion, input.expectedVersion),
      ),
    )
    .returning();

  if (updated === undefined) {
    throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.staleReview);
  }

  const changedFields = [
    ...(input.careerId === undefined ? [] : ["careerId"]),
    ...(input.tutorId === undefined ? [] : ["tutorId"]),
    ...(input.consultationDate === undefined ? [] : ["consultationDate"]),
    ...(input.classification === undefined ? [] : ["classification"]),
    ...(input.subjectId === undefined ? [] : ["subjectId"]),
    ...(input.acknowledgedAnomalies === undefined ? [] : ["acknowledgedAnomalies"]),
    ...(duplicateDecisionChanges.length === 0 ? [] : ["duplicateDecisions"]),
  ];
  await recordAuditEvent(tx, {
    actorId: context.actorId,
    action: "consultation_review.decided",
    entityType: "consultation_staging",
    entityId: staging.id,
    requestId: context.requestId,
    ipAddress: context.ipAddress,
    metadata: {
      fromStatus: staging.status,
      toStatus: nextStatus,
      reviewVersion: updated.reviewVersion,
      changedFields,
    },
  });
  for (const candidateId of duplicateDecisionChanges) {
    const candidate = candidates.find((item) => item.id === candidateId);
    const requested = requestedDuplicateDecisions.find(
      (item) => item.candidateId === candidateId,
    );
    if (candidate === undefined || requested === undefined) {
      continue;
    }
    await recordAuditEvent(tx, {
      actorId: context.actorId,
      action: "consultation_duplicate.decided",
      entityType: "consultation_duplicate_candidate",
      entityId: candidateId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      metadata: { decision: requested.decision },
    });
  }

  if (nextStatus === "CONSOLIDATED") {
    const [cycle] = await tx
      .select({ id: administrativeCycle.id })
      .from(administrativeCycle)
      .where(
        and(
          lte(administrativeCycle.startDate, consultationDate!),
          gte(administrativeCycle.endDate, consultationDate!),
        ),
      )
      .orderBy(desc(administrativeCycle.startDate), asc(administrativeCycle.id))
      .limit(1);
    const firstName = cleanText(staging.rawStudentFirstName);
    const lastName = cleanText(staging.rawStudentLastName);
    if (firstName === null || lastName === null) {
      throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.validationError);
    }
    const [canonical] = await tx
      .insert(consultation)
      .values({
        stagingId: staging.id,
        cycleId: cycle?.id ?? null,
        consultationDate: consultationDate!,
        studentFirstName: firstName,
        studentLastName: lastName,
        studentContact: cleanText(staging.rawContact),
        careerId: careerId!,
        tutorId: tutorId!,
        academicStage: cleanText(staging.rawAcademicStage),
        modality: cleanText(staging.rawModality),
        rawTopic: cleanText(staging.rawTopic),
        classification: classification as "SUBJECT" | "GENERAL",
        subjectId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: consultation.stagingId,
        set: {
          cycleId: cycle?.id ?? null,
          consultationDate: consultationDate!,
          studentFirstName: firstName,
          studentLastName: lastName,
          studentContact: cleanText(staging.rawContact),
          careerId: careerId!,
          tutorId: tutorId!,
          academicStage: cleanText(staging.rawAcademicStage),
          modality: cleanText(staging.rawModality),
          rawTopic: cleanText(staging.rawTopic),
          classification: classification as "SUBJECT" | "GENERAL",
          subjectId,
          updatedAt: now,
        },
      })
      .returning({ id: consultation.id });

    if (canonical === undefined) {
      throw new Error("Consultation consolidation did not return a canonical row.");
    }
    await recordAuditEvent(tx, {
      actorId: context.actorId,
      action: "consultation.consolidated",
      entityType: "consultation",
      entityId: canonical.id,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      metadata: { stagingId: staging.id, classification },
    });
  }

  return nextStatus;
}

export async function decideConsultationReview(
  db: Database = getDatabase(),
  stagingId: string,
  rawDecision: unknown,
  context: ConsultationRequestContext,
): Promise<ConsultationReviewResult> {
  const input = consultationReviewDecisionSchema.parse(rawDecision);
  const actorId = context.actorId.trim();
  if (actorId.length === 0 || actorId.length > 255) {
    throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.validationError);
  }

  let status: typeof consultationStaging.$inferSelect.status;
  try {
    status = await db.transaction(async (tx) => {
      const [staging] = await tx
        .select()
        .from(consultationStaging)
        .where(eq(consultationStaging.id, stagingId))
        .for("update")
        .limit(1);
      if (staging === undefined) {
        throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.notFound);
      }
      return recordReviewDecision(tx, staging, input, { ...context, actorId }, new Date());
    });
  } catch (error) {
    if (error instanceof ConsultationServiceError) {
      throw error;
    }
    throw new ConsultationServiceError(CONSULTATION_ERROR_CODES.transactionFailed);
  }

  const review = await getConsultationReview(db, stagingId);
  return {
    outcome:
      status === "CONSOLIDATED"
        ? "consolidated"
        : status === "DUPLICATE"
          ? "duplicate"
          : "review_saved",
    review,
  };
}

export async function runConsultationImport(
  db: Database,
  options: ConsultationImportOptions,
  context: ConsultationRequestContext,
) {
  return importConsultationRows(
    {
      ...consultationImportOptionsSchema.parse(options),
      actorId: context.actorId,
      requestId: context.requestId,
    },
    { db },
  );
}

export function parseConsultationFilters(input: unknown) {
  return consultationFiltersSchema.parse(input);
}

export function parseConsultationReviewQuery(input: unknown): ConsultationReviewDetailQuery {
  return consultationReviewDetailQuerySchema.parse(input);
}

export function parseConsultationImportOptions(input: unknown) {
  return consultationImportOptionsSchema.parse(input);
}
