import "server-only";

import { createHash } from "node:crypto";

import { JWT } from "google-auth-library";
import { z } from "zod";

import type { ConsultationSourceConfig } from "./consultation-validation";
import type { ConsultationSourceRow } from "./consultation-validation";
import { normalizeName } from "../tutors/tutor-validation";

export const CONSULTATION_SOURCE_ERROR_CODES = {
  credentialsInvalid: "source_credentials_invalid",
  headersAmbiguous: "source_headers_ambiguous",
  headersMissing: "source_headers_missing",
  providerError: "source_provider_error",
  rangeInvalid: "source_range_invalid",
  responseInvalid: "source_response_invalid",
  responseTooLarge: "source_response_too_large",
  rowLimitExceeded: "source_row_limit_exceeded",
  cellLimitExceeded: "source_cell_limit_exceeded",
  timeout: "source_timeout",
  unavailable: "source_unavailable",
} as const;

export type ConsultationSourceErrorCode =
  (typeof CONSULTATION_SOURCE_ERROR_CODES)[keyof typeof CONSULTATION_SOURCE_ERROR_CODES];

const safeMessages: Record<ConsultationSourceErrorCode, string> = {
  source_credentials_invalid: "The consultation source credentials are unavailable.",
  source_headers_ambiguous: "A configured consultation header matches multiple columns.",
  source_headers_missing: "A configured consultation header was not found.",
  source_provider_error: "The consultation source rejected the read request.",
  source_range_invalid: "The configured consultation range has no stable row identity.",
  source_response_invalid: "The consultation source returned an invalid response.",
  source_response_too_large: "The consultation source response exceeded its size limit.",
  source_row_limit_exceeded: "The consultation source returned too many rows.",
  source_cell_limit_exceeded: "The consultation source returned too many cells.",
  source_timeout: "The consultation source read timed out.",
  source_unavailable: "The consultation source is unavailable.",
};

export class ConsultationSourceError extends Error {
  readonly code: ConsultationSourceErrorCode;

  constructor(code: ConsultationSourceErrorCode) {
    super(safeMessages[code]);
    this.name = "ConsultationSourceError";
    this.code = code;
  }
}

export type ConsultationSourceBatch = {
  sourceTab: string;
  rows: unknown[];
};

export type ConsultationSourceAdapter = {
  readRows(options: { maxRows: number }): Promise<ConsultationSourceBatch>;
};

export type ConsultationSourceAdapterDependencies = {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string>;
  timeoutMs?: number;
  maxResponseBytes?: number;
};

const SHEETS_READ_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const SHEETS_VALUES_ENDPOINT = "https://sheets.googleapis.com";
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_RESPONSE_CELLS = 100_000;

const valueRangeSchema = z
  .object({
    range: z.string().trim().min(1).max(512),
    majorDimension: z.enum(["ROWS", "COLUMNS"]).optional(),
    values: z
      .array(z.array(z.union([z.string(), z.number().finite(), z.boolean()])))
      .optional(),
  })
  .strict();

type HeaderField = keyof ConsultationSourceConfig["headerMap"];
type SourceCell = string | number | boolean;

function parseSheetName(range: string) {
  const separator = range.lastIndexOf("!");
  if (separator < 0) {
    return null;
  }

  const rawName = range.slice(0, separator).trim();
  if (rawName.length === 0) {
    return null;
  }

  if (rawName.startsWith("'") && rawName.endsWith("'")) {
    return rawName.slice(1, -1).replace(/''/g, "'");
  }

  return rawName;
}

function parseStartingRow(range: string) {
  const cellRange = range.slice(range.lastIndexOf("!") + 1).trim();
  const startCell = cellRange.split(":", 1)[0]?.trim();
  const match = startCell?.match(/^[A-Z]+([1-9]\d*)?$/i);

  if (match === null || match === undefined) {
    return null;
  }

  const startingRow = match[1] === undefined ? 1 : Number(match[1]);
  if (!Number.isSafeInteger(startingRow) || startingRow > Number.MAX_SAFE_INTEGER - 5_001) {
    return null;
  }

  return startingRow;
}

