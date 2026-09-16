import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  tutorsScreenData,
  tutorsStateFixtures,
} from "@/mocks/tutors.mock";

import { TutorsScreen } from "./tutors-screen";

const data = tutorsScreenData;
const tutorStates = tutorsStateFixtures;

describe("TutorsScreen", () => {
  it("renders the operational hierarchy and accessible row actions", () => {
    render(<TutorsScreen data={data} />);

    expect(screen.getByRole("heading", { level: 1, name: "Tutores" })).toBeInTheDocument();
    expect(screen.getByText(data.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar tutor" })).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar tutor")).toHaveAttribute(
      "placeholder",
      data.searchPlaceholder,
    );
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Acciones para Benítez, Marina" }),
    ).toHaveLength(3);
    expect(screen.getAllByText("Benítez, Marina")).not.toHaveLength(0);
  });

  it("filters locally by search and status without changing the screen data", async () => {
    const user = userEvent.setup();
    render(<TutorsScreen data={data} />);

    await user.type(screen.getByRole("searchbox", { name: "Buscar tutor" }), "Diego");

    expect(screen.queryByText("Benítez, Marina")).not.toBeInTheDocument();
    expect(screen.getAllByText("Sosa, Diego")).not.toHaveLength(0);

    await user.clear(screen.getByRole("searchbox", { name: "Buscar tutor" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "inactive");

    expect(screen.queryByText("Benítez, Marina")).not.toBeInTheDocument();
    expect(screen.getAllByText("Sosa, Diego")).not.toHaveLength(0);
  });

  it("opens a named side sheet and returns focus after Escape", async () => {
    const user = userEvent.setup();
    render(<TutorsScreen data={data} />);

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
    render(<TutorsScreen data={data} />);
    await user.click(screen.getByRole("button", { name: "Agregar tutor" }));

    const sheet = screen.getByRole("dialog", { name: "Agregar tutor" });
    const closeButton = within(sheet).getByRole("button", {
      name: "Cerrar panel de tutor",
    });
    const submitButton = within(sheet).getByRole("button", {
      name: "Guardar vista previa",
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
    render(<TutorsScreen data={data} />);

    const rowAction = screen.getAllByRole("button", {
      name: "Acciones para Benítez, Marina",
    })[0];
    await user.click(rowAction);
    await user.click(screen.getByRole("menuitem", { name: "Ver detalle" }));
    await user.keyboard("{Escape}");

    expect(document.activeElement).toBe(rowAction);
  });

  it("exposes the empty, search-empty, error, success, and required states", () => {
    const searchEmpty = tutorStates.find((state) => state.state === "search-empty");
    const error = tutorStates.find((state) => state.state === "error");
    const required = tutorStates.find((state) => state.state === "required-action");

    const { rerender } = render(<TutorsScreen data={data} state="empty" />);
    expect(screen.getByRole("status")).toHaveTextContent(data.emptyTitle);
    expect(screen.getAllByRole("button", { name: data.emptyAction })).toHaveLength(2);

    rerender(<TutorsScreen data={data} state="search-empty" />);
    expect(screen.getByRole("status")).toHaveTextContent(searchEmpty!.title);

    rerender(<TutorsScreen data={data} state="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent(error!.title);
    expect(screen.getByRole("link", { name: error!.actionLabel })).toHaveAttribute(
      "href",
      "/admin/tutors",
    );

    rerender(<TutorsScreen data={data} state="success" />);
    expect(screen.getByRole("status")).toHaveTextContent("Vista actualizada");

    rerender(<TutorsScreen data={data} state="required-action" />);
    expect(screen.getByRole("status")).toHaveTextContent(required!.title);
    expect(
      screen.getAllByRole("link", { name: required!.actionLabel }),
    ).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: required!.actionLabel })[0]).toHaveAttribute(
      "href",
      "/admin/settings",
    );
  });
});
