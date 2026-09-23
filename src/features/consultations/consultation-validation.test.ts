import {
  consultationFiltersSchema,
  consultationImportOptionsSchema,
  consultationImportSummarySchema,
  consultationListItemSchema,
  consultationReviewDecisionSchema,
  consultationReviewDetailSchema,
  consultationSourceConfigSchema,
  consultationSourceHeaderMapSchema,
  consultationSourceIdentitySchema,
  consultationSourceRowSchema,
  consultationWorkspaceSchema,
  resolveConsultationSourceConfig,
} from "./consultation-validation";

const validHeaderMap = {
  career: "Carrera",
  studentFirstName: "Nombre",
  studentLastName: "Apellido",
  consultationDate: "Fecha",
  tutor: "Tutor",
  academicStage: "Etapa",
  modality: "Modalidad",
  topic: "Tema",
  contact: "Contacto",
};

const validSourceRow = {
  sourceRowKey: "row-42",
  sourceFingerprint: "a".repeat(64),
  career: "Ingeniería en Sistemas",
  studentFirstName: "Ana",
  studentLastName: "Pérez",
  consultationDate: "2026-09-22",
  tutor: "Marina Benítez",
  academicStage: "Segundo año",
  modality: "Virtual",
  topic: "Consulta de álgebra",
  contact: null,
};

function configuredEnvironment() {
  return {
    GOOGLE_SHEETS_SPREADSHEET_ID: "test_sheet-id_123",
    GOOGLE_SHEETS_RANGE: "Respuestas 1!A:I",
    GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL:
      "consultations@example.test",
    GOOGLE_SHEETS_PRIVATE_KEY:
      "-----BEGIN PRIVATE KEY-----\\nsynthetic-test-key\\n-----END PRIVATE KEY-----",
    GOOGLE_SHEETS_HEADER_MAP: JSON.stringify(validHeaderMap),
  };
}

describe("consultation source configuration", () => {
  it("allows canonical application configuration when the source is absent", () => {
    expect(
      resolveConsultationSourceConfig({
        GOOGLE_SHEETS_SPREADSHEET_ID: undefined,
        GOOGLE_SHEETS_RANGE: undefined,
        GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL: undefined,
        GOOGLE_SHEETS_PRIVATE_KEY: undefined,
        GOOGLE_SHEETS_HEADER_MAP: undefined,
      }),
    ).toEqual({ status: "unavailable", code: "source_not_configured" });
  });

  it("returns a safe configuration error for incomplete source credentials", () => {
    const result = resolveConsultationSourceConfig({
      ...configuredEnvironment(),
      GOOGLE_SHEETS_PRIVATE_KEY: undefined,
    });

    expect(result.status).toBe("invalid");
    expect(JSON.stringify(result)).not.toContain("synthetic-test-key");
  });

  it("parses a complete source configuration and escaped PEM newlines", () => {
    const result = resolveConsultationSourceConfig(configuredEnvironment());

    expect(result.status).toBe("configured");
    if (result.status !== "configured") {
      return;
    }

    expect(result.config).toMatchObject({
      spreadsheetId: "test_sheet-id_123",
      range: "Respuestas 1!A:I",
      serviceAccountEmail: "consultations@example.test",
      headerMap: validHeaderMap,
    });
    expect(result.config.privateKey).toContain("\nsynthetic-test-key\n");
  });

  it("rejects malformed JSON and duplicate mapped column headers safely", () => {
    const malformed = resolveConsultationSourceConfig({
      ...configuredEnvironment(),
      GOOGLE_SHEETS_HEADER_MAP: "not-json",
    });
    const duplicateHeaders = consultationSourceHeaderMapSchema.safeParse({
      ...validHeaderMap,
      contact: " Tutor ",
    });

    expect(malformed).toMatchObject({ status: "invalid" });
    expect(duplicateHeaders.success).toBe(false);
  });

  it("bounds source configuration at the source boundary", () => {
    const result = resolveConsultationSourceConfig({
      ...configuredEnvironment(),
      GOOGLE_SHEETS_HEADER_MAP: "x".repeat(4097),
    });

    expect(result).toMatchObject({ status: "invalid" });
    expect(JSON.stringify(result)).not.toContain("x".repeat(120));
  });

  it("rejects unknown source configuration fields", () => {
    expect(
      consultationSourceConfigSchema.safeParse({
        spreadsheetId: "test_sheet-id_123",
        range: "Respuestas 1!A:I",
        serviceAccountEmail: "consultations@example.test",
        privateKey:
          "-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----",
        headerMap: validHeaderMap,
        accessToken: "must-not-be-accepted",
      }).success,
    ).toBe(false);
  });
});