function resolveSheetAndStartingRow(responseRange: string, configuredRange: string) {
  const sourceTab = parseSheetName(responseRange) ?? parseSheetName(configuredRange);
  const startingRow =
    parseStartingRow(responseRange) ?? parseStartingRow(configuredRange);

  if (sourceTab === null || sourceTab.length > 200 || startingRow === null) {
    throw new ConsultationSourceError(
      CONSULTATION_SOURCE_ERROR_CODES.rangeInvalid,
    );
  }

  return { sourceTab, startingRow };
}

function headerColumns(
  row: SourceCell[],
  headerMap: ConsultationSourceConfig["headerMap"],
) {
  const actualHeaders = row.map((value) => {
    if (typeof value !== "string") {
      return "";
    }

    return normalizeName(value);
  });
  const mappedHeaders = Object.entries(headerMap) as [HeaderField, string][];
  const columns = new Map<HeaderField, number>();

  for (const [field, configuredHeader] of mappedHeaders) {
    const normalizedHeader = normalizeName(configuredHeader);
    const matches = actualHeaders.flatMap((header, index) =>
      header === normalizedHeader ? [index] : [],
    );

    if (matches.length === 0) {
      throw new ConsultationSourceError(
        CONSULTATION_SOURCE_ERROR_CODES.headersMissing,
      );
    }

    if (matches.length > 1) {
      throw new ConsultationSourceError(
        CONSULTATION_SOURCE_ERROR_CODES.headersAmbiguous,
      );
    }

    const [column] = matches;
    if (column !== undefined) {
      columns.set(field, column);
    }
  }

  return columns;
}

function sourceCell(row: SourceCell[], column: number | undefined): string | null {
  if (column === undefined) {
    return null;
  }

  const value = row[column];
  if (value === undefined || value === null) {
    return null;
  }

  return String(value);
}

function isBlankApprovedRow(row: Record<string, unknown>) {
  return Object.values(row).every(
    (value) =>
      value === null ||
      (typeof value === "string" && value.trim().length === 0),
  );
}

function mapSourceRows(
  values: SourceCell[][],
  columns: Map<HeaderField, number>,
  startingRow: number,
): ConsultationSourceRow[] {
  const rows: ConsultationSourceRow[] = [];

  for (const [index, cells] of values.slice(1).entries()) {
    const sourceRowKey = `row:${startingRow + index + 1}`;
    const approvedFields = {
      career: sourceCell(cells, columns.get("career")),
      studentFirstName: sourceCell(cells, columns.get("studentFirstName")),
      studentLastName: sourceCell(cells, columns.get("studentLastName")),
      consultationDate: sourceCell(cells, columns.get("consultationDate")),
      tutor: sourceCell(cells, columns.get("tutor")),
      academicStage: sourceCell(cells, columns.get("academicStage")),
      modality: sourceCell(cells, columns.get("modality")),
      topic: sourceCell(cells, columns.get("topic")),
      contact: sourceCell(cells, columns.get("contact")),
    };

    if (isBlankApprovedRow(approvedFields)) {
      continue;
    }

    const sourceFingerprint = createHash("sha256")
      .update(JSON.stringify(approvedFields) ?? "")
      .digest("hex");

    rows.push({
      sourceRowKey,
      sourceFingerprint,
      ...approvedFields,
    });
  }

  return rows;
}

async function readBoundedBody(response: Response, maxBytes: number) {
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    throw new ConsultationSourceError(
      CONSULTATION_SOURCE_ERROR_CODES.responseTooLarge,
    );
  }

  const reader = response.body?.getReader();
  if (reader === undefined) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new ConsultationSourceError(
          CONSULTATION_SOURCE_ERROR_CODES.responseTooLarge,
        );
      }

      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ConsultationSourceError) {
      throw error;
    }

    throw mapRequestError(error);
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ConsultationSourceError(
      CONSULTATION_SOURCE_ERROR_CODES.responseInvalid,
    );
  }
}

