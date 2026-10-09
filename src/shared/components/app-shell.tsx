"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Clock3,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FaroIcon } from "@/shared/components/faro-icon";
import { PageContainer } from "@/shared/components/page-container";
import {
  SIGN_OUT_ERROR_MESSAGE,
  SignOutButton,
  SignOutIcon,
  useSignOut,
} from "@/shared/components/sign-out-button";
import { cn } from "@/shared/utils";

export interface AppShellUser {
  name: string;
  role: "ADMIN" | "TUTOR";
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ADMIN_PRIMARY_NAV: NavItem[] = [
  { label: "Inicio", href: "/admin", icon: LayoutDashboard },
  { label: "Tutores", href: "/admin/tutors", icon: Users },
  { label: "Horarios", href: "/admin/schedules", icon: Calendar },
  { label: "Horas", href: "/admin/hours", icon: Clock3 },
  { label: "Consultas", href: "/admin/consultations", icon: MessageSquare },
  { label: "Reportes", href: "/admin/reports", icon: BarChart3 },
];

const ADMIN_SECONDARY_NAV: NavItem[] = [
  { label: "Configuración", href: "/admin/settings", icon: Settings },
];

const TUTOR_NAV: NavItem[] = [
  { label: "Mi resumen", href: "/tutor", icon: LayoutDashboard },
  { label: "Mi horario", href: "/tutor/schedule", icon: Calendar },
  { label: "Mis horas", href: "/tutor/hours", icon: Clock3 },
];

const ADMIN_NAVIGATION_LABEL = "Navegación de administración";
const TUTOR_NAVIGATION_LABEL = "Navegación del tutor";

function isLinkActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/tutor") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

function roleLabel(role: AppShellUser["role"]) {
  return role === "ADMIN" ? "Administrador" : "Tutor";
}

/**
 * Moves focus to the new page heading once a route change started from the
 * shell navigation finishes loading. Returns the callback that marks it pending.
 */
function usePageHeadingFocus(pathname: string) {
  const navigationPending = useRef(false);

  useEffect(() => {
    if (!navigationPending.current) {
      return;
    }

    const main = document.querySelector("main");
    if (main === null) return;

    const focusPageHeading = () => {
      const headings = Array.from(
        main.querySelectorAll<HTMLElement>('[data-slot="page-header"] h1'),
      );
      const heading = headings.find((candidate) => {
        // Next.js preserves previous pages in hidden React Activity boundaries.
        for (
          let element: HTMLElement | null = candidate;
          element !== null;
          element = element.parentElement
        ) {
          if (element.hidden || element.style.display === "none") return false;
        }
        return true;
      });

      if (heading === undefined) return false;

      heading.focus();
      navigationPending.current = false;
      return true;
    };

    if (focusPageHeading()) return;

    const observer = new MutationObserver(() => {
      if (focusPageHeading()) observer.disconnect();
    });
    observer.observe(main, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "style"],
    });
    return () => observer.disconnect();
  }, [pathname]);

  return useCallback(
    (href: string) => {
      if (href !== pathname) navigationPending.current = true;
    },
    [pathname],
  );
}

function BrandLink({
  href,
  labelClassName,
  onClick,
}: {
  href: string;
  labelClassName?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label="Tutorías UTN FRRe - inicio"
      className="group flex min-h-11 min-w-0 items-center gap-3 rounded-md"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-faro/40 bg-muted text-faro transition-colors group-hover:border-faro">
        <FaroIcon className="size-7" />
      </span>
      <span className={cn("flex min-w-0 flex-col", labelClassName)}>
        <span className="truncate text-sm font-bold text-sidebar-foreground">Tutorías</span>
        <span className="truncate text-xs font-medium text-sidebar-muted-foreground">
          UTN FRRe · SGTA
        </span>
      </span>
    </Link>
  );
}

export type AdminSidebarLayout = "responsive" | "expanded" | "rail";

/** Label visibility per layout; rail labels stay in the accessible name. */
const RAIL_LABEL: Record<AdminSidebarLayout, string | undefined> = {
  responsive: "md:max-lg:sr-only",
  expanded: undefined,
  rail: "sr-only",
};

/** Visible text hidden in the rail, where an icon and accessible name remain. */
const RAIL_HIDDEN: Record<AdminSidebarLayout, string | undefined> = {
  responsive: "md:max-lg:hidden",
  expanded: undefined,
  rail: "hidden",
};

