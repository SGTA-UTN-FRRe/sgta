import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createConsultationReferenceResolver,
  normalizeConsultationSourceRow,
  parseConsultationDate,
} from "./consultation-import-service";
import { consultationSourceRowSchema } from "./consultation-validation";

const sourceRow = (overrides: Record<string, unknown> = {}) =>
  consultationSourceRowSchema.parse({
    sourceRowKey: "row:12",
    sourceFingerprint: "a".repeat(64),
    career: "  Ingeniería   en Sistemas ",
    studentFirstName: "  Ana  María ",
    studentLastName: "Pérez",
    consultationDate: "22/09/2026",
    tutor: "Alex Rivera",
    academicStage: " Segundo   año ",
    modality: "Presencial",
    topic: "  Consulta de Álgebra  ",
    contact: "  ANA@example.test ",
    ...overrides,
  });

const careers = [
  {
    id: "career-1",
    name: "Ingeniería en Sistemas",
    normalizedName: "ingeniería en sistemas",
  },
];

const tutors = [
  {
    id: "tutor-1",
    firstName: "Alex",
    lastName: "Rivera",
    preferredDisplayName: "Alex Rivera",
  },
];

describe("consultation import normalization", () => {
  it("accepts only explicit ISO and day-first dates with real calendar values", () => {
    expect(parseConsultationDate("2026-09-22")).toBe("2026-09-22");
    expect(parseConsultationDate(" 22/09/2026 ")).toBe("2026-09-22");
    expect(parseConsultationDate("09/22/2026")).toBeNull();
    expect(parseConsultationDate("31/02/2026")).toBeNull();
    expect(parseConsultationDate("2026-2-2")).toBeNull();
    expect(parseConsultationDate("22/09/26")).toBeNull();
    expect(parseConsultationDate(null)).toBeNull();
  });

  it("normalizes approved fields and resolves exact canonical aliases", () => {
    const resolver = createConsultationReferenceResolver(careers, tutors);
    const result = normalizeConsultationSourceRow(sourceRow(), resolver);

    expect(result).toMatchObject({
      sourceRowKey: "row:12",
      rawCareer: "  Ingeniería   en Sistemas ",
      normalizedCareer: "ingeniería en sistemas",
      careerId: "career-1",
      normalizedStudentFirstName: "ana maría",
      normalizedStudentLastName: "pérez",
      normalizedConsultationDate: "2026-09-22",
      normalizedTutor: "alex rivera",
      tutorId: "tutor-1",
      normalizedAcademicStage: "segundo año",
      normalizedModality: "presencial",
      rawTopic: "  Consulta de Álgebra  ",
      normalizedTopic: "consulta de álgebra",
      normalizedContact: "ana@example.test",
      anomalyFlags: [],
    });
  });

  it("flags missing, unresolved, and ambiguous values without fuzzy matching", () => {
    const ambiguousResolver = createConsultationReferenceResolver(
      careers,
      [
        ...tutors,
        {
          id: "tutor-2",
          firstName: "ALEX",
          lastName: "RIVERA",
          preferredDisplayName: null,
        },
      ],
    );
    const result = normalizeConsultationSourceRow(
      sourceRow({
        career: "Ingeniería Sistemas",
        studentFirstName: "",
        consultationDate: "09/22/2026",
        tutor: "Alex Rivera",
        academicStage: "",
        modality: "",
        topic: "",
      }),
      ambiguousResolver,
    );

    expect(result.careerId).toBeNull();
    expect(result.tutorId).toBeNull();
    expect(result.anomalyFlags).toEqual(
      expect.arrayContaining([
        "UNRESOLVED_CAREER",
        "MISSING_STUDENT_FIRST_NAME",
        "INVALID_CONSULTATION_DATE",
        "AMBIGUOUS_TUTOR",
        "MISSING_ACADEMIC_STAGE",
        "MISSING_MODALITY",
        "MISSING_TOPIC",
      ]),
    );
    expect(result.anomalyFlags).not.toContain("MISSING_CAREER");
    expect(result.anomalyFlags).not.toContain("UNRESOLVED_TUTOR");
  });

  it("does not infer classification or discard the raw topic", () => {
    const result = normalizeConsultationSourceRow(
      sourceRow({ topic: "Subject: Discrete Mathematics" }),
      createConsultationReferenceResolver(careers, tutors),
    );

    expect(result.rawTopic).toBe("Subject: Discrete Mathematics");
    expect(result.normalizedTopic).toBe("subject: discrete mathematics");
    expect(result).not.toHaveProperty("classification");
    expect(result).not.toHaveProperty("subjectId");
  });
});