describe("consultation input contracts", () => {
  it("accepts a bounded source identity and rejects missing identity parts", () => {
    expect(
      consultationSourceIdentitySchema.safeParse({
        provider: "GOOGLE_SHEETS",
        spreadsheetId: "test_sheet-id_123",
        tab: "Respuestas 1",
        rowKey: "row-42",
      }).success,
    ).toBe(true);

    expect(
      consultationSourceIdentitySchema.safeParse({
        provider: "GOOGLE_SHEETS",
        spreadsheetId: "test_sheet-id_123",
        tab: "Respuestas 1",
      }).success,
    ).toBe(false);
  });

  it("bounds import options and rejects unknown options", () => {
    expect(consultationImportOptionsSchema.parse({})).toEqual({ maxRows: 1000 });
    expect(
      consultationImportOptionsSchema.safeParse({ maxRows: 5001 }).success,
    ).toBe(false);
    expect(
      consultationImportOptionsSchema.safeParse({ overwrite: true }).success,
    ).toBe(false);
  });

  it("rejects unapproved source fields, malformed fingerprints, and oversized values", () => {
    expect(consultationSourceRowSchema.safeParse(validSourceRow).success).toBe(
      true,
    );
    expect(
      consultationSourceRowSchema.safeParse({
        ...validSourceRow,
        studentFirstName: "A".repeat(201),
      }).success,
    ).toBe(false);
    expect(
      consultationSourceRowSchema.safeParse({
        ...validSourceRow,
        providerResponse: { raw: "unapproved" },
      }).success,
    ).toBe(false);
    expect(
      consultationSourceRowSchema.safeParse({
        ...validSourceRow,
        sourceFingerprint: "not-a-fingerprint",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid date ranges, unbounded pagination, and unknown filters", () => {
    expect(
      consultationFiltersSchema.safeParse({
        fromDate: "2026-10-01",
        toDate: "2026-09-01",
      }).success,
    ).toBe(false);
    expect(
      consultationFiltersSchema.safeParse({ limit: 101 }).success,
    ).toBe(false);
    expect(
      consultationFiltersSchema.safeParse({ tutorId: "not-a-tutor" }).success,
    ).toBe(false);
    expect(
      consultationFiltersSchema.safeParse({ tutorId: "x", tutor_id: "y" })
        .success,
    ).toBe(false);
  });

  it("requires a Subject only for the SUBJECT review decision", () => {
    const expectedVersion = 1;

    expect(
      consultationReviewDecisionSchema.safeParse({
        expectedVersion,
        classification: "SUBJECT",
      }).success,
    ).toBe(false);
    expect(
      consultationReviewDecisionSchema.safeParse({
        expectedVersion,
        classification: "SUBJECT",
        subjectId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
    expect(
      consultationReviewDecisionSchema.safeParse({
        expectedVersion,
        classification: "GENERAL",
        subjectId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(false);
    expect(
      consultationReviewDecisionSchema.safeParse({ expectedVersion }).success,
    ).toBe(false);
  });
});

describe("consultation response contracts", () => {
  it("validates review detail without accepting credential fields", () => {
    const detail = {
      id: "11111111-1111-4111-8111-111111111111",
      status: "PENDING_REVIEW",
      classification: "PENDING_CLASSIFICATION",
      reviewVersion: 1,
      sourceRow: validSourceRow,
      normalized: {
        career: null,
        careerId: null,
        studentFirstName: null,
        studentLastName: null,
        consultationDate: null,
        tutor: null,
        tutorId: null,
        academicStage: null,
        modality: null,
        topic: null,
        contact: null,
      },
      anomalyFlags: ["MISSING_CAREER"],
    };

    expect(consultationReviewDetailSchema.safeParse(detail).success).toBe(true);
    expect(
      consultationReviewDetailSchema.safeParse({
        ...detail,
        privateKey: "never-in-a-response",
      }).success,
    ).toBe(false);
  });

  it("accepts bounded import summaries and rejects credentials", () => {
    const summary = {
      runId: null,
      status: null,
      startedAt: null,
      completedAt: null,
      lastSuccessfulAt: null,
      newRows: 0,
      alreadyProcessedRows: 0,
      reviewRows: 0,
      duplicateCandidates: 0,
      errorRows: 0,
      errorCode: "source_not_configured",
    };

    expect(consultationImportSummarySchema.safeParse(summary).success).toBe(
      true,
    );
    expect(
      consultationImportSummarySchema.safeParse({
        ...summary,
        privateKey: "never-in-a-response",
      }).success,
    ).toBe(false);
  });

  it("permits only reportable classifications in canonical list DTOs", () => {
    const row = {
      id: "11111111-1111-4111-8111-111111111111",
      consultationDate: "2026-09-22",
      studentFirstName: "Ana",
      studentLastName: "Pérez",
      studentContact: null,
      career: "Ingeniería en Sistemas",
      tutor: "Marina Benítez",
      academicStage: "Segundo año",
      modality: "Virtual",
      rawTopic: "Consulta de álgebra",
      classification: "GENERAL",
      subject: null,
    };

    expect(consultationListItemSchema.safeParse(row).success).toBe(true);
    expect(
      consultationListItemSchema.safeParse({
        ...row,
        classification: "PENDING_CLASSIFICATION",
      }).success,
    ).toBe(false);
  });

  it("validates a bounded Admin workspace shape", () => {
    expect(
      consultationWorkspaceSchema.safeParse({
        rows: [],
        pendingReviewCount: 0,
        totalRows: 0,
        import: {
          runId: null,
          status: null,
          startedAt: null,
          completedAt: null,
          lastSuccessfulAt: null,
          newRows: 0,
          alreadyProcessedRows: 0,
          reviewRows: 0,
          duplicateCandidates: 0,
          errorRows: 0,
          errorCode: null,
        },
        pagination: { limit: 50, offset: 0 },
      }).success,
    ).toBe(true);
  });
});
