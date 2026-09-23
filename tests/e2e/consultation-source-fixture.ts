import { createServer, type Server } from "node:http";

import { E2E_CONSULTATION_CONTACT } from "./e2e-test-data";

const spreadsheetId = "e2e_consultation_source";
const expectedPath = `/v4/spreadsheets/${spreadsheetId}/values/Consultations!A:I`;
const authorization = "Bearer sgta-test-consultation-reader-token";
const headers = [
  "Career",
  "Student first name",
  "Student last name",
  "Consultation date",
  "Tutor",
  "Academic stage",
  "Modality",
  "Topic",
  "Contact",
];

const sourceRows = [
  [
    "Computer Science",
    "Casey",
    "Duplicate",
    "2027-01-15",
    "Ada",
    "First year",
    "Remote",
    "Algorithms",
    E2E_CONSULTATION_CONTACT,
  ],
  [
    "Computer Science",
    "Casey",
    "Duplicate",
    "2027-01-15",
    "Ada",
    "First year",
    "Remote",
    "Algorithms",
    E2E_CONSULTATION_CONTACT,
  ],
  [
    "Computer Science",
    "Riley",
    "Pending",
    "2027-01-17",
    "Grace",
    "Second year",
    "Remote",
    "Data Structures",
    "riley.pending@example.test",
  ],
];

export type StartedConsultationSourceFixture = {
  apiBaseUrl: string;
  close: () => Promise<void>;
};

function respond(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

export async function startConsultationSourceFixture(): Promise<StartedConsultationSourceFixture> {
  let readCount = 0;
  const sourceServer: Server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const requestPath = decodeURIComponent(requestUrl.pathname);

    if (request.method !== "GET" || requestPath !== expectedPath) {
      respond(response, 405, { error: "fixture_read_only" });
      return;
    }
    if (request.headers.authorization !== authorization) {
      respond(response, 401, { error: "fixture_token_required" });
      return;
    }

    readCount += 1;
    if (readCount >= 4) {
      respond(response, 503, { error: "fixture_source_unavailable" });
      return;
    }

    const rows = readCount === 3
      ? [
          ...sourceRows,
          [
            "Computer Science",
            "X".repeat(201),
            "Malformed",
            "2027-01-19",
            "Ada",
            "First year",
            "Remote",
            "Algorithms",
            "malformed@example.test",
          ],
        ]
      : sourceRows;

    respond(response, 200, {
      range: `Consultations!A1:I${rows.length + 1}`,
      majorDimension: "ROWS",
      values: [headers, ...rows],
    });
  });

  await new Promise<void>((resolve, reject) => {
    sourceServer.once("error", reject);
    sourceServer.listen(0, "127.0.0.1", resolve);
  });

  const address = sourceServer.address();
  if (address === null || typeof address === "string") {
    await new Promise<void>((resolve) => sourceServer.close(() => resolve()));
    throw new Error("The consultation source fixture did not bind to a TCP port.");
  }

  return {
    apiBaseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        sourceServer.close((error) => error ? reject(error) : resolve());
      }),
  };
}
