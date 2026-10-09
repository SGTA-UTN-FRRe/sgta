import type { ComponentProps } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import userEvent, { type UserEvent } from "@testing-library/user-event";

import { TooltipProvider } from "@/components/ui/tooltip";

import { AdminSidebar, AppShell, type AppShellProps } from "./app-shell";
import { PageHeader } from "./page-header";
import { RouteLoadingState } from "./route-loading-state";

const mocks = vi.hoisted(() => ({
  pathname: "/admin/tutors",
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/auth/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
// Keep geometry out of this keyboard and focus boundary; jsdom has no layout.
vi.mock("@/components/ui/dropdown-menu", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/dropdown-menu")>();
  return {
    ...actual,
    DropdownMenuContent: (props: ComponentProps<typeof actual.DropdownMenuContent>) => (
      <actual.DropdownMenuContent {...props} avoidCollisions={false} />
    ),
  };
});

const ADMIN_LINKS = [
  "Inicio", "Tutores", "Horarios", "Horas", "Consultas", "Reportes", "Configuración",
];

function renderShell(props: Omit<AppShellProps, "children">, children = <PageHeader title="Contenido" />) {
  return render(
    <TooltipProvider>
      <AppShell {...props}>{children}</AppShell>
    </TooltipProvider>,
  );
}

async function openAdminSheet(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "Abrir navegación" }));
  return screen.getByRole("dialog", { name: "Navegación de administración" });
}

async function openTutorAccountMenu(user: UserEvent) {
  screen.getByRole("button", { name: /^Cuenta de / }).focus();
  await user.keyboard("{Enter}");
  return screen.findByRole("menu");
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.pathname = "/admin/tutors";
});

