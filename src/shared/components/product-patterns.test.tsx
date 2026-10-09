import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CareerLegend, ConfirmationDialog, DataTable, FilterBar, FormField, PageHeader, RouteErrorState, RouteLoadingState, SystemState, type LegendCareer } from "./index";

describe("PageHeader actions", () => {
  it("omits a breadcrumb that only repeats the primary destination", () => {
    render(<PageHeader title="Configuración" breadcrumbs={[{ label: "Configuración" }]} />);
    expect(screen.queryByRole("navigation", { name: "Migas de pan" })).not.toBeInTheDocument();
  });
  it("keeps quiet actions beside a single primary action", () => {
    render(<PageHeader title="Horarios" secondaryActions={<Button variant="ghost">Ver historial</Button>} action={<Button>Agregar asignación</Button>} />);
    expect(screen.getByRole("heading", { name: "Horarios" })).toHaveClass("font-display");
    expect(screen.getByRole("button", { name: "Ver historial" })).toHaveAttribute("data-variant", "ghost");
    expect(screen.getByRole("button", { name: "Agregar asignación" })).toHaveAttribute("data-variant", "default");
    expect(screen.queryByRole("navigation", { name: "Migas de pan" })).not.toBeInTheDocument();
  });
});

describe("FormField", () => {
  it("associates the visible label, helper and error with its control", () => {
    render(<FormField id="email" label="Correo" description="Correo institucional." error="El correo es obligatorio."><Input /></FormField>);
    const control = screen.getByRole("textbox", { name: "Correo" });
    expect(control).toHaveAccessibleDescription("Correo institucional. El correo es obligatorio.");
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("El correo es obligatorio.");
  });
  it("preserves an existing control id and external descriptions", () => {
    render(<><p id="external">Referencia adicional.</p><FormField id="field" label="Nombre" description="Nombre completo."><Input id="custom" aria-describedby="external" /></FormField></>);
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveAttribute("id", "custom");
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveAccessibleDescription("Referencia adicional. Nombre completo.");
  });
  it("removes field error associations after correction", () => {
    const { rerender } = render(<FormField id="name" label="Nombre" error="El nombre es obligatorio."><Input /></FormField>);
    rerender(<FormField id="name" label="Nombre"><Input /></FormField>);
    expect(screen.getByRole("textbox", { name: "Nombre" })).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("textbox", { name: "Nombre" })).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("DataTable", () => {
  const rows = [{ id: "camila", name: "Camila Pérez", minutes: 90 }];
  const props = {
    label: "Tutores", rows, getRowKey: (row: typeof rows[number]) => row.id,
    identityColumn: { id: "name", header: "Tutor", cell: (row: typeof rows[number]) => row.name },
    columns: [{ id: "minutes", header: "Minutos", numeric: true, cell: (row: typeof rows[number]) => row.minutes }]
  };
  it("exposes row identities, column headers and inline actions in both layouts", async () => {
    const user = userEvent.setup();
    const edit = vi.fn();
    render(<DataTable {...props} stickyHeader rowActions={(row) => <Button onClick={edit}>Editar {row.name}</Button>} />);
    const table = screen.getByRole("table", { name: "Tutores" });
    expect(within(table).getByRole("rowheader", { name: "Camila Pérez" })).toHaveAttribute("scope", "row");
    expect(within(table).getByRole("columnheader", { name: "Minutos" })).toHaveAttribute("scope", "col");
    expect(within(table).getByRole("cell", { name: "90" })).toHaveClass("text-right", "tabular-nums");
    await user.click(within(table).getByRole("button", { name: "Editar Camila Pérez" }));
    const list = screen.getByRole("list", { name: "Tutores" });
    expect(within(list).getByText("Camila Pérez")).toBeInTheDocument();
    expect(within(list).getByText("Minutos").tagName).toBe("DT");
    await user.click(within(list).getByRole("button", { name: "Editar Camila Pérez" }));
    expect(edit).toHaveBeenCalledTimes(2);
  });
  it("announces loading without exposing stale rows", () => {
    render(<DataTable {...props} loading />);
    expect(screen.getByRole("status", { name: "Cargando registros" })).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Camila Pérez")).not.toBeInTheDocument();
  });
  it("shows an empty state and accepts recovery slots", () => {
    const { rerender } = render(<DataTable {...props} rows={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Sin resultados");
    rerender(<DataTable {...props} rows={[]} empty={<SystemState variant="empty" title="Sin coincidencias" action={<Button>Limpiar filtros</Button>} />} />);
    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument();
    rerender(<DataTable {...props} error={<SystemState variant="error" title="No se pudo cargar" />} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("FilterBar", () => {
  function Filters() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    return <FilterBar search={{ id: "search", label: "Buscar tutor", value: search, onChange: setSearch }}
      filters={[{ id: "status", label: "Estado", value: status, onChange: setStatus, options: [{ value: "", label: "Todos" }, { value: "active", label: "Activo" }] }]}
      resultCount={search || status ? 1 : 3} hasActiveFilters={!!search || !!status} onClear={() => { setSearch(""); setStatus(""); }} />;
  }
  it("labels controls and clears only active filters", async () => {
    const user = userEvent.setup();
    render(<Filters />);
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Buscar tutor" }), "Camila");
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "active");
    expect(screen.getByRole("status")).toHaveTextContent("1 resultado");
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("3 resultados");
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
  });
});

describe("CareerLegend", () => {
  const careers: LegendCareer[] = [{ id: "systems", name: "Ingeniería en Sistemas de Información", color: "BLUE" }, { id: "chemical", name: "Ingeniería Química", color: "EMERALD" }];
  function Legend() {
    const [visible, setVisible] = useState(careers.map(({ id }) => id));
    return <CareerLegend careers={careers} visibleCareerIds={visible} onVisibleCareerIdsChange={setVisible} />;
  }
  it("toggles careers with the keyboard and restores all careers", async () => {
    const user = userEvent.setup();
    render(<Legend />);
    const systems = screen.getByRole("button", { name: careers[0].name });
    expect(systems).toHaveTextContent("ISI");
    expect(systems).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mostrar todas" })).toBeDisabled();
    systems.focus();
    await user.keyboard(" ");
    expect(systems).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 1 de 2 carreras");
    await user.click(screen.getByRole("button", { name: careers[1].name }));
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 0 de 2 carreras");
    await user.click(screen.getByRole("button", { name: "Mostrar todas" }));
    expect(systems).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 2 de 2 carreras");
  });
});

describe("ConfirmationDialog", () => {
  it("names the dialog, shows its summary and returns focus after cancellation", async () => {
    const user = userEvent.setup();
    function Confirmation() {
      const [open, setOpen] = useState(false);
      return <ConfirmationDialog open={open} onOpenChange={setOpen} title="Eliminar asignación" description="Revisar antes de continuar." summary={<p>Camila Pérez · Lunes</p>} trigger={<Button>Eliminar</Button>} onConfirm={vi.fn()} destructive />;
    }
    render(<Confirmation />);
    const trigger = screen.getByRole("button", { name: "Eliminar" });
    await user.click(trigger);
    const dialog = screen.getByRole("alertdialog", { name: "Eliminar asignación" });
    expect(dialog).toHaveAccessibleDescription("Revisar antes de continuar.");
    expect(within(dialog).getByText("Camila Pérez · Lunes")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirmar" })).toHaveAttribute("data-variant", "destructive");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("keeps confirmation open during submission and blocks repeated actions or dismissal", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    function Confirmation() {
      const [open, setOpen] = useState(true);
      const [pending, setPending] = useState(false);
      return <ConfirmationDialog open={open} onOpenChange={setOpen} title="Confirmar asignación" description="Revisar los datos." pending={pending} onConfirm={() => { submit(); setPending(true); }} />;
    }
    render(<Confirmation />);
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getByRole("alertdialog")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Confirmando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Confirmando…" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

describe("SystemState and route states", () => {
  it.each(["empty", "error", "required-action", "degraded", "permission"] as const)("announces %s with a recovery action", (variant) => {
    render(<SystemState variant={variant} title="Estado de la sección" description="Información de contexto." action={<Button>Continuar</Button>} />);
    expect(screen.getByRole(variant === "error" ? "alert" : "status")).toHaveTextContent("Información de contexto.");
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
  });
  it("preserves the route loading announcement and structured placeholders", () => {
    const { container } = render(<RouteLoadingState />);
    expect(screen.getByRole("status", { name: "Cargando sección" })).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });
  it("preserves route error copy, retry and role-specific home link", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<RouteErrorState retry={retry} homeHref="/tutor" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("No se pudo cargar esta sección");
    expect(screen.getByRole("alert")).toHaveTextContent("Intentar nuevamente. Si el problema continúa, avisar a la administración.");
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/tutor");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