function AdminNavLink({
  item,
  active,
  layout,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  layout: AdminSidebarLayout;
  onNavigate?: (href: string) => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={() => onNavigate?.(item.href)}
      aria-current={active ? "page" : undefined}
      data-active={active ? "true" : "false"}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-full px-4 text-sm transition-colors",
        layout === "rail" && "justify-center px-0",
        layout === "responsive" && "md:max-lg:justify-center md:max-lg:px-0",
        active
          ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
          : "font-medium text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      {active && (
        <span
          data-testid="faro-beam"
          className="absolute top-1/2 left-1.5 h-5 w-1 -translate-y-1/2 rounded-full bg-sidebar-marker"
          aria-hidden="true"
        />
      )}
      <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span className={cn("truncate", RAIL_LABEL[layout])}>{item.label}</span>
    </Link>
  );

  if (layout === "expanded") {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className={layout === "responsive" ? "lg:hidden" : undefined}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export interface AdminSidebarProps {
  layout?: AdminSidebarLayout;
  user?: AppShellUser;
  /** Overrides the current route; the design preview uses it to show the active pill. */
  currentPath?: string;
  closeControl?: ReactNode;
  onNavigate?: (href: string) => void;
}

/** Admin navigation: brand, primary destinations, spacer, secondary destinations, account. */
export function AdminSidebar({
  layout = "responsive",
  user,
  currentPath,
  closeControl,
  onNavigate,
}: AdminSidebarProps) {
  const routePath = usePathname() ?? "";
  const pathname = currentPath ?? routePath;
  const renderItem = (item: NavItem) => (
    <li key={item.href}>
      <AdminNavLink
        item={item}
        active={isLinkActive(pathname, item.href)}
        layout={layout}
        onNavigate={onNavigate}
      />
    </li>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex min-h-20 items-center justify-between gap-2 border-b border-sidebar-border px-4",
          layout !== "rail" && "lg:px-5",
        )}
      >
        <BrandLink
          href="/admin"
          labelClassName={RAIL_HIDDEN[layout]}
          onClick={() => onNavigate?.("/admin")}
        />
        {closeControl}
      </div>

      <nav
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-5"
        aria-label={ADMIN_NAVIGATION_LABEL}
      >
        <ul className="space-y-1">{ADMIN_PRIMARY_NAV.map(renderItem)}</ul>
        <ul className="mt-auto space-y-1 pt-6">{ADMIN_SECONDARY_NAV.map(renderItem)}</ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex min-h-11 items-center gap-3 px-4 text-sm text-sidebar-muted-foreground",
            layout === "rail" && "justify-center px-0",
            layout === "responsive" && "md:max-lg:justify-center md:max-lg:px-0",
          )}
        >
          <UserRound className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className={cn("flex min-w-0 flex-col", RAIL_HIDDEN[layout])}>
            {user !== undefined && (
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                {user.name}
              </span>
            )}
            <span className="truncate text-xs text-sidebar-muted-foreground">
              {roleLabel(user?.role ?? "ADMIN")}
            </span>
          </span>
        </div>
        <SignOutButton
          className={cn(
            "mt-1 w-full justify-start gap-3 px-4 text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
            layout === "rail" && "justify-center px-0",
            layout === "responsive" && "md:max-lg:justify-center md:max-lg:px-0",
          )}
          labelClassName={RAIL_HIDDEN[layout]}
          errorClassName={cn(
            layout === "rail" &&
              "absolute bottom-0 left-full z-nav ml-2 w-60 rounded-md border border-border bg-card p-3 shadow-lg",
            layout === "responsive" &&
              "md:max-lg:absolute md:max-lg:bottom-0 md:max-lg:left-full md:max-lg:z-nav md:max-lg:ml-2 md:max-lg:w-60 md:max-lg:rounded-md md:max-lg:border md:max-lg:border-border md:max-lg:bg-card md:max-lg:p-3 md:max-lg:shadow-lg",
          )}
        />
      </div>
    </div>
  );
}

