import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";
import { and, asc, eq, sql } from "drizzle-orm";

import { getLeastUsedCareerColor } from "../src/shared/career-color";
import { parseAuditEventInput } from "../src/db/audit-validation";
import { createDatabaseHandle, type Database } from "../src/db/client-core";
import {
  administrativeCycle,
  auditEvent,
  career,
  hourCategory,
  hourMovement,
  scholarshipReference,
  scheduleAssignment,
  schedulePlan,
  subject,
  tutor,
  tutorCycleMembership,
  tutorSubject,
  user,
} from "../src/db/schema";
import {
  createScheduleAssignmentInputSchema,
  createSchedulePlanInputSchema,
  dateOnlySchema,
  parseScheduleInput,
} from "../src/features/schedules/schedule-validation";
import {
  currentCycleMembershipSchema,
  normalizeCatalogName,
  normalizeInstitutionalIdentifier,
  parseCreateCareerInput,
  parseCreateScholarshipReferenceInput,
  parseCreateSubjectInput,
  parseCreateTutorInput,
  tutorIdSchema,
  tutorSubjectAssignmentsSchema,
} from "../src/features/tutors/tutor-validation";

const IMPORT_NAMESPACE = "8d07178c-9b8a-5e15-a826-3344c4a9242f";
const DEFAULT_INPUT_DIRECTORY = path.resolve("local-docs/keep/data/build/m1");

type SourceLocation = { file: string; line: number };
type SourceRow = SourceLocation & { values: Record<string, string> };
type CsvSpec = { key: string; file: string; headers: readonly string[] };

const CSV_SPECS = [
  { key: "cycles", file: "01_cycle.csv", headers: ["import_key", "name", "start_date", "end_date", "status"] },
  { key: "careers", file: "02_careers.csv", headers: ["import_key", "name", "status"] },
  { key: "subjects", file: "03_subjects.csv", headers: ["import_key", "career_key", "name", "aliases", "status"] },
  { key: "hourCategories", file: "04_hour_categories.csv", headers: ["import_key", "name", "activity_kind", "status"] },
  { key: "scholarshipReferences", file: "05_scholarship_references.csv", headers: ["import_key", "type", "known_required_hours", "notes", "status"] },
  { key: "tutors", file: "06_tutors.csv", headers: ["import_key", "first_name", "last_name", "preferred_display_name", "institutional_identifier", "primary_career_key", "status"] },
  { key: "tutorCycleMemberships", file: "07_tutor_cycle_memberships.csv", headers: ["tutor_key", "cycle_key", "scholarship_reference_key"] },
  { key: "tutorSubjects", file: "08_tutor_subjects.csv", headers: ["tutor_key", "subject_key"] },
  { key: "schedulePlans", file: "09_schedule_plans.csv", headers: ["import_key", "cycle_key", "name", "kind", "valid_from", "valid_to", "status"] },
  { key: "scheduleAssignments", file: "10_schedule_assignments.csv", headers: ["import_key", "plan_key", "tutor_key", "pattern", "weekday", "start_minutes", "end_minutes", "kind", "modality", "status"] },
  { key: "hourMovements", file: "11_hour_movements.csv", headers: ["import_key", "cycle_key", "tutor_key", "category_key", "direction", "duration_minutes", "movement_date", "note"] },
] as const satisfies readonly CsvSpec[];

type DatasetName = (typeof CSV_SPECS)[number]["key"];
type SourcePackage = Record<DatasetName, SourceRow[]>;

export type SyncCount = { created: number; updated: number; unchanged: number };
export type ImportCounts = Record<DatasetName, SyncCount>;

type PreparedEntity = { id: string; values: Record<string, unknown>; source: SourceLocation };
type PreparedMembership = {
  tutorId: string;
  cycleId: string;
  scholarshipReferenceId: string | null;
  source: SourceLocation;
};
type PreparedTutorSubject = { tutorId: string; subjectId: string; source: SourceLocation };
type PreparedImport = {
  cycles: PreparedEntity[];
  careers: PreparedEntity[];
  subjects: PreparedEntity[];
  hourCategories: PreparedEntity[];
  scholarshipReferences: PreparedEntity[];
  tutors: PreparedEntity[];
  tutorCycleMemberships: PreparedMembership[];
  tutorSubjects: PreparedTutorSubject[];
  schedulePlans: PreparedEntity[];
  scheduleAssignments: PreparedEntity[];
  hourMovements: PreparedEntity[];
};
type PackageResult = { data: PreparedImport | null; errors: string[] };
type CsvRecord = { line: number; cells: string[] };
type CsvParseResult = { records: CsvRecord[] };
type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

type EntitySyncAdapter = {
  find: (transaction: DatabaseTransaction, id: string) => Promise<Record<string, unknown> | undefined>;
  insert: (transaction: DatabaseTransaction, id: string, values: Record<string, unknown>) => Promise<void>;
  update: (transaction: DatabaseTransaction, id: string, values: Record<string, unknown>) => Promise<void>;
};

class CsvInputError extends Error {
  readonly line: number;
  constructor(line: number, message: string) {
    super(message);
    this.line = line;
  }
}

class SafeImportError extends Error {}

