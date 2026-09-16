import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  goldenScreenFixtures,
  goldenScreenStateFixtures,
} from "@/features/golden-screens/fixtures";

import { AdminOverviewScreen } from "./admin-overview-screen";

const fixture = goldenScreenFixtures.adminOverview;
const adminStates = goldenScreenStateFixtures["admin-overview"];

describe("AdminOverviewScreen", () => {
  it("connects the cycle context, attention destinations, and upcoming duties", () => {
    render(<AdminOverviewScreen fixture={fixture} />);

    expect(screen.getByRole("heading", { level: 1, name: "Inicio" })).toBeInTheDocument();
    expect(screen.getByText(fixture.cycle.name)).toBeInTheDocument();
    expect(screen.getByText(fixture.cycle.statusLabel)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Necesita atención" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Asistencia pendiente/i }),
    ).toHaveAttribute("href", fixture.attention[0].href);
    expect(
      screen.getByRole("link", { name: /Consultas por revisar/i }),
    ).toHaveAttribute("href", fixture.attention[2].href);
    expect(
      screen.getByRole("heading", { level: 2, name: "Hoy" }),
    ).toBeInTheDocument();
    expect(screen.getByText(fixture.upcomingDuties[0].tutor)).toBeInTheDocument();
  });

  it("keeps the empty attention state useful while retaining today's list", () => {
    render(<AdminOverviewScreen fixture={fixture} state="empty" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      fixture.emptyAttentionLabel,
    );
    expect(screen.getByText(/la operación del ciclo está al día/i)).toBeInTheDocument();
    expect(screen.getByText(fixture.upcomingDuties[0].tutor)).toBeInTheDocument();
  });

  it("degrades only the consultations item and preserves internal operations", () => {
    const degraded = adminStates.find((item) => item.state === "degraded");

    render(<AdminOverviewScreen fixture={fixture} state="degraded" />);

    expect(degraded).toBeDefined();
    expect(screen.getByRole("status")).toHaveTextContent(degraded!.title);
    expect(screen.getByRole("link", { name: /Reintentar consultas/i })).toHaveAttribute(
      "href",
      "/admin/consultas",
    );
    expect(screen.getByText(fixture.attention[0].label)).toBeInTheDocument();
    expect(screen.queryByText(fixture.attention[2].label)).not.toBeInTheDocument();
    expect(screen.getByText(fixture.upcomingDuties[0].tutor)).toBeInTheDocument();
  });

  it("uses structural loading placeholders for both operational sections", () => {
    render(<AdminOverviewScreen fixture={fixture} state="loading" />);

    expect(screen.getByRole("status", { name: "Cargando atención" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Cargando guardias" })).toBeInTheDocument();
  });

  it("makes the required cycle prerequisite explicit", () => {
    const requiredAction = adminStates.find((item) => item.state === "required-action");

    render(<AdminOverviewScreen fixture={fixture} state="required-action" />);

    expect(requiredAction).toBeDefined();
    expect(screen.getByRole("status")).toHaveTextContent(requiredAction!.title);
    expect(screen.getByRole("link", { name: /Configurar ciclo/i })).toHaveAttribute(
      "href",
      "/admin/configuracion",
    );
    expect(screen.queryByRole("heading", { name: "Hoy" })).not.toBeInTheDocument();
  });

  it("announces an attention error with a recovery destination", () => {
    const error = adminStates.find((item) => item.state === "error");

    render(<AdminOverviewScreen fixture={fixture} state="error" />);

    expect(error).toBeDefined();
    expect(screen.getByRole("alert")).toHaveTextContent(error!.title);
    expect(screen.getByRole("link", { name: /Reintentar/i })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByText(fixture.upcomingDuties[0].tutor)).toBeInTheDocument();
  });
});
