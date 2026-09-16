import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  adminOverviewScreenData,
  adminOverviewStateFixtures,
} from "@/mocks/admin-overview.mock";

import { AdminOverviewScreen } from "./admin-overview-screen";

const data = adminOverviewScreenData;
const adminStates = adminOverviewStateFixtures;

describe("AdminOverviewScreen", () => {
  it("connects the cycle context, attention destinations, and upcoming duties", () => {
    render(<AdminOverviewScreen data={data} />);

    expect(screen.getByRole("heading", { level: 1, name: "Inicio" })).toBeInTheDocument();
    expect(screen.getByText(data.cycle.name)).toBeInTheDocument();
    expect(screen.getByText(data.cycle.statusLabel)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Necesita atención" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Asistencia pendiente/i }),
    ).toHaveAttribute("href", data.attention[0].href);
    expect(
      screen.getByRole("link", { name: /Consultas por revisar/i }),
    ).toHaveAttribute("href", data.attention[2].href);
    expect(
      screen.getByRole("heading", { level: 2, name: "Hoy" }),
    ).toBeInTheDocument();
    expect(screen.getByText(data.upcomingDuties[0].tutor)).toBeInTheDocument();
  });

  it("keeps the empty attention state useful while retaining today's list", () => {
    render(<AdminOverviewScreen data={data} state="empty" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      data.emptyAttentionLabel,
    );
    expect(screen.getByText(/la operación del ciclo está al día/i)).toBeInTheDocument();
    expect(screen.getByText(data.upcomingDuties[0].tutor)).toBeInTheDocument();
  });

  it("degrades only the consultations item and preserves internal operations", () => {
    const degraded = adminStates.find((item) => item.state === "degraded");

    render(<AdminOverviewScreen data={data} state="degraded" />);

    expect(degraded).toBeDefined();
    expect(screen.getByRole("status")).toHaveTextContent(degraded!.title);
    expect(screen.getByRole("link", { name: /Reintentar consultas/i })).toHaveAttribute(
      "href",
      "/admin/consultations",
    );
    expect(screen.getByText(data.attention[0].label)).toBeInTheDocument();
    expect(screen.queryByText(data.attention[2].label)).not.toBeInTheDocument();
    expect(screen.getByText(data.upcomingDuties[0].tutor)).toBeInTheDocument();
  });

  it("uses structural loading placeholders for both operational sections", () => {
    render(<AdminOverviewScreen data={data} state="loading" />);

    expect(screen.getByRole("status", { name: "Cargando atención" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Cargando guardias" })).toBeInTheDocument();
  });

  it("makes the required cycle prerequisite explicit", () => {
    const requiredAction = adminStates.find((item) => item.state === "required-action");

    render(<AdminOverviewScreen data={data} state="required-action" />);

    expect(requiredAction).toBeDefined();
    expect(screen.getByRole("status")).toHaveTextContent(requiredAction!.title);
    expect(screen.getByRole("link", { name: /Configurar ciclo/i })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
    expect(screen.queryByRole("heading", { name: "Hoy" })).not.toBeInTheDocument();
  });

  it("announces an attention error with a recovery destination", () => {
    const error = adminStates.find((item) => item.state === "error");

    render(<AdminOverviewScreen data={data} state="error" />);

    expect(error).toBeDefined();
    expect(screen.getByRole("alert")).toHaveTextContent(error!.title);
    expect(screen.getByRole("link", { name: /Reintentar/i })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByText(data.upcomingDuties[0].tutor)).toBeInTheDocument();
  });
});