export function uuidV5(name: string) {
  const namespaceBytes = Buffer.from(IMPORT_NAMESPACE.replaceAll("-", ""), "hex");
  const hash = createHash("sha1").update(namespaceBytes).update(name, "utf8").digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

function parseDelimitedText(text: string, delimiter: string): CsvParseResult {
  const contents = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let value = "";
  let quoted = false;
  let afterQuote = false;
  let line = 1;
  let rowLine = 1;

  const finishRecord = () => {
    records.push({ line: rowLine, cells: [...cells, value.trim()] });
    cells = [];
    value = "";
    afterQuote = false;
    rowLine = line + 1;
  };

  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index]!;
    if (quoted) {
      if (character === '"') {
        if (contents[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        value += character;
        if (character === "\n") line += 1;
      }
      continue;
    }
    if (afterQuote && character !== delimiter && character !== "\r" && character !== "\n") {
      throw new CsvInputError(line, "unexpected character after a quoted value");
    }
    if (character === '"' && value.length === 0) {
      quoted = true;
      continue;
    }
    if (character === delimiter) {
      cells.push(value.trim());
      value = "";
      afterQuote = false;
      continue;
    }
    if (character === "\r" || character === "\n") {
      finishRecord();
      if (character === "\r" && contents[index + 1] === "\n") index += 1;
      line += 1;
      rowLine = line;
      continue;
    }
    if (character === '"') throw new CsvInputError(line, "a quote must enclose the whole field");
    value += character;
  }

  if (quoted) throw new CsvInputError(rowLine, "a quoted field is not closed");
  if (value.length > 0 || cells.length > 0 || afterQuote) finishRecord();
  return { records };
}

function emptySourcePackage(): SourcePackage {
  return Object.fromEntries(CSV_SPECS.map((spec) => [spec.key, []])) as unknown as SourcePackage;
}

function formatLocation(source: SourceLocation) {
  return source.file + ":" + source.line;
}

function readSourceTable(
  file: string,
  contents: string,
  expectedHeaders: readonly string[],
  issues: string[],
): SourceRow[] {
  let parsed: CsvParseResult;
  try {
    parsed = parseDelimitedText(contents, ";");
  } catch (error) {
    const line = error instanceof CsvInputError ? error.line : 1;
    issues.push(file + ":" + line + ": invalid CSV syntax");
    return [];
  }

  const nonBlank = parsed.records.filter((record) => record.cells.length !== 1 || record.cells[0] !== "");
  const header = nonBlank[0];
  if (header === undefined) {
    issues.push(file + ":1: CSV header is missing");
    return [];
  }

  const headers = header.cells;
  if (headers.some((item, index) => headers.indexOf(item) !== index)) {
    issues.push(file + ":1: CSV contains duplicate column names");
    return [];
  }
  if (headers.length !== expectedHeaders.length || headers.some((item, index) => item !== expectedHeaders[index])) {
    issues.push(file + ":1: header does not match the required import format");
    return [];
  }

  const rows: SourceRow[] = [];
  for (const record of nonBlank.slice(1)) {
    if (record.cells.length !== headers.length) {
      issues.push(file + ":" + record.line + ": column count does not match the header");
      continue;
    }
    rows.push({
      file,
      line: record.line,
      values: Object.fromEntries(headers.map((column, index) => [column, record.cells[index] ?? ""])),
    });
  }
  return rows;
}

export async function loadInitialDataPackage(directory = DEFAULT_INPUT_DIRECTORY): Promise<PackageResult> {
  const source = emptySourcePackage();
  const errors: string[] = [];

  for (const spec of CSV_SPECS) {
    let contents: string;
    try {
      contents = await readFile(path.join(directory, spec.file), "utf8");
    } catch {
      errors.push(spec.file + ":1: file is missing or unreadable");
      continue;
    }
    source[spec.key] = readSourceTable(spec.file, contents, spec.headers, errors);
  }

  const data = prepareImport(source, errors);
  return { data, errors };
}

function valueFor(row: SourceRow, key: string) {
  return row.values[key] ?? "";
}

function cleanDisplayText(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function reportIssue(row: SourceRow, field: string, message: string, issues: string[]) {
  issues.push(formatLocation(row) + ": " + field + " " + message);
}

function requiredText(row: SourceRow, field: string, issues: string[], maxLength = 2_000) {
  const value = valueFor(row, field).trim();
  if (value.length === 0) {
    reportIssue(row, field, "is required", issues);
    return undefined;
  }
  if (value.length > maxLength) {
    reportIssue(row, field, "is too long", issues);
    return undefined;
  }
  return value;
}

function optionalText(row: SourceRow, field: string, issues: string[], maxLength = 2_000) {
  const value = valueFor(row, field).trim();
  if (value.length === 0) return null;
  if (value.length > maxLength) {
    reportIssue(row, field, "is too long", issues);
    return undefined;
  }
  return value;
}

function integerValue(
  row: SourceRow,
  field: string,
  issues: string[],
  options: { optional?: boolean; minimum?: number; maximum?: number } = {},
) {
  const value = valueFor(row, field).trim();
  if (value.length === 0 && options.optional) return null;
  if (!/^-?\d+$/.test(value)) {
    reportIssue(row, field, "must be an integer", issues);
    return undefined;
  }
  const number = Number(value);
  if (
    !Number.isSafeInteger(number) ||
    (options.minimum !== undefined && number < options.minimum) ||
    (options.maximum !== undefined && number > options.maximum)
  ) {
    reportIssue(row, field, "is outside the supported range", issues);
    return undefined;
  }
  return number;
}

function enumValue<T extends string>(row: SourceRow, field: string, allowed: readonly T[], issues: string[]) {
  const value = valueFor(row, field).trim();
  if (!allowed.includes(value as T)) {
    reportIssue(row, field, "has an unsupported value", issues);
    return undefined;
  }
  return value as T;
}

function parsedValue<T>(row: SourceRow, field: string, issues: string[], parse: () => T) {
  try {
    return parse();
  } catch {
    reportIssue(row, field, "is invalid", issues);
    return undefined;
  }
}

function createEntityIds(
  rows: SourceRow[],
  label: string,
  issues: string[],
  seenKeys: Map<string, SourceLocation>,
) {
  const ids = new Map<string, string>();
  for (const row of rows) {
    const key = requiredText(row, "import_key", issues, 255);
    if (key === undefined) continue;
    if (seenKeys.has(key)) {
      reportIssue(row, "import_key", "must be unique across the package", issues);
      continue;
    }
    seenKeys.set(key, row);
    if (ids.has(key)) {
      reportIssue(row, "import_key", "must be unique in " + label, issues);
      continue;
    }
    ids.set(key, uuidV5(key));
  }
  return ids;
}

function referencedId(row: SourceRow, field: string, idMap: Map<string, string>, issues: string[]) {
  const key = requiredText(row, field, issues, 255);
  if (key === undefined) return undefined;
  const id = idMap.get(key);
  if (id === undefined) reportIssue(row, field, "does not reference an imported record", issues);
  return id;
}

function parseAliases(value: string, canonicalName: string) {
  const canonical = normalizeCatalogName(canonicalName);
  const seen = new Set<string>([canonical]);
  const aliases: string[] = [];
  for (const item of value.split("|")) {
    const alias = item.trim();
    if (!alias) continue;
    const normalized = normalizeCatalogName(alias);
    if (!seen.has(normalized)) {
      aliases.push(alias);
      seen.add(normalized);
    }
  }
  return aliases;
}

function prepareImport(source: SourcePackage, issues: string[]): PreparedImport {
  const seenKeys = new Map<string, SourceLocation>();
  const cycleIds = createEntityIds(source.cycles, "cycles", issues, seenKeys);
  const careerIds = createEntityIds(source.careers, "careers", issues, seenKeys);
  const subjectIds = createEntityIds(source.subjects, "subjects", issues, seenKeys);
  const hourCategoryIds = createEntityIds(source.hourCategories, "hour categories", issues, seenKeys);
  const scholarshipIds = createEntityIds(source.scholarshipReferences, "scholarship references", issues, seenKeys);
  const tutorIds = createEntityIds(source.tutors, "tutors", issues, seenKeys);
  const schedulePlanIds = createEntityIds(source.schedulePlans, "schedule plans", issues, seenKeys);
  const scheduleAssignmentIds = createEntityIds(source.scheduleAssignments, "schedule assignments", issues, seenKeys);
  const hourMovementIds = createEntityIds(source.hourMovements, "hour movements", issues, seenKeys);

  if (source.cycles.length === 0) issues.push("01_cycle.csv:1: at least one cycle is required");
  if (source.careers.length === 0) issues.push("02_careers.csv:1: at least one career is required");

  const cycles: PreparedEntity[] = [];
  const openCycleStatuses: Array<string | undefined> = [];
  for (const row of source.cycles) {
    const id = cycleIds.get(valueFor(row, "import_key"));
    const name = requiredText(row, "name", issues, 200);
    const startDateValue = requiredText(row, "start_date", issues, 10);
    const endDateValue = requiredText(row, "end_date", issues, 10);
    const startDate = startDateValue === undefined
      ? undefined
      : parsedValue(row, "start_date", issues, () => dateOnlySchema.parse(startDateValue));
    const endDate = endDateValue === undefined
      ? undefined
      : parsedValue(row, "end_date", issues, () => dateOnlySchema.parse(endDateValue));
    const status = enumValue(row, "status", ["OPEN", "CLOSED"] as const, issues);
    openCycleStatuses.push(status);
    if (startDate !== undefined && endDate !== undefined && startDate > endDate) {
      reportIssue(row, "end_date", "must be on or after start_date", issues);
    }
    if (id !== undefined && name !== undefined && startDate !== undefined && endDate !== undefined &&
      status !== undefined && startDate <= endDate) {
      cycles.push({
        id,
        source: { file: row.file, line: row.line },
        values: { name: cleanDisplayText(name), startDate, endDate, status },
      });
    }
  }
  if (openCycleStatuses.filter((status) => status === "OPEN").length !== 1 && source.cycles.length > 0) {
    issues.push("01_cycle.csv:1: exactly one cycle must have status OPEN");
  }

  const careers: PreparedEntity[] = [];
  for (const row of source.careers) {
    const id = careerIds.get(valueFor(row, "import_key"));
    const name = requiredText(row, "name", issues, 200);
    const status = enumValue(row, "status", ["ACTIVE", "INACTIVE"] as const, issues);
    if (id !== undefined && name !== undefined && status !== undefined) {
      const parsed = parsedValue(row, "name", issues, () => parseCreateCareerInput({ name }));
      if (parsed !== undefined) {
        careers.push({
          id,
          source: { file: row.file, line: row.line },
          values: {
            name: cleanDisplayText(parsed.name),
            normalizedName: cleanDisplayText(parsed.name).toLocaleLowerCase("es-AR"),
            status,
          },
        });
      }
    }
  }

  const subjects: PreparedEntity[] = [];
  for (const row of source.subjects) {
    const id = subjectIds.get(valueFor(row, "import_key"));
    const careerId = referencedId(row, "career_key", careerIds, issues);
    const name = requiredText(row, "name", issues, 200);
    const status = enumValue(row, "status", ["ACTIVE", "INACTIVE"] as const, issues);
    if (id !== undefined && careerId !== undefined && name !== undefined && status !== undefined) {
      const parsed = parsedValue(row, "name", issues, () => parseCreateSubjectInput({ careerId, name }));
      if (parsed !== undefined) {
        subjects.push({
          id,
          source: { file: row.file, line: row.line },
          values: {
            careerId: parsed.careerId,
            name: cleanDisplayText(parsed.name),
            normalizedName: cleanDisplayText(parsed.name).toLocaleLowerCase("es-AR"),
            aliases: parseAliases(valueFor(row, "aliases"), parsed.name),
            status,
          },
        });
      }
    }
  }

  const hourCategories: PreparedEntity[] = [];
  for (const row of source.hourCategories) {
    const id = hourCategoryIds.get(valueFor(row, "import_key"));
    const name = requiredText(row, "name", issues, 200);
    const status = enumValue(row, "status", ["ACTIVE", "INACTIVE"] as const, issues);
    const kindText = optionalText(row, "activity_kind", issues, 80);
    let activityKind: string | null | undefined = kindText;
    if (kindText !== null && kindText !== undefined) {
      activityKind = enumValue(
        { ...row, values: { ...row.values, activity_kind: kindText } },
        "activity_kind",
        ["MEETING", "WORKSHOP", "EXTRAORDINARY", "RECOVERY"] as const,
        issues,
      );
    }
    if (id !== undefined && name !== undefined && status !== undefined && activityKind !== undefined) {
      hourCategories.push({
        id,
        source: { file: row.file, line: row.line },
        values: {
          name: cleanDisplayText(name),
          normalizedName: cleanDisplayText(name).toLocaleLowerCase("es-AR"),
          activityKind,
          status,
        },
      });
    }
  }

  const scholarshipReferences: PreparedEntity[] = [];
  for (const row of source.scholarshipReferences) {
    const id = scholarshipIds.get(valueFor(row, "import_key"));
    const type = requiredText(row, "type", issues, 200);
    const knownRequiredHours = integerValue(row, "known_required_hours", issues, {
      optional: true,
      minimum: 0,
      maximum: 100_000,
    });
    const notes = optionalText(row, "notes", issues, 2_000);
    const status = enumValue(row, "status", ["ACTIVE", "INACTIVE"] as const, issues);
    if (id !== undefined && type !== undefined && knownRequiredHours !== undefined &&
      notes !== undefined && status !== undefined) {
      const parsed = parsedValue(row, "type", issues, () =>
        parseCreateScholarshipReferenceInput({ type, knownRequiredHours, notes }),
      );
      if (parsed !== undefined) {
        scholarshipReferences.push({
          id,
          source: { file: row.file, line: row.line },
          values: {
            type: cleanDisplayText(parsed.type),
            normalizedType: cleanDisplayText(parsed.type).toLocaleLowerCase("es-AR"),
            knownRequiredHours: parsed.knownRequiredHours,
            notes: parsed.notes,
            status,
          },
        });
      }
    }
  }

  const tutors: PreparedEntity[] = [];
  const firstCycleId = cycleIds.values().next().value as string | undefined;
  for (const row of source.tutors) {
    const id = tutorIds.get(valueFor(row, "import_key"));
    const firstName = requiredText(row, "first_name", issues, 200);
    const lastName = optionalText(row, "last_name", issues, 200);
    const preferredDisplayName = optionalText(row, "preferred_display_name", issues, 200);
    const identifier = optionalText(row, "institutional_identifier", issues, 100);
    const primaryCareerId = referencedId(row, "primary_career_key", careerIds, issues);
    const status = enumValue(row, "status", ["ACTIVE", "INACTIVE"] as const, issues);
    if (id !== undefined && firstName !== undefined && lastName !== undefined &&
      preferredDisplayName !== undefined && identifier !== undefined &&
      primaryCareerId !== undefined && status !== undefined && firstCycleId !== undefined) {
      const parsed = parsedValue(row, "first_name", issues, () => parseCreateTutorInput({
        firstName,
        lastName,
        preferredDisplayName,
        institutionalIdentifier: identifier,
        primaryCareerId,
        subjectIds: [],
        cycleId: firstCycleId,
        scholarshipReferenceId: null,
      }));
      if (parsed !== undefined) {
        tutors.push({
          id,
          source: { file: row.file, line: row.line },
          values: {
            firstName: cleanDisplayText(parsed.firstName),
            lastName: parsed.lastName == null ? null : cleanDisplayText(parsed.lastName),
            preferredDisplayName: parsed.preferredDisplayName == null
              ? null
              : cleanDisplayText(parsed.preferredDisplayName),
            institutionalIdentifier: parsed.institutionalIdentifier ?? null,
            normalizedInstitutionalIdentifier: parsed.institutionalIdentifier == null
              ? null
              : normalizeInstitutionalIdentifier(parsed.institutionalIdentifier),
            primaryCareerId: parsed.primaryCareerId,
            status,
          },
        });
      }
    }
  }

  const tutorCycleMemberships: PreparedMembership[] = [];
  const membershipKeys = new Set<string>();
  for (const row of source.tutorCycleMemberships) {
    const tutorId = referencedId(row, "tutor_key", tutorIds, issues);
    const cycleId = referencedId(row, "cycle_key", cycleIds, issues);
    const scholarshipKey = optionalText(row, "scholarship_reference_key", issues, 255);
    let scholarshipReferenceId: string | null | undefined = null;
    if (scholarshipKey !== null && scholarshipKey !== undefined) {
      scholarshipReferenceId = scholarshipIds.get(scholarshipKey);
      if (scholarshipReferenceId === undefined) {
        reportIssue(row, "scholarship_reference_key", "does not reference an imported record", issues);
      }
    }
    if (tutorId !== undefined && cycleId !== undefined && scholarshipReferenceId !== undefined) {
      const parsed = parsedValue(row, "cycle_key", issues, () =>
        currentCycleMembershipSchema.parse({ cycleId, scholarshipReferenceId }),
      );
      const parsedTutorId = parsedValue(row, "tutor_key", issues, () => tutorIdSchema.parse(tutorId));
      const key = tutorId + ":" + cycleId;
      if (membershipKeys.has(key)) {
        reportIssue(row, "tutor_key", "and cycle_key must be unique", issues);
        continue;
      }
      membershipKeys.add(key);
      if (parsed !== undefined && parsedTutorId !== undefined) {
        tutorCycleMemberships.push({
          tutorId: parsedTutorId,
          cycleId: parsed.cycleId,
          scholarshipReferenceId: parsed.scholarshipReferenceId,
          source: { file: row.file, line: row.line },
        });
      }
    }
  }

  const tutorSubjects: PreparedTutorSubject[] = [];
  const tutorSubjectKeys = new Set<string>();
  const subjectsByTutor = new Map<string, string[]>();
  for (const row of source.tutorSubjects) {
    const tutorId = referencedId(row, "tutor_key", tutorIds, issues);
    const subjectId = referencedId(row, "subject_key", subjectIds, issues);
    if (tutorId === undefined || subjectId === undefined) continue;
    const key = tutorId + ":" + subjectId;
    if (tutorSubjectKeys.has(key)) {
      reportIssue(row, "tutor_key", "and subject_key must be unique", issues);
      continue;
    }
    tutorSubjectKeys.add(key);
    const parsedTutorId = parsedValue(row, "tutor_key", issues, () => tutorIdSchema.parse(tutorId));
    const parsedSubjectId = parsedValue(row, "subject_key", issues, () => tutorIdSchema.parse(subjectId));
    if (parsedTutorId === undefined || parsedSubjectId === undefined) continue;
    tutorSubjects.push({
      tutorId: parsedTutorId,
      subjectId: parsedSubjectId,
      source: { file: row.file, line: row.line },
    });
    const assigned = subjectsByTutor.get(parsedTutorId) ?? [];
    assigned.push(parsedSubjectId);
    subjectsByTutor.set(parsedTutorId, assigned);
  }
  for (const [tutorId, assignedSubjectIds] of subjectsByTutor) {
    const firstRow = source.tutorSubjects.find((row) => tutorIds.get(valueFor(row, "tutor_key")) === tutorId);
    if (firstRow !== undefined) {
      parsedValue(firstRow, "subject_key", issues, () =>
        tutorSubjectAssignmentsSchema.parse({ subjectIds: assignedSubjectIds }),
      );
    }
  }

  const schedulePlans: PreparedEntity[] = [];
  const regularPlansByCycle = new Set<string>();
  for (const row of source.schedulePlans) {
    const id = schedulePlanIds.get(valueFor(row, "import_key"));
    const cycleId = referencedId(row, "cycle_key", cycleIds, issues);
    const name = requiredText(row, "name", issues, 200);
    const kind = enumValue(row, "kind", ["REGULAR", "SPECIAL"] as const, issues);
    const validFrom = requiredText(row, "valid_from", issues, 10);
    const validTo = requiredText(row, "valid_to", issues, 10);
    const status = enumValue(row, "status", ["ACTIVE", "INACTIVE"] as const, issues);
    if (id !== undefined && cycleId !== undefined && name !== undefined && kind !== undefined &&
      validFrom !== undefined && validTo !== undefined && status !== undefined) {
      const parsed = parsedValue(row, "name", issues, () =>
        parseScheduleInput(createSchedulePlanInputSchema, { cycleId, name, kind, validFrom, validTo, status }),
      );
      if (parsed !== undefined) {
        if (kind === "REGULAR" && status === "ACTIVE") {
          if (regularPlansByCycle.has(cycleId)) {
            reportIssue(row, "kind", "has more than one active regular plan for a cycle", issues);
          }
          regularPlansByCycle.add(cycleId);
        }
        schedulePlans.push({
          id,
          source: { file: row.file, line: row.line },
          values: {
            cycleId: parsed.cycleId,
            name: cleanDisplayText(parsed.name),
            kind: parsed.kind,
            validFrom: parsed.validFrom,
            validTo: parsed.validTo,
            status: parsed.status,
          },
        });
      }
    }
  }

  const schedulePlanKeys = new Map<string, string>();
  for (const row of source.schedulePlans) {
    const key = valueFor(row, "import_key");
    const id = schedulePlanIds.get(key);
    if (id !== undefined) schedulePlanKeys.set(key, id);
  }
  const scheduleAssignments: PreparedEntity[] = [];
  for (const row of source.scheduleAssignments) {
    const id = scheduleAssignmentIds.get(valueFor(row, "import_key"));
    const planId = referencedId(row, "plan_key", schedulePlanKeys, issues);
    const tutorId = referencedId(row, "tutor_key", tutorIds, issues);
    const pattern = enumValue(row, "pattern", ["WEEKDAY", "DATE"] as const, issues);
    const weekday = integerValue(row, "weekday", issues, { optional: true, minimum: 1, maximum: 7 });
    const startMinutes = integerValue(row, "start_minutes", issues, { minimum: 0, maximum: 1439 });
    const endMinutes = integerValue(row, "end_minutes", issues, { minimum: 1, maximum: 1440 });
    const kind = enumValue(row, "kind", ["DUTY", "RECOVERY"] as const, issues);
    const modality = optionalText(row, "modality", issues, 200);
    const status = enumValue(row, "status", ["ACTIVE", "INACTIVE"] as const, issues);
    if (id !== undefined && planId !== undefined && tutorId !== undefined && pattern !== undefined &&
      weekday !== undefined && startMinutes !== undefined && endMinutes !== undefined &&
      kind !== undefined && modality !== undefined && status !== undefined) {
      const parsed = parsedValue(row, "pattern", issues, () =>
        parseScheduleInput(createScheduleAssignmentInputSchema, {
          planId,
          tutorId,
          pattern,
          weekday,
          assignmentDate: null,
          startMinutes,
          endMinutes,
          kind,
          modality,
        }),
      );
      if (parsed !== undefined) {
        scheduleAssignments.push({
          id,
          source: { file: row.file, line: row.line },
          values: {
            planId: parsed.planId,
            tutorId: parsed.tutorId,
            pattern: parsed.pattern,
            weekday: parsed.weekday ?? null,
            assignmentDate: parsed.assignmentDate ?? null,
            startMinutes: parsed.startMinutes,
            endMinutes: parsed.endMinutes,
            kind: parsed.kind,
            modality: parsed.modality ?? null,
            status,
          },
        });
      }
    }
  }

  const hourMovements: PreparedEntity[] = [];
  for (const row of source.hourMovements) {
    const id = hourMovementIds.get(valueFor(row, "import_key"));
    const cycleId = referencedId(row, "cycle_key", cycleIds, issues);
    const tutorId = referencedId(row, "tutor_key", tutorIds, issues);
    const categoryId = referencedId(row, "category_key", hourCategoryIds, issues);
    const direction = enumValue(row, "direction", ["CREDIT", "DEBIT"] as const, issues);
    const durationMinutes = integerValue(row, "duration_minutes", issues, {
      minimum: 1,
      maximum: 1_000_000,
    });
    const movementDateValue = requiredText(row, "movement_date", issues, 10);
    const movementDate = movementDateValue === undefined
      ? undefined
      : parsedValue(row, "movement_date", issues, () => dateOnlySchema.parse(movementDateValue));
    const note = optionalText(row, "note", issues, 2_000);
    if (id !== undefined && cycleId !== undefined && tutorId !== undefined &&
      categoryId !== undefined && direction !== undefined && durationMinutes !== undefined &&
      movementDate !== undefined && note !== undefined) {
      hourMovements.push({
        id,
        source: { file: row.file, line: row.line },
        values: { cycleId, tutorId, categoryId, direction, durationMinutes, movementDate, note },
      });
    }
  }

  return {
    cycles: cycles.sort((left, right) => String(left.values.status).localeCompare(String(right.values.status))),
    careers,
    subjects,
    hourCategories,
    scholarshipReferences,
    tutors,
    tutorCycleMemberships,
    tutorSubjects,
    schedulePlans,
    scheduleAssignments,
    hourMovements,
  };
}

function comparableValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(comparableValue);
  return value;
}

function valuesMatch(existing: Record<string, unknown>, values: Record<string, unknown>) {
  return Object.entries(values).every(([key, value]) =>
    JSON.stringify(comparableValue(existing[key])) === JSON.stringify(comparableValue(value)),
  );
}

function emptyCounts(): ImportCounts {
  return {
    cycles: { created: 0, updated: 0, unchanged: 0 },
    careers: { created: 0, updated: 0, unchanged: 0 },
    subjects: { created: 0, updated: 0, unchanged: 0 },
    hourCategories: { created: 0, updated: 0, unchanged: 0 },
    scholarshipReferences: { created: 0, updated: 0, unchanged: 0 },
    tutors: { created: 0, updated: 0, unchanged: 0 },
    tutorCycleMemberships: { created: 0, updated: 0, unchanged: 0 },
    tutorSubjects: { created: 0, updated: 0, unchanged: 0 },
    schedulePlans: { created: 0, updated: 0, unchanged: 0 },
    scheduleAssignments: { created: 0, updated: 0, unchanged: 0 },
    hourMovements: { created: 0, updated: 0, unchanged: 0 },
  };
}

function recordObject(value: object | undefined) {
  return value === undefined ? undefined : Object.fromEntries(Object.entries(value));
}

async function syncById(
  transaction: DatabaseTransaction,
  entities: PreparedEntity[],
  counts: SyncCount,
  adapter: EntitySyncAdapter,
  apply: boolean,
) {
  for (const entity of entities) {
    const existing = await adapter.find(transaction, entity.id);
    if (existing === undefined) {
      counts.created += 1;
      if (apply) await adapter.insert(transaction, entity.id, entity.values);
      continue;
    }
    if (valuesMatch(existing, entity.values)) {
      counts.unchanged += 1;
      continue;
    }
    counts.updated += 1;
    if (apply) await adapter.update(transaction, entity.id, entity.values);
  }
}

const cycleAdapter: EntitySyncAdapter = {
  async find(tx, id) {
    const [row] = await tx.select().from(administrativeCycle).where(eq(administrativeCycle.id, id)).limit(1);
    return recordObject(row);
  },
  async insert(tx, id, values) {
    await tx.insert(administrativeCycle).values({ id, ...values } as typeof administrativeCycle.$inferInsert);
  },
  async update(tx, id, values) {
    await tx.update(administrativeCycle)
      .set({ ...values, updatedAt: new Date() } as typeof administrativeCycle.$inferInsert)
      .where(eq(administrativeCycle.id, id));
  },
};

const careerAdapter: EntitySyncAdapter = {
  async find(tx, id) {
    const [row] = await tx.select().from(career).where(eq(career.id, id)).limit(1);
    return recordObject(row);
  },
  async insert(tx, id, values) {
    const activeColors = await tx.select({ color: career.color }).from(career).where(eq(career.status, "ACTIVE"));
    await tx.insert(career).values({ id, ...values, color: getLeastUsedCareerColor(activeColors.map((row) => row.color)) } as typeof career.$inferInsert);
  },
  async update(tx, id, values) {
    await tx.update(career).set({ ...values, updatedAt: new Date() } as typeof career.$inferInsert)
      .where(eq(career.id, id));
  },
};

const subjectAdapter: EntitySyncAdapter = {
  async find(tx, id) {
    const [row] = await tx.select().from(subject).where(eq(subject.id, id)).limit(1);
    return recordObject(row);
  },
  async insert(tx, id, values) {
    await tx.insert(subject).values({ id, ...values } as typeof subject.$inferInsert);
  },
  async update(tx, id, values) {
    await tx.update(subject).set({ ...values, updatedAt: new Date() } as typeof subject.$inferInsert)
      .where(eq(subject.id, id));
  },
};

const hourCategoryAdapter: EntitySyncAdapter = {
  async find(tx, id) {
    const [row] = await tx.select().from(hourCategory).where(eq(hourCategory.id, id)).limit(1);
    return recordObject(row);
  },
  async insert(tx, id, values) {
    await tx.insert(hourCategory).values({ id, ...values } as typeof hourCategory.$inferInsert);
  },
  async update(tx, id, values) {
    await tx.update(hourCategory).set({ ...values, updatedAt: new Date() } as typeof hourCategory.$inferInsert)
      .where(eq(hourCategory.id, id));
  },
};

const scholarshipAdapter: EntitySyncAdapter = {
  async find(tx, id) {
    const [row] = await tx.select().from(scholarshipReference).where(eq(scholarshipReference.id, id)).limit(1);
    return recordObject(row);
  },
  async insert(tx, id, values) {
    await tx.insert(scholarshipReference).values({ id, ...values } as typeof scholarshipReference.$inferInsert);
  },
  async update(tx, id, values) {
    await tx.update(scholarshipReference)
      .set({ ...values, updatedAt: new Date() } as typeof scholarshipReference.$inferInsert)
      .where(eq(scholarshipReference.id, id));
  },
};

const tutorAdapter: EntitySyncAdapter = {
  async find(tx, id) {
    const [row] = await tx.select().from(tutor).where(eq(tutor.id, id)).limit(1);
    return recordObject(row);
  },
  async insert(tx, id, values) {
    await tx.insert(tutor).values({ id, ...values } as typeof tutor.$inferInsert);
  },
  async update(tx, id, values) {
    await tx.update(tutor).set({ ...values, updatedAt: new Date() } as typeof tutor.$inferInsert)
      .where(eq(tutor.id, id));
  },
};

const schedulePlanAdapter: EntitySyncAdapter = {
  async find(tx, id) {
    const [row] = await tx.select().from(schedulePlan).where(eq(schedulePlan.id, id)).limit(1);
    return recordObject(row);
  },
  async insert(tx, id, values) {
    await tx.insert(schedulePlan).values({ id, ...values } as typeof schedulePlan.$inferInsert);
  },
  async update(tx, id, values) {
    await tx.update(schedulePlan).set({ ...values, updatedAt: new Date() } as typeof schedulePlan.$inferInsert)
      .where(eq(schedulePlan.id, id));
  },
};

const scheduleAssignmentAdapter: EntitySyncAdapter = {
  async find(tx, id) {
    const [row] = await tx.select().from(scheduleAssignment).where(eq(scheduleAssignment.id, id)).limit(1);
    return recordObject(row);
  },
  async insert(tx, id, values) {
    await tx.insert(scheduleAssignment).values({ id, ...values } as typeof scheduleAssignment.$inferInsert);
  },
  async update(tx, id, values) {
    await tx.update(scheduleAssignment).set({ ...values, updatedAt: new Date() } as typeof scheduleAssignment.$inferInsert)
      .where(eq(scheduleAssignment.id, id));
  },
};

function hourMovementAdapter(actorId: string): EntitySyncAdapter {
  return {
    async find(tx, id) {
      const [row] = await tx.select().from(hourMovement).where(eq(hourMovement.id, id)).limit(1);
      return recordObject(row);
    },
    async insert(tx, id, values) {
      await tx.insert(hourMovement).values({ id, ...values, actorId } as typeof hourMovement.$inferInsert);
    },
    async update(tx, id, values) {
      await tx.update(hourMovement).set(values as typeof hourMovement.$inferInsert)
        .where(eq(hourMovement.id, id));
    },
  };
}

async function syncMemberships(
  tx: DatabaseTransaction,
  rows: PreparedMembership[],
  counts: SyncCount,
  apply: boolean,
) {
  for (const row of rows) {
    const [existing] = await tx.select().from(tutorCycleMembership)
      .where(and(
        eq(tutorCycleMembership.tutorId, row.tutorId),
        eq(tutorCycleMembership.cycleId, row.cycleId),
      )).limit(1);
    if (existing === undefined) {
      counts.created += 1;
      if (apply) {
        await tx.insert(tutorCycleMembership).values({
          tutorId: row.tutorId,
          cycleId: row.cycleId,
          scholarshipReferenceId: row.scholarshipReferenceId,
        });
      }
    } else if (existing.scholarshipReferenceId === row.scholarshipReferenceId) {
      counts.unchanged += 1;
    } else {
      counts.updated += 1;
      if (apply) {
        await tx.update(tutorCycleMembership)
          .set({ scholarshipReferenceId: row.scholarshipReferenceId, updatedAt: new Date() })
          .where(and(
            eq(tutorCycleMembership.tutorId, row.tutorId),
            eq(tutorCycleMembership.cycleId, row.cycleId),
          ));
      }
    }
  }
}

async function syncTutorSubjects(
  tx: DatabaseTransaction,
  rows: PreparedTutorSubject[],
  counts: SyncCount,
  apply: boolean,
) {
  for (const row of rows) {
    const [existing] = await tx.select({ tutorId: tutorSubject.tutorId })
      .from(tutorSubject)
      .where(and(
        eq(tutorSubject.tutorId, row.tutorId),
        eq(tutorSubject.subjectId, row.subjectId),
      )).limit(1);
    if (existing === undefined) {
      counts.created += 1;
      if (apply) {
        await tx.insert(tutorSubject)
          .values({ tutorId: row.tutorId, subjectId: row.subjectId })
          .onConflictDoNothing();
      }
    } else {
      counts.unchanged += 1;
    }
  }
}

async function syncOpeningBalances(
  tx: DatabaseTransaction,
  rows: PreparedEntity[],
  counts: SyncCount,
  apply: boolean,
  actorId: string | undefined,
) {
  const adapter = hourMovementAdapter(actorId ?? "");
  for (const row of rows) {
    const existing = await adapter.find(tx, row.id);
    if (existing === undefined) {
      counts.created += 1;
      if (apply) await adapter.insert(tx, row.id, row.values);
    } else if (valuesMatch(existing, row.values)) {
      counts.unchanged += 1;
    } else {
      throw new SafeImportError(
        "An existing opening balance differs from the registry; reset the staging database before importing changed values.",
      );
    }
  }
}

async function findEnabledAdmin(tx: DatabaseTransaction) {
  const [admin] = await tx.select({ id: user.id }).from(user)
    .where(and(eq(user.role, "ADMIN"), eq(user.enabled, true)))
    .orderBy(asc(user.createdAt), asc(user.id))
    .limit(1);
  return admin?.id;
}

async function syncAll(
  tx: DatabaseTransaction,
  data: PreparedImport,
  counts: ImportCounts,
  apply: boolean,
  actorId: string | undefined,
) {
  await syncById(tx, data.cycles, counts.cycles, cycleAdapter, apply);
  await syncById(tx, data.careers, counts.careers, careerAdapter, apply);
  await syncById(tx, data.subjects, counts.subjects, subjectAdapter, apply);
  await syncById(tx, data.hourCategories, counts.hourCategories, hourCategoryAdapter, apply);
  await syncById(tx, data.scholarshipReferences, counts.scholarshipReferences, scholarshipAdapter, apply);
  await syncById(tx, data.tutors, counts.tutors, tutorAdapter, apply);
  await syncMemberships(tx, data.tutorCycleMemberships, counts.tutorCycleMemberships, apply);
  await syncTutorSubjects(tx, data.tutorSubjects, counts.tutorSubjects, apply);
  await syncById(tx, data.schedulePlans, counts.schedulePlans, schedulePlanAdapter, apply);
  await syncById(tx, data.scheduleAssignments, counts.scheduleAssignments, scheduleAssignmentAdapter, apply);
  await syncOpeningBalances(tx, data.hourMovements, counts.hourMovements, apply, actorId);
}

export async function executeInitialDataImport(
  database: Database,
  data: PreparedImport,
  options: { apply: boolean },
): Promise<ImportCounts> {
  return database.transaction(async (tx) => {
    if (options.apply) {
      await tx.execute(sql.raw("SELECT pg_advisory_xact_lock(hashtext('sgta_initial_data_import'))"));
    }
    const actorId = options.apply ? await findEnabledAdmin(tx) : undefined;
    if (options.apply && actorId === undefined) {
      throw new SafeImportError("An enabled Admin account is required before applying the import.");
    }

    const counts = emptyCounts();
    await syncAll(tx, data, counts, options.apply, actorId);

    if (options.apply) {
      const runId = randomUUID();
      const auditInput = parseAuditEventInput({
        actorId,
        action: "initial_data_import",
        entityType: "initial_data_import",
        entityId: runId,
        requestId: "initial-data-import:" + runId,
        metadata: { counts },
      });
      const [event] = await tx.insert(auditEvent).values({
        actorId: auditInput.actorId ?? null,
        action: auditInput.action,
        entityType: auditInput.entityType,
        entityId: auditInput.entityId,
        metadata: auditInput.metadata,
        requestId: auditInput.requestId ?? null,
        ipAddress: auditInput.ipAddress ?? null,
      }).returning({ id: auditEvent.id });
      if (event === undefined) {
        throw new SafeImportError("The initial data import audit event could not be persisted.");
      }
    }
    return counts;
  });
}

function parseArguments(arguments_: string[]) {
  let apply = false;
  let dryRun = false;
  let yes = false;
  for (const argument of arguments_) {
    if (argument === "--apply") apply = true;
    else if (argument === "--dry-run") dryRun = true;
    else if (argument === "--yes") yes = true;
    else throw new Error("unsupported command argument");
  }
  if (apply && dryRun) throw new Error("--apply and --dry-run cannot be combined");
  if (apply && !yes) throw new Error("--apply requires --yes");
  if (yes && !apply) throw new Error("--yes is only valid with --apply");
  return { apply };
}

function targetHost(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      throw new Error("unsupported protocol");
    }
    return parsed.hostname;
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL");
  }
}

