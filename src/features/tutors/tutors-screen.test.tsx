import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SafeTutorDetail, SafeTutorListItem } from "./tutor-service";
import {
  tutorsCatalogOptions,
  tutorsScreenData,
  tutorsStateFixtures,
} from "./tutors-screen.fixtures";
import { TutorsScreen } from "./tutors-screen";

const data = tutorsScreenData;
const catalogOptions = tutorsCatalogOptions;
const tutorStates = tutorsStateFixtures;
const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

function detailFor(tutor: SafeTutorListItem = data.rows[0]): SafeTutorDetail {
  return {
    ...tutor,
    subjects: tutor.id === data.rows[0].id ? catalogOptions.subjects : [],
    memberships:
      tutor.currentCycle === null
        ? []
        : [
            {
              cycle: tutor.currentCycle,
              scholarshipReference: tutor.scholarshipReference,
              createdAt: tutor.createdAt,
              updatedAt: tutor.updatedAt,
            },
          ],
  };
}

function renderScreen(state?: "default" | "loading" | "empty" | "search-empty" | "error" | "success" | "required-action") {
  return render(
    <TutorsScreen
      catalogOptions={catalogOptions}
      data={data}
      state={state}
    />,
  );
}

describe("TutorsScreen", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    window.history.replaceState({}, "", "/admin/tutors");
  });

  it("renders the operational hierarchy and accessible row actions", () => {
    renderScreen();

    expect(screen.getByRole("heading", { level: 1, name: "Tutores" })).toBeInTheDocument();
    expect(screen.getByText(data.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar tutor" })).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar tutor")).toHaveAttribute(
      "placeholder",
      data.searchPlaceholder,
    );
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(
      screen.getAllByRole("button", {
        name: `Acciones para ${data.rows[0].formalName}`,
      }),
    ).toHaveLength(3);
    expect(screen.getAllByText(data.rows[0].formalName)).not.toHaveLength(0);
  });

  it("loads server-backed search and status filters", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const query = url.searchParams.get("search")?.toLowerCase() ?? "";
      const status = url.searchParams.get("status");
      const careerId = url.searchParams.get("careerId");
      const tutors = data.rows.filter((tutor) => {
        const matchesSearch =
          query === "" ||
          tutor.formalName.toLowerCase().includes(query) ||
          String(tutor.institutionalIdentifier ?? "").toLowerCase().includes(query);
        const matchesStatus = status === null || tutor.status === status;
        const matchesCareer = careerId === null || tutor.primaryCareer.id === careerId;

        return matchesSearch && matchesStatus && matchesCareer;
      });

      return Response.json({ tutors });
    });

    renderScreen();

    await user.type(screen.getByRole("searchbox", { name: "Buscar tutor" }), "Diego");

    await waitFor(() => {
      expect(screen.queryByText(data.rows[0].formalName)).not.toBeInTheDocument();
      expect(screen.getAllByText(data.rows[3].formalName)).not.toHaveLength(0);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/tutors?search=Diego"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    await user.clear(screen.getByRole("searchbox", { name: "Buscar tutor" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "inactive");

    await waitFor(() => {
      expect(screen.queryByText(data.rows[0].formalName)).not.toBeInTheDocument();
      expect(screen.getAllByText(data.rows[3].formalName)).not.toHaveLength(0);
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("status=INACTIVE"),
      expect.anything(),
    );
  });

  it("opens a named side sheet and returns focus after Escape", async () => {
    const user = userEvent.setup();
    renderScreen();

    const addButton = screen.getByRole("button", { name: "Agregar tutor" });
    await user.click(addButton);

    const sheet = screen.getByRole("dialog", { name: "Agregar tutor" });
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(within(sheet).getByRole("heading", { name: "Identidad" })).toBeInTheDocument();
    expect(within(sheet).getByRole("heading", { name: "Materias" })).toBeInTheDocument();
    expect(document.activeElement).toBe(
      within(sheet).getByRole("button", { name: "Cerrar panel de tutor" }),
    );

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(addButton);
  });

  it("keeps focus inside the side sheet when tabbing past its ends", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("button", { name: "Agregar tutor" }));

    const sheet = screen.getByRole("dialog", { name: "Agregar tutor" });
    const closeButton = within(sheet).getByRole("button", {
      name: "Cerrar panel de tutor",
    });
    const submitButton = within(sheet).getByRole("button", {
      name: "Agregar tutor",
    });

    submitButton.focus();
    await user.tab();
    expect(document.activeElement).toBe(closeButton);

    closeButton.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(submitButton);
  });

  it("returns focus to the row action that opened the tutor sheet", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(Response.json({ tutor: detailFor() }));
    renderScreen();

    const rowAction = screen.getAllByRole("button", {
      name: `Acciones para ${data.rows[0].formalName}`,
    })[0];
    await user.click(rowAction);
    await user.click(screen.getByRole("menuitem", { name: "Ver detalle" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await user.keyboard("{Escape}");

    await waitFor(() => expect(document.activeElement).toBe(rowAction));
  });

  it("recovers from a failed detail request without losing the sheet context", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: "internal_server_error" }, { status: 500 }),
    );
    renderScreen();

    await user.click(screen.getAllByRole("button", {
      name: `Acciones para ${data.rows[0].formalName}`,
    })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument());
    fetchMock.mockResolvedValueOnce(Response.json({ tutor: detailFor() }));
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.queryByText("No se pudo guardar el cambio. Intentar nuevamente.")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("creates a tutor with catalog selections and closes only after success", async () => {
    const user = userEvent.setup();
    const created = detailFor({
      ...data.rows[0],
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      firstName: "Ana",
      lastName: "Gómez",
      formalName: "Gómez, Ana",
      subjectCount: 1,
    });
    fetchMock.mockResolvedValue(Response.json({ tutor: created }, { status: 201 }));
    renderScreen();

    await user.click(screen.getByRole("button", { name: "Agregar tutor" }));
    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Apellido"), "Gómez");
    const sheet = screen.getByRole("dialog", { name: "Agregar tutor" });
    await user.selectOptions(
      within(sheet).getByLabelText("Carrera"),
      catalogOptions.careers[0].id,
    );
    await user.click(screen.getByRole("checkbox", { name: catalogOptions.subjects[0].name }));
    await user.selectOptions(
      screen.getByLabelText("Referencia de beca (opcional)"),
      catalogOptions.scholarshipReferences[0].id,
    );
    await user.click(screen.getByRole("button", { name: "Agregar tutor" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/tutors",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          firstName: "Ana",
          lastName: "Gómez",
          preferredDisplayName: null,
          institutionalIdentifier: null,
          primaryCareerId: catalogOptions.careers[0].id,
          subjectIds: [catalogOptions.subjects[0].id],
          cycleId: catalogOptions.currentCycle?.id,
          scholarshipReferenceId: catalogOptions.scholarshipReferences[0].id,
        }),
      }),
    );
  });

  it("preserves input and field errors when a mutation fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: "invalid_request",
          issues: [{ path: ["firstName"], message: "El nombre no es válido." }],
        },
        { status: 422 },
      ),
    );
    renderScreen();

    await user.click(screen.getByRole("button", { name: "Agregar tutor" }));
    await user.type(screen.getByLabelText("Nombre"), "Marina");
    await user.type(screen.getByLabelText("Apellido"), "Benítez");
    const sheet = screen.getByRole("dialog", { name: "Agregar tutor" });
    await user.selectOptions(
      within(sheet).getByLabelText("Carrera"),
      catalogOptions.careers[0].id,
    );
    await user.click(screen.getByRole("button", { name: "Agregar tutor" }));

    await waitFor(() => expect(screen.getByText("El nombre no es válido.")).toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Marina");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("edits a tutor through the persisted detail and update endpoints", async () => {
    const user = userEvent.setup();
    const detail = detailFor();
    const updated = { ...detail, lastName: "Pérez", formalName: "Pérez, Marina" };
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === undefined) {
        return Response.json({ tutor: detail });
      }

      return Response.json({ tutor: updated });
    });
    renderScreen();

    await user.click(screen.getAllByRole("button", {
      name: `Acciones para ${data.rows[0].formalName}`,
    })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));
    await waitFor(() => expect(screen.getByLabelText("Apellido")).toHaveValue(data.rows[0].lastName));
    await user.clear(screen.getByLabelText("Apellido"));
    await user.type(screen.getByLabelText("Apellido"), "Pérez");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados");
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/tutors/${data.rows[0].id}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ lastName: "Pérez" }),
      }),
    );
  });

  it("requires confirmation and preserves the tutor when deactivating", async () => {
    const user = userEvent.setup();
    const inactive = detailFor({ ...data.rows[0], status: "INACTIVE" });
    fetchMock.mockResolvedValue(Response.json({ tutor: inactive }));
    renderScreen();

    await user.click(screen.getAllByRole("button", {
      name: `Acciones para ${data.rows[0].formalName}`,
    })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Desactivar tutor" }));

    const confirmation = screen.getByRole("alertdialog", { name: "Desactivar tutor" });
    expect(confirmation).toHaveTextContent("Sus materias y antecedentes de ciclo se conservarán.");
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Desactivar tutor" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados"));
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/tutors/${data.rows[0].id}/status`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "INACTIVE" }),
      }),
    );
    expect(screen.getAllByText("Inactivo")).not.toHaveLength(0);
  });

  it("exposes the empty, search-empty, error, success, and required states", async () => {
    const searchEmpty = tutorStates.find((state) => state.state === "search-empty");
    const error = tutorStates.find((state) => state.state === "error");
    const required = tutorStates.find((state) => state.state === "required-action");

    const { rerender } = renderScreen("empty");
    expect(screen.getByRole("status")).toHaveTextContent(data.emptyTitle);
    expect(screen.getAllByRole("button", { name: data.emptyAction })).toHaveLength(2);

    rerender(<TutorsScreen catalogOptions={catalogOptions} data={data} state="search-empty" />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(searchEmpty!.title));

    rerender(<TutorsScreen catalogOptions={catalogOptions} data={data} state="error" />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(error!.title));
    expect(screen.getByRole("button", { name: error!.actionLabel })).toBeInTheDocument();

    rerender(<TutorsScreen catalogOptions={catalogOptions} data={data} state="success" />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados"));

    rerender(<TutorsScreen catalogOptions={catalogOptions} data={data} state="required-action" />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(required!.title));
    expect(screen.getAllByRole("link", { name: required!.actionLabel })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: required!.actionLabel })[0]).toHaveAttribute(
      "href",
      "/admin/settings",
    );
  });
});