function AdminShell({ user, children }: { user?: AppShellUser; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [navigationOpen, setNavigationOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const markNavigation = usePageHeadingFocus(pathname);

  return (
    <div className="flex min-h-svh bg-background">
      <SkipLink target="admin-main-content" />
      <div className="hidden shrink-0 border-r border-sidebar-border bg-sidebar md:block md:w-sidebar-rail lg:w-sidebar">
        <div className="sticky top-0 z-nav h-svh">
          <AdminSidebar user={user} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center gap-2 border-b border-sidebar-border bg-sidebar px-4 md:hidden">
          <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir navegación">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              size="nav"
              showCloseButton={false}
              aria-describedby={undefined}
              className="gap-0 rounded-l-none border-sidebar-border bg-sidebar"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                closeRef.current?.focus();
              }}
            >
              <SheetTitle className="sr-only">{ADMIN_NAVIGATION_LABEL}</SheetTitle>
              <AdminSidebar
                layout="expanded"
                user={user}
                onNavigate={(href) => {
                  markNavigation(href);
                  setNavigationOpen(false);
                }}
                closeControl={
                  <SheetClose asChild>
                    <Button
                      ref={closeRef}
                      variant="ghost"
                      size="icon"
                      aria-label="Cerrar navegación"
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </SheetClose>
                }
              />
            </SheetContent>
          </Sheet>
          <BrandLink href="/admin" />
        </header>

        <PageContainer as="main" id="admin-main-content" className="flex-1">
          {children}
        </PageContainer>
      </div>
    </div>
  );
}

function TutorAccountMenu({ user }: { user?: AppShellUser }) {
  const { pending, failed, label, signOut } = useSignOut();
  const role = roleLabel(user?.role ?? "TUTOR");
  const name = user?.name ?? role;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`Cuenta de ${name}`}
          className="min-w-0 max-w-60 px-3 max-md:min-w-11"
        >
          <UserRound aria-hidden="true" />
          <span className="truncate max-md:sr-only">{name}</span>
          <ChevronDown className="max-md:hidden" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-semibold">{name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-11"
          disabled={pending}
          aria-busy={pending}
          onSelect={(event) => {
            // Keep the menu open so pending and failure states stay visible.
            event.preventDefault();
            void signOut();
          }}
        >
          <SignOutIcon pending={pending} />
          {label}
        </DropdownMenuItem>
        {failed && (
          <p role="alert" className="px-2 py-1.5 text-sm wrap-break-word text-destructive">
            {SIGN_OUT_ERROR_MESSAGE}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface TutorTopBarProps {
  user?: AppShellUser;
  /** Overrides the current route; the design preview uses it to show the active pill. */
  currentPath?: string;
  onNavigate?: (href: string) => void;
}

/** Tutor navigation: brand, destination pills, and account menu. */
export function TutorTopBar({ user, currentPath, onNavigate }: TutorTopBarProps) {
  const routePath = usePathname() ?? "";
  const pathname = currentPath ?? routePath;

  return (
    <header className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex w-full max-w-page flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6 lg:px-8">
        <div className="min-w-0 flex-1 md:flex-none">
          <BrandLink href="/tutor" onClick={() => onNavigate?.("/tutor")} />
        </div>
        <nav
          aria-label={TUTOR_NAVIGATION_LABEL}
          className="order-last w-full md:order-none md:w-auto md:flex-1"
        >
          <ul className="grid grid-cols-3 gap-1 md:flex md:justify-center">
            {TUTOR_NAV.map((item) => {
              const active = isLinkActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => onNavigate?.(item.href)}
                    aria-current={active ? "page" : undefined}
                    data-active={active ? "true" : "false"}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors max-md:min-h-11 md:px-4",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0 max-md:hidden" strokeWidth={2} aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <TutorAccountMenu user={user} />
      </div>
    </header>
  );
}

function TutorShell({ user, children }: { user?: AppShellUser; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const markNavigation = usePageHeadingFocus(pathname);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SkipLink target="tutor-main-content" />
      <TutorTopBar user={user} onNavigate={markNavigation} />
      <PageContainer as="main" id="tutor-main-content" className="flex-1">
        {children}
      </PageContainer>
    </div>
  );
}

function SkipLink({ target }: { target: string }) {
  return (
    <a
      href={`#${target}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-skip-link focus:rounded-md focus:bg-card focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg"
    >
      Saltar al contenido principal
    </a>
  );
}

export interface AppShellProps {
  role: "admin" | "tutor";
  user?: AppShellUser;
  children: ReactNode;
}

/** Role application shell: skip link, role navigation, and the main content region. */
export function AppShell({ role, user, children }: AppShellProps) {
  return role === "admin" ? (
    <AdminShell user={user}>{children}</AdminShell>
  ) : (
    <TutorShell user={user}>{children}</TutorShell>
  );
}