function printCounts(counts: ImportCounts) {
  console.log("Table                 Created  Updated  Unchanged");
  for (const [tableName, value] of Object.entries(counts)) {
    console.log(
      tableName.padEnd(22) +
        String(value.created).padStart(7) +
        String(value.updated).padStart(9) +
        String(value.unchanged).padStart(11),
    );
  }
}

async function main() {
  loadEnvConfig(process.cwd());

  let args: { apply: boolean };
  try {
    args = parseArguments(process.argv.slice(2));
  } catch {
    console.error("Usage: pnpm data:import -- [--dry-run | --apply --yes]");
    process.exitCode = 1;
    return;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL must be set explicitly; no default target is used.");
    process.exitCode = 1;
    return;
  }

  let host: string;
  try {
    host = targetHost(databaseUrl);
  } catch {
    console.error("DATABASE_URL must be a valid PostgreSQL connection URL.");
    process.exitCode = 1;
    return;
  }
  console.log("Database host: " + host);
  console.log("Mode: " + (args.apply ? "apply" : "dry-run"));

  const packageResult = await loadInitialDataPackage();
  if (packageResult.errors.length > 0) {
    for (const message of packageResult.errors) console.error(message);
    process.exitCode = 1;
    return;
  }
  if (packageResult.data === null) {
    console.error("The import package could not be prepared.");
    process.exitCode = 1;
    return;
  }

  const databaseHandle = createDatabaseHandle({ connectionString: databaseUrl, max: 1 });
  try {
    const counts = await executeInitialDataImport(databaseHandle.db, packageResult.data, { apply: args.apply });
    printCounts(counts);
    console.log(args.apply
      ? "Initial data import committed in one transaction."
      : "Dry-run completed without writing data.");
  } catch (error) {
    if (error instanceof SafeImportError) {
      console.error(error.message);
      if (args.apply) {
        console.error("No import data was committed because the transaction was rolled back.");
      }
    } else {
      console.error(args.apply
        ? "Initial data import failed. The transaction was rolled back; check the database and validated package."
        : "Initial data dry-run failed; check the database and validated package.");
    }
    process.exitCode = 1;
  } finally {
    await databaseHandle.close();
  }
}

const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (executedFile === fileURLToPath(import.meta.url)) {
  void main();
}