function mapRequestError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return new ConsultationSourceError(CONSULTATION_SOURCE_ERROR_CODES.timeout);
  }

  return new ConsultationSourceError(
    CONSULTATION_SOURCE_ERROR_CODES.unavailable,
  );
}

export function createGoogleSheetsConsultationSourceAdapter(
  config: ConsultationSourceConfig,
  dependencies: ConsultationSourceAdapterDependencies = {},
): ConsultationSourceAdapter {
  const timeoutMs = dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = dependencies.maxResponseBytes ?? MAX_RESPONSE_BYTES;
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const authClient =
    dependencies.getAccessToken === undefined
      ? new JWT({
          email: config.serviceAccountEmail,
          key: config.privateKey,
          scopes: [SHEETS_READ_SCOPE],
          transporterOptions: { timeout: timeoutMs },
        })
      : null;

  async function getAccessToken() {
    if (dependencies.getAccessToken !== undefined) {
      try {
        const token = await dependencies.getAccessToken();
        if (token.trim().length === 0) {
          throw new Error("The credential provider returned no token.");
        }

        return token;
      } catch {
        throw new ConsultationSourceError(
          CONSULTATION_SOURCE_ERROR_CODES.credentialsInvalid,
        );
      }
    }

    try {
      if (authClient === null) {
        throw new Error("The credential provider is unavailable.");
      }

      const { token } = await authClient.getAccessToken();
      if (token === null || token === undefined || token.length === 0) {
        throw new Error("The credential provider returned no token.");
      }

      return token;
    } catch {
      throw new ConsultationSourceError(
        CONSULTATION_SOURCE_ERROR_CODES.credentialsInvalid,
      );
    }
  }

  return {
    async readRows({ maxRows }) {
      const accessToken = await getAccessToken();
      const endpoint = new URL(
        `/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(config.range)}`,
        SHEETS_VALUES_ENDPOINT,
      );
      endpoint.searchParams.set("majorDimension", "ROWS");
      endpoint.searchParams.set("valueRenderOption", "FORMATTED_VALUE");

      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          redirect: "error",
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        throw mapRequestError(error);
      }

      if (!response.ok) {
        throw new ConsultationSourceError(
          CONSULTATION_SOURCE_ERROR_CODES.providerError,
        );
      }

      const text = await readBoundedBody(response, maxResponseBytes);
      let body: unknown;
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new ConsultationSourceError(
          CONSULTATION_SOURCE_ERROR_CODES.responseInvalid,
        );
      }

      const parsed = valueRangeSchema.safeParse(body);
      if (!parsed.success || parsed.data.majorDimension === "COLUMNS") {
        throw new ConsultationSourceError(
          CONSULTATION_SOURCE_ERROR_CODES.responseInvalid,
        );
      }

      const values = parsed.data.values ?? [];
      if (values.length === 0) {
        throw new ConsultationSourceError(
          CONSULTATION_SOURCE_ERROR_CODES.headersMissing,
        );
      }

      if (values.length - 1 > maxRows) {
        throw new ConsultationSourceError(
          CONSULTATION_SOURCE_ERROR_CODES.rowLimitExceeded,
        );
      }

      const cellCount = values.reduce((count, row) => count + row.length, 0);
      if (cellCount > MAX_RESPONSE_CELLS) {
        throw new ConsultationSourceError(
          CONSULTATION_SOURCE_ERROR_CODES.cellLimitExceeded,
        );
      }

      const [headerRow] = values;
      if (headerRow === undefined) {
        throw new ConsultationSourceError(
          CONSULTATION_SOURCE_ERROR_CODES.headersMissing,
        );
      }

      const { sourceTab, startingRow } = resolveSheetAndStartingRow(
        parsed.data.range,
        config.range,
      );
      const columns = headerColumns(headerRow, config.headerMap);

      return {
        sourceTab,
        rows: mapSourceRows(values, columns, startingRow),
      };
    },
  };
}