describe("AppShell", () => {
  it.each(["responsive", "expanded", "rail"] as const)(
    "places Inicio first in the %s Admin sidebar",
    (layout) => {
      render(
        <TooltipProvider>
          <AdminSidebar layout={layout} />
        </TooltipProvider>,
      );
      const links = within(screen.getByRole("navigation")).getAllByRole("link");
      expect(links.map((link) => link.textContent?.trim())).toEqual(ADMIN_LINKS);
      expect(links.map((link) => link.getAttribute("href"))[0]).toBe("/admin");
      // Rail labels are visually hidden but remain each link's accessible name.
      expect(links[0]).toHaveAccessibleName("Inicio");
    },
  );

  it("places Inicio first in the Compact Admin sheet", async () => {
    const user = userEvent.setup();
    renderShell({ role: "admin" });
    const sheet = await openAdminSheet(user);
    const links = within(within(sheet).getByRole("navigation")).getAllByRole("link");
    expect(links.map((link) => link.textContent?.trim())).toEqual(ADMIN_LINKS);
    expect(links[0]).toHaveAttribute("href", "/admin");
  });

  it.each(["/admin", "/admin/tutors", "/admin/hours/movements"])(
    "marks Inicio current only on the exact home route when visiting %s",
    (pathname) => {
      mocks.pathname = pathname;
      render(
        <TooltipProvider>
          <AdminSidebar />
        </TooltipProvider>,
      );
      const home = screen.getByRole("link", { name: "Inicio" });
      if (pathname === "/admin") {
        expect(home).toHaveAttribute("aria-current", "page");
      } else {
        expect(home).not.toHaveAttribute("aria-current");
      }
      expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    },
  );

  it.each(["admin", "tutor"] as const)("makes the skip link the first focusable element in the %s shell", async (role) => {
    const user = userEvent.setup();
    mocks.pathname = role === "admin" ? "/admin" : "/tutor";
    renderShell({ role });
    await user.tab();
    const skipLink = screen.getByRole("link", { name: "Saltar al contenido principal" });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute("href", `#${role}-main-content`);
    expect(skipLink).toHaveClass("focus:z-skip-link");
    expect(screen.getByRole("main")).toHaveAttribute("id", `${role}-main-content`);
  });

  it.each([
    ["admin", "/admin/tutors", "/admin/schedules", "Horarios"],
    ["tutor", "/tutor", "/tutor/schedule", "Mi horario"],
  ] as const)("waits for the visible %s page heading after shell navigation suspends", async (role, initialPath, nextPath, title) => {
    const user = userEvent.setup();
    mocks.pathname = initialPath;
    const content = (state: "previous" | "loading" | "ready") => (
      <>
        <div style={{ display: state === "previous" ? undefined : "none" }}>
          <PageHeader title="Previous section" />
        </div>
        {state === "loading" && <RouteLoadingState />}
        {state === "ready" && <PageHeader title={title} />}
      </>
    );
    const view = (state: "previous" | "loading" | "ready") => (
      <TooltipProvider>
        <AppShell role={role}>{content(state)}</AppShell>
      </TooltipProvider>
    );
    const { rerender } = render(view("previous"));
    const scope = role === "admin" ? within(await openAdminSheet(user)) : screen;
    const link = scope.getByRole("link", { name: title });
    // Route changes are driven explicitly because jsdom cannot navigate.
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    await user.click(link);

    mocks.pathname = nextPath;
    rerender(view("loading"));
    if (role === "admin") {
      expect(screen.getByRole("button", { name: "Abrir navegación" })).toHaveFocus();
    }
    expect(screen.getByRole("status", { name: "Cargando sección" })).toBeInTheDocument();

    rerender(view("ready"));
    await waitFor(() => expect(screen.getByRole("heading", { name: title })).toHaveFocus());
  });

  it("offers sign-out without user data in the Admin shell", async () => {
    const user = userEvent.setup();
    mocks.signOut.mockResolvedValue({ error: null });
    renderShell({ role: "admin" });

    expect(screen.getByText("Administrador")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(button).toHaveAttribute("title", "Cerrar sesión");
    expect(button).toHaveClass("min-h-11");
    await user.click(button);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/login");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("offers sign-out without user data in the Tutor account menu", async () => {
    const user = userEvent.setup();
    mocks.pathname = "/tutor";
    mocks.signOut.mockResolvedValue({ error: null });
    renderShell({ role: "tutor" });

    const menu = within(await openTutorAccountMenu(user));
    expect(menu.getAllByText("Tutor").length).toBeGreaterThan(0);
    const item = menu.getByRole("menuitem", { name: "Cerrar sesión" });
    expect(item).toHaveClass("min-h-11");
    await user.click(item);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/login");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps pending and failed sign-out accessible in the Compact Admin sheet", async () => {
    const user = userEvent.setup();
    let resolveSignOut!: (value: { error: { message: string } }) => void;
    mocks.signOut.mockReturnValue(new Promise((resolve) => {
      resolveSignOut = resolve;
    }));
    renderShell({ role: "admin" });
    const sheet = within(await openAdminSheet(user));
    await user.click(sheet.getByRole("button", { name: "Cerrar sesión" }));
    expect(sheet.getByRole("button", { name: "Cerrando sesión…" })).toBeDisabled();

    await act(async () => { resolveSignOut({ error: { message: "Rejected" } }); });
    expect(sheet.getByRole("alert")).toHaveTextContent(
      "No se pudo cerrar la sesión. Intentar nuevamente.",
    );
    expect(sheet.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("keeps pending and failed sign-out visible in the Tutor account menu", async () => {
    const user = userEvent.setup();
    mocks.pathname = "/tutor";
    let resolveSignOut!: (value: { error: { message: string } }) => void;
    mocks.signOut.mockReturnValue(new Promise((resolve) => {
      resolveSignOut = resolve;
    }));
    renderShell({ role: "tutor" });
    const menu = within(await openTutorAccountMenu(user));
    await user.click(menu.getByRole("menuitem", { name: "Cerrar sesión" }));
    expect(menu.getByRole("menuitem", { name: "Cerrando sesión…" })).toHaveAttribute("aria-disabled", "true");

    await act(async () => { resolveSignOut({ error: { message: "Rejected" } }); });
    expect(menu.getByRole("alert")).toHaveTextContent(
      "No se pudo cerrar la sesión. Intentar nuevamente.",
    );
    expect(menu.getByRole("menuitem", { name: "Cerrar sesión" })).not.toHaveAttribute("aria-disabled");
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("renders all administrative links in the Admin shell", () => {
    renderShell({ role: "admin" });

    for (const label of ADMIN_LINKS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders only tutor links in the Tutor shell without admin links", () => {
    mocks.pathname = "/tutor";
    renderShell({ role: "tutor" });

    const navigation = screen.getByRole("navigation", { name: "Navegación del tutor" });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent?.trim())).toEqual([
      "Mi resumen", "Mi horario", "Mis horas",
    ]);
    expect(within(navigation).getByRole("link", { name: "Mi resumen" })).toHaveAttribute("aria-current", "page");

    expect(screen.queryByText("Configuración")).not.toBeInTheDocument();
    expect(screen.queryByText("Reportes")).not.toBeInTheDocument();
  });

  it("renders only safe authenticated display fields", async () => {
    const user = userEvent.setup();
    renderShell({ role: "admin", user: { name: "Admin Example", role: "ADMIN" } });

    expect(screen.getByText("Admin Example")).toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();

    mocks.pathname = "/tutor";
    renderShell({ role: "tutor", user: { name: "Tutor Example", role: "TUTOR" } });
    const menu = within(await openTutorAccountMenu(user));
    expect(menu.getByText("Tutor Example")).toBeInTheDocument();
    expect(menu.getByText("Tutor")).toBeInTheDocument();
  });

  it("renders the Faro Beam only on the active Admin link", () => {
    render(
      <TooltipProvider>
        <AdminSidebar />
      </TooltipProvider>,
    );
    const beam = screen.getByTestId("faro-beam");
    expect(screen.getAllByTestId("faro-beam")).toHaveLength(1);
    const tutors = screen.getByRole("link", { name: "Tutores" });
    expect(tutors).toHaveAttribute("aria-current", "page");
    expect(tutors).toContainElement(beam);
  });

  it("contains keyboard focus in the Compact Admin sheet and restores the trigger", async () => {
    const user = userEvent.setup();
    renderShell({ role: "admin" });

    const trigger = screen.getByRole("button", { name: "Abrir navegación" });
    const dialog = within(await openAdminSheet(user));

    expect(dialog.getByRole("button", { name: "Cerrar navegación" })).toHaveFocus();

    const brand = dialog.getByRole("link", { name: "Tutorías UTN FRRe - inicio" });
    const signOut = dialog.getByRole("button", { name: "Cerrar sesión" });

    signOut.focus();
    await user.tab();
    expect(brand).toHaveFocus();

    await user.tab({ shift: true });
    expect(signOut).toHaveFocus();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
