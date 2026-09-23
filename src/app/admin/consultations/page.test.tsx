import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConsultationWorkspace: vi.fn(),
  getDatabase: vi.fn(),
  listCareers: vi.fn(),
  listTutors: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/features/consultations/consultation-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/consultations/consultation-service")
  >();
  return { ...actual, getConsultationWorkspace: mocks.getConsultationWorkspace };
});
vi.mock("@/features/tutors/tutor-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/tutors/tutor-service")>();
  return {
    ...actual,
    listCareers: mocks.listCareers,
    listTutors: mocks.listTutors,
  };
});

import AdminConsultationsPage from "./page";
import {
  consultationCareerId,
  consultationCareers,
  createConsultationWorkspace,
} from "@/features/consultations/consultations-screen.fixtures";

const database = { marker: "database" };

describe("AdminConsultationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      id: "admin-user",
      name: "Admin",
      email: "admin@example.test",
      role: "ADMIN",
    });
    mocks.getDatabase.mockReturnValue(database);
    mocks.getConsultationWorkspace.mockResolvedValue(createConsultationWorkspace());
    mocks.listCareers.mockResolvedValue(consultationCareers);
    mocks.listTutors.mockResolvedValue([
      { id: "22222222-2222-4222-8222-222222222222", formalName: "Marina Benítez", status: "ACTIVE" },
    ]);
  });

  it("requires Admin access and loads the initial workspace from strict URL filters", async () => {
    const page = await AdminConsultationsPage({
      searchParams: Promise.resolve({
        careerId: consultationCareerId,
        search: "Lucía",
      }),
    });
    render(page);

    expect(mocks.requireRole).toHaveBeenCalledWith("ADMIN");
    expect(mocks.getConsultationWorkspace).toHaveBeenCalledWith(database, {
      status: "ALL",
      careerId: consultationCareerId,
      search: "Lucía",
      limit: 50,
      offset: 0,
    });
    expect(mocks.listCareers).toHaveBeenCalledWith(database, "ALL");
    expect(mocks.listTutors).toHaveBeenCalledWith(database, {
      status: "ALL",
      limit: 200,
      offset: 0,
    });
    expect(screen.getByRole("heading", { level: 1, name: "Consultas" })).toBeInTheDocument();
  });

  it("rejects unknown query keys and safely falls back to the unfiltered workspace", async () => {
    const page = await AdminConsultationsPage({
      searchParams: Promise.resolve({ unexpected: "private-value" }),
    });
    render(page);

    expect(mocks.getConsultationWorkspace).toHaveBeenCalledWith(database, {
      status: "ALL",
      limit: 50,
      offset: 0,
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Los filtros de la dirección no son válidos.");
    expect(screen.queryByText("private-value")).not.toBeInTheDocument();
  });

  it("renders a safe page error without exposing database details", async () => {
    mocks.getConsultationWorkspace.mockRejectedValue(
      new Error("private database hostname and credentials"),
    );
    const page = await AdminConsultationsPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la lista de consultas.");
    expect(screen.queryByText(/private database hostname/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
