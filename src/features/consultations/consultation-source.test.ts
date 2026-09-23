import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  CONSULTATION_SOURCE_ERROR_CODES,
  createGoogleSheetsConsultationSourceAdapter,
} from "./consultation-source";
import {
  consultationSourceConfigSchema,
  consultationSourceRowSchema,
} from "./consultation-validation";

const headerMap = {
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

const sourceConfig = consultationSourceConfigSchema.parse({
  spreadsheetId: "synthetic_sheet-id_123",
  range: "'Consultas'!A:I",
  serviceAccountEmail: "consultations@example.test",
  privateKey:
    "-----BEGIN PRIVATE KEY-----\nsynthetic-test-key\n-----END PRIVATE KEY-----",
  headerMap,
});

function valuesResponse(overrides: Record<string, unknown> = {}) {
  return Response.json({
    range: "'Consultas'!A3:J5",
    majorDimension: "ROWS",
    values: [
      [
        "Carrera",
        "Nombre",
        "Apellido",
        "Fecha",
        "Tutor",
        "Etapa",
        "Modalidad",
        "Tema",
        "Contacto",
        "Columna privada ajena",
      ],
      [
        "Computer Science",
        "Ana",
        "Diaz",
        "22/09/2026",
        "Casey Tutor",
        "Second year",
        "Virtual",
        "Algebra support",
        "ana@example.test",
        "must-not-be-stored",
      ],
      [
        "Computer Science",
        "Luis",
        "Perez",
        "2026-09-23",
        "Casey Tutor",
        "Third year",
        "In person",
        "Calculus question",
        "",
        "another-private-value",
      ],
    ],
    ...overrides,
  });
}

function createAdapter(
  fetchImpl: typeof fetch,
  overrides: { getAccessToken?: () => Promise<string>; maxResponseBytes?: number } = {},
) {
  return createGoogleSheetsConsultationSourceAdapter(sourceConfig, {
    fetchImpl,
    getAccessToken: overrides.getAccessToken ?? vi.fn().mockResolvedValue("synthetic-access-token"),
    maxResponseBytes: overrides.maxResponseBytes,
  });
}

describe("Google Sheets consultation source", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reads only the configured range with GET and maps approved columns", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(valuesResponse());
    const source = createAdapter(fetchImpl);

    const batch = await source.readRows({ maxRows: 2 });

    expect(batch.sourceTab).toBe("Consultas");
    expect(batch.rows).toHaveLength(2);
    expect(consultationSourceRowSchema.parse(batch.rows[0])).toMatchObject({
      sourceRowKey: "row:4",
      career: "Computer Science",
      studentFirstName: "Ana",
      studentLastName: "Diaz",
      contact: "ana@example.test",
    });
    expect(JSON.stringify(batch.rows)).not.toContain("must-not-be-stored");

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toContain(
      "https://sheets.googleapis.com/v4/spreadsheets/synthetic_sheet-id_123/values/",
    );
    expect(new URL(String(url)).searchParams.get("majorDimension")).toBe("ROWS");
    expect(new URL(String(url)).searchParams.get("valueRenderOption")).toBe(
      "FORMATTED_VALUE",
    );
    expect(init).toMatchObject({
      method: "GET",
      redirect: "error",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer synthetic-access-token",
      },
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("creates stable fingerprints from approved fields only", async () => {
    const first = vi
      .fn<typeof fetch>()
      .mockResolvedValue(valuesResponse());
    const changedExtraColumn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({
          range: "'Consultas'!A3:J5",
          majorDimension: "ROWS",
          values: [
            [
              "Carrera",
              "Nombre",
              "Apellido",
              "Fecha",
              "Tutor",
              "Etapa",
              "Modalidad",
              "Tema",
              "Contacto",
              "different-ignored-value",
            ],
            ...((await valuesResponse().json()) as { values: unknown[][] }).values.slice(1),
          ],
        }),
      );

    const [firstRow] = (await createAdapter(first).readRows({ maxRows: 2 })).rows;
    const [secondRow] = (await createAdapter(changedExtraColumn).readRows({
      maxRows: 2,
    })).rows;

    expect(consultationSourceRowSchema.parse(firstRow).sourceFingerprint).toBe(
      consultationSourceRowSchema.parse(secondRow).sourceFingerprint,
    );
  });

  it("returns typed errors for missing or ambiguous configured headers", async () => {
    const missingHeaders = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({
          range: "'Consultas'!A1:H2",
          values: [["Carrera", "Nombre", "Apellido", "Fecha", "Tutor", "Etapa", "Modalidad", "Tema"]],
        }),
      );
    const ambiguousHeaders = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({
          range: "'Consultas'!A1:J2",
          values: [
            ["Carrera", "Nombre", "Apellido", "Fecha", "Tutor", "Etapa", "Modalidad", "Tema", "Contacto", "Contacto"],
            ["", "", "", "", "", "", "", "", "", ""],
          ],
        }),
      );

    await expect(
      createAdapter(missingHeaders).readRows({ maxRows: 1 }),
    ).rejects.toMatchObject({ code: CONSULTATION_SOURCE_ERROR_CODES.headersMissing });
    await expect(
      createAdapter(ambiguousHeaders).readRows({ maxRows: 1 }),
    ).rejects.toMatchObject({ code: CONSULTATION_SOURCE_ERROR_CODES.headersAmbiguous });
  });

  it("bounds rows and response bytes before mapping source data", async () => {
    const rowLimitFetch = vi.fn<typeof fetch>().mockResolvedValue(valuesResponse());
    const responseLimitFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("response-too-large"));

    await expect(
      createAdapter(rowLimitFetch).readRows({ maxRows: 1 }),
    ).rejects.toMatchObject({ code: CONSULTATION_SOURCE_ERROR_CODES.rowLimitExceeded });
    await expect(
      createAdapter(responseLimitFetch, { maxResponseBytes: 8 }).readRows({
        maxRows: 2,
      }),
    ).rejects.toMatchObject({ code: CONSULTATION_SOURCE_ERROR_CODES.responseTooLarge });
  });

  it("bounds cell count and rejects malformed provider responses safely", async () => {
    const tooManyCells = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        range: "'Consultas'!A1:ZZ1000",
        majorDimension: "ROWS",
        values: [Array.from({ length: 100_001 }, () => "x")],
      }),
    );
    const malformedResponse = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ range: "'Consultas'!A1:A1", unknown: true }));

    await expect(
      createAdapter(tooManyCells).readRows({ maxRows: 1 }),
    ).rejects.toMatchObject({ code: CONSULTATION_SOURCE_ERROR_CODES.cellLimitExceeded });
    await expect(
      createAdapter(malformedResponse).readRows({ maxRows: 1 }),
    ).rejects.toMatchObject({ code: CONSULTATION_SOURCE_ERROR_CODES.responseInvalid });
  });

  it("maps timeouts, provider failures, and credential failures without details", async () => {
    const timedOut = vi.fn<typeof fetch>().mockRejectedValue(
      Object.assign(new Error("token-value-must-not-leak"), {
        name: "TimeoutError",
      }),
    );
    const providerFailure = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("provider-body-must-not-leak", { status: 403 }),
      );
    const failedTokenProvider = vi.fn().mockRejectedValue(
      new Error("private-key-must-not-leak"),
    );
    const unusedFetch = vi.fn<typeof fetch>();

    await expect(
      createAdapter(timedOut).readRows({ maxRows: 1 }),
    ).rejects.toMatchObject({ code: CONSULTATION_SOURCE_ERROR_CODES.timeout });
    await expect(
      createAdapter(providerFailure).readRows({ maxRows: 1 }),
    ).rejects.toMatchObject({ code: CONSULTATION_SOURCE_ERROR_CODES.providerError });

    await expect(
      createAdapter(unusedFetch, { getAccessToken: failedTokenProvider }).readRows({
        maxRows: 1,
      }),
    ).rejects.toMatchObject({
      code: CONSULTATION_SOURCE_ERROR_CODES.credentialsInvalid,
      message: "The consultation source credentials are unavailable.",
    });
    expect(unusedFetch).not.toHaveBeenCalled();
    expect(failedTokenProvider).toHaveBeenCalledOnce();
  });
});
