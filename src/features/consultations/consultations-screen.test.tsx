import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ConsultationReviewDetail,
  ConsultationWorkspace,
} from "./consultation-validation";
import {
  canonicalConsultation,
  consultationCareerId,
  consultationCareers,
  consultationFilters,
  consultationStagingId,
  consultationTutorId,
  consultationTutors,
  createConsultationWorkspace,
} from "./consultations-screen.fixtures";
import { ConsultationsScreen } from "./consultations-screen";

const candidateId = "66666666-6666-4666-8666-666666666666";
const peerStagingId = "77777777-7777-4777-8777-777777777777";
const subjectId = "88888888-8888-4888-8888-888888888888";

function reviewDetail(
  overrides: Partial<ConsultationReviewDetail> = {},
): ConsultationReviewDetail {
  return {
    id: consultationStagingId,
    status: "PENDING_REVIEW",
    classification: "PENDING_CLASSIFICATION",
    reviewVersion: 3,
    sourceRow: {
      sourceRowKey: "sheet-row-42",
      sourceFingerprint: "a".repeat(64),
      career: "Sistemas",
      studentFirstName: "Lucía",
      studentLastName: "Pérez",
      consultationDate: "18/09/2026",
      tutor: "Marina B.",
      academicStage: "Segundo año",
      modality: "Remota",
      topic: "Álgebra lineal",
      contact: "lucia@example.test",
    },
    normalized: {
      career: "Ingeniería en Sistemas de Información",
      careerId: consultationCareerId,
      studentFirstName: "Lucía",
      studentLastName: "Pérez",
      consultationDate: "2026-09-18",
      tutor: "Marina Benítez",
      tutorId: consultationTutorId,
      academicStage: "Segundo año",
      modality: "Remota",
      topic: "Álgebra lineal",
      contact: "lucia@example.test",
    },
    anomalyFlags: ["POSSIBLE_DUPLICATE"],
    acknowledgedAnomalies: [],
    canonical: null,
    duplicateCandidateCount: 1,
    duplicateCandidatesOffset: 0,
    duplicateCandidatesLimit: 100,
    duplicateCandidates: [
      {
        candidateId,
        peerStagingId,
        decision: "PENDING",
        duplicateStagingId: null,
        isCurrentDuplicate: false,
        peer: {
          consultationDate: "2026-09-18",
          studentFirstName: "Eva",
          studentLastName: "Ríos",
          career: "Ingeniería en Sistemas de Información",
          tutor: "Marina Benítez",
          status: "CONSOLIDATED",
          hasCanonical: true,
        },
      },
    ],
    references: {
      careers: consultationCareers,
      tutors: consultationTutors,
      subjects: [
        {
          id: subjectId,
          careerId: consultationCareerId,
          name: "Álgebra",
          status: "ACTIVE",
        },
      ],
    },
    ...overrides,
  };
}

function createQueueWorkspace(
  overrides: Partial<ConsultationWorkspace> = {},
) {
  return createConsultationWorkspace({
    rows: [],
    totalRows: 0,
    reviewQueue: [
      {
        stagingId: consultationStagingId,
        consultationDate: "2026-09-18",
        studentFirstName: "Lucía",
        studentLastName: "Pérez",
        career: "Ingeniería en Sistemas de Información",
        tutor: "Marina Benítez",
        status: "PENDING_REVIEW",
        classification: "PENDING_CLASSIFICATION",
        reviewVersion: 3,
        anomalyFlags: ["POSSIBLE_DUPLICATE"],
        acknowledgedAnomalies: [],
        hasCanonical: false,
      },
    ],
    pendingReviewCount: 1,
    ...overrides,
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function renderScreen(
  initialWorkspace: ConsultationWorkspace | null = createConsultationWorkspace(),
  options: {
    initialLoadError?: string;
    initialFilterError?: boolean;
    initialFilters?: typeof consultationFilters;
  } = {},
) {
  return render(
    <ConsultationsScreen
      careers={consultationCareers}
      initialFilterError={options.initialFilterError ?? false}
      initialFilters={options.initialFilters ?? consultationFilters}
      initialLoadError={options.initialLoadError}
      initialWorkspace={initialWorkspace}
      tutors={consultationTutors}
    />,
  );
}

function screenRoot() {
  const root = document.querySelector('[data-slot="consultations-screen"]');
  if (!root) throw new Error("Consultations screen was not rendered.");
  return root;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState(null, "", "/admin/consultations");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ConsultationsScreen", () => {
  it("renders the import status, pending count, canonical rows, and labeled contact", () => {
    renderScreen();

    expect(screen.getByRole("heading", { level: 1, name: "Consultas" })).toBeInTheDocument();
    expect(screenRoot()).toHaveAttribute("data-state", "default");
    expect(screen.getByRole("button", { name: "Actualizar consultas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Pendientes de revisión" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contacto de Lucía Pérez" })).toHaveAttribute(
      "href",
      "mailto:lucia%40example.test",
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByText("Álgebra lineal").length).toBeGreaterThan(0);
    expect(document.querySelector('ul[aria-label="Consultas registradas"]')).toHaveClass("md:hidden");
    expect(screen.getByRole("columnheader", { name: "Carrera" })).toHaveClass("hidden", "xl:table-cell");
  });

  it("keeps strict filter state in the URL and preserves it during import refresh", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse({
          outcome: "completed",
          summary: createConsultationWorkspace().import,
        });
      }
      return jsonResponse(createConsultationWorkspace());
    });
    renderScreen();

    await user.selectOptions(screen.getByLabelText("Carrera"), consultationCareerId);
    await waitFor(() => expect(window.location.search).toContain(`careerId=${consultationCareerId}`));
    await user.type(screen.getByRole("searchbox", { name: "Buscar consultas" }), "Lucía");
    await waitFor(() => expect(window.location.search).toContain("search=Luc%C3%ADa"));

    await user.click(screen.getByRole("button", { name: "Actualizar consultas" }));
    expect(await screen.findByText(/2 nuevas, 8 ya procesadas, 1 requieren revisión/)).toBeInTheDocument();
    expect(screenRoot()).toHaveAttribute("data-state", "success");

    const listRequests = fetchMock.mock.calls
      .filter(([input, init]) => init?.method !== "POST" && String(input).includes("/api/admin/consultations"));
    expect(listRequests.length).toBeGreaterThan(0);
    const lastListURL = new URL(String(listRequests.at(-1)?.[0]), "http://localhost");
    expect(lastListURL.searchParams.get("careerId")).toBe(consultationCareerId);
    expect(lastListURL.searchParams.get("search")).toBe("Lucía");
    expect(lastListURL.searchParams.get("unknown")).toBeNull();
  });

  it("disables repeated import submissions while one request is in progress", async () => {
    const user = userEvent.setup();
    let finishImport!: (response: Response) => void;
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Promise<Response>((resolve) => { finishImport = resolve; });
      }
      return Promise.resolve(jsonResponse(createConsultationWorkspace()));
    });
    renderScreen();

    const button = screen.getByRole("button", { name: "Actualizar consultas" });
    await user.click(button);
    await waitFor(() => expect(finishImport).toBeTypeOf("function"));
    expect(button).toBeDisabled();
    await user.click(button);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);

    finishImport(jsonResponse({ outcome: "completed", summary: createConsultationWorkspace().import }));
    expect(await screen.findByText(/Actualización completada:/)).toBeInTheDocument();
  });

  it("keeps canonical consultations visible when the source import is unavailable", async () => {
    const user = userEvent.setup();
    const failedSummary = {
      ...createConsultationWorkspace().import,
      status: "FAILED" as const,
      errorCode: "source_unavailable",
      errorRows: 1,
    };
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse({ error: "import_unavailable", summary: failedSummary }, 503);
      }
      return jsonResponse(createConsultationWorkspace({ import: failedSummary }));
    });
    renderScreen();

    await user.click(screen.getByRole("button", { name: "Actualizar consultas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo acceder a la fuente de consultas.",
    );
    expect(screen.getAllByText("Álgebra lineal").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screenRoot()).toHaveAttribute("data-state", "unavailable");
  });

  it("renders distinct empty, unavailable, and degraded states", () => {
    const emptyWorkspace = createConsultationWorkspace({ rows: [], totalRows: 0 });
    const { unmount } = renderScreen(emptyWorkspace);
    expect(screen.getByText("Todavía no hay consultas registradas")).toBeInTheDocument();
    expect(screenRoot()).toHaveAttribute("data-state", "empty");

    unmount();
    const failedWorkspace = createConsultationWorkspace({
      rows: [],
      totalRows: 0,
      import: { ...createConsultationWorkspace().import, status: "FAILED", errorCode: "source_unavailable" },
    });
    const unavailable = renderScreen(failedWorkspace);
    expect(screen.getByText("No se pudo acceder a la fuente de consultas.")).toBeInTheDocument();
    expect(screenRoot()).toHaveAttribute("data-state", "unavailable");

    unavailable.unmount();
    const degradedWorkspace = createConsultationWorkspace({
      import: { ...createConsultationWorkspace().import, status: "PARTIAL", errorRows: 2 },
    });
    renderScreen(degradedWorkspace);
    expect(screen.getByText("Actualización parcial")).toBeInTheDocument();
    expect(screenRoot()).toHaveAttribute("data-state", "degraded");
  });

  it("shows local error and loading feedback while retaining a safe retry path", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    renderScreen(null, { initialLoadError: "No se pudo cargar la lista de consultas. Reintentar." });

    expect(screenRoot()).toHaveAttribute("data-state", "error");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Cargando consultas…")).toBeInTheDocument();
    expect(screenRoot()).toHaveAttribute("data-state", "loading");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    resolveFetch(jsonResponse(createConsultationWorkspace()));
    expect(await screen.findAllByText("Álgebra lineal")).not.toHaveLength(0);
  });

  it("shows search-empty after a successful import and rejects invalid URL filters", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === "POST"
        ? jsonResponse({ outcome: "completed", summary: createConsultationWorkspace().import })
        : jsonResponse(createConsultationWorkspace({ rows: [], totalRows: 0, reviewQueue: [] })),
    );
    renderScreen();

    await user.click(screen.getByRole("button", { name: "Actualizar consultas" }));
    expect(await screen.findByText(/Actualización completada:/)).toBeInTheDocument();
    expect(screenRoot()).toHaveAttribute("data-state", "success");
    await user.type(screen.getByRole("searchbox", { name: "Buscar consultas" }), "sin coincidencias");

    expect(await screen.findByText("No hay resultados para estos filtros")).toBeInTheDocument();
    expect(screenRoot()).toHaveAttribute("data-state", "search-empty");

    const { unmount } = renderScreen(createConsultationWorkspace(), { initialFilterError: true });
    expect(screen.getByRole("alert")).toHaveTextContent("Los filtros de la dirección no son válidos.");
    expect(window.location.search).toBe("");
    unmount();
  });

  it("reviews raw and normalized values, validates explicit decisions, contains focus, and recovers focus", async () => {
    const user = userEvent.setup();
    const initialReview = reviewDetail();
    const consolidatedReview = reviewDetail({
      status: "CONSOLIDATED",
      classification: "GENERAL",
      acknowledgedAnomalies: ["POSSIBLE_DUPLICATE"],
      duplicateCandidates: [{
        ...initialReview.duplicateCandidates[0],
        decision: "NOT_DUPLICATE",
      }],
    });
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        expect(body.expectedVersion).toBe(3);
        expect(body.careerId).toBe(consultationCareerId);
        expect(body.tutorId).toBe(consultationTutorId);
        expect(body.classification).toBe("GENERAL");
        expect(body.duplicateDecisions).toEqual([{ candidateId, decision: "NOT_DUPLICATE" }]);
        return jsonResponse({ outcome: "consolidated", review: consolidatedReview });
      }
      if (url.includes("/review/")) return jsonResponse({ review: initialReview });
      return jsonResponse(createConsultationWorkspace({ rows: [canonicalConsultation] }));
    });
    renderScreen(createQueueWorkspace());

    const trigger = screen.getByRole("button", { name: "Revisar a Lucía Pérez" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Detalle de Lucía Pérez" });
    expect(within(dialog).getByText("18/09/2026")).toBeInTheDocument();
    expect(within(dialog).getByText("2026-09-18")).toBeInTheDocument();
    expect(within(dialog).getByText("La consulta podría estar repetida.")).toBeInTheDocument();
    expect(within(dialog).getByText("Eva Ríos")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cerrar detalle" })).toHaveFocus();

    await user.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: /^Cerrar$/ })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    const reopenedDialog = await screen.findByRole("dialog", { name: "Detalle de Lucía Pérez" });
    await user.click(within(reopenedDialog).getByRole("button", { name: "Guardar revisión" }));
    expect(within(reopenedDialog).getByRole("alert")).toHaveTextContent("confirmá cada observación");

    await user.click(within(reopenedDialog).getByRole("checkbox", { name: "Confirmo que revisé esta observación" }));
    await user.click(within(reopenedDialog).getByRole("button", { name: "Guardar revisión" }));
    expect(within(reopenedDialog).getByRole("alert")).toHaveTextContent("Indicá si cada posible duplicado");

    await user.selectOptions(
      within(reopenedDialog).getByLabelText("Decisión para el posible duplicado de Eva Ríos"),
      "NOT_DUPLICATE",
    );
    await user.selectOptions(within(reopenedDialog).getByLabelText("Clasificación"), "GENERAL");
    await user.click(within(reopenedDialog).getByRole("button", { name: "Guardar revisión" }));

    expect(await within(reopenedDialog).findByText("La consulta quedó consolidada.")).toBeInTheDocument();
    expect(await within(reopenedDialog).findByText(/Este registro ya tiene un estado final/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Revisar a Lucía Pérez" })).not.toBeInTheDocument());
    await user.click(within(reopenedDialog).getByRole("button", { name: /^Cerrar$/ }));
    await waitFor(() => expect(screenRoot()).toHaveFocus());
  });

  it("recovers a stale review conflict by refreshing the current detail", async () => {
    const user = userEvent.setup();
    const detail = reviewDetail();
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "PATCH") return jsonResponse({ error: "stale_review" }, 409);
      if (url.includes("/review/")) return jsonResponse({ review: detail });
      return jsonResponse(createQueueWorkspace());
    });
    renderScreen(createQueueWorkspace());
    await user.click(screen.getByRole("button", { name: "Revisar a Lucía Pérez" }));
    const dialog = await screen.findByRole("dialog", { name: "Detalle de Lucía Pérez" });
    await user.click(within(dialog).getByRole("checkbox", { name: "Confirmo que revisé esta observación" }));
    await user.selectOptions(within(dialog).getByLabelText("Decisión para el posible duplicado de Eva Ríos"), "NOT_DUPLICATE");
    await user.click(within(dialog).getByRole("button", { name: "Guardar revisión" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("La consulta cambió");
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes("/review/")).length).toBeGreaterThan(1);
  });
});
