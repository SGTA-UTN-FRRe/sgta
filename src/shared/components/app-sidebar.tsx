"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
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

import { cn } from "@/shared/utils";
import { FaroIcon } from "@/shared/components/faro-icon";

export type AppSidebarVariant =
  | "admin"
  | "admin-expanded"
  | "admin-rail"
  | "mobile-drawer"
  | "tutor";

export interface AppSidebarProps {
  variant: AppSidebarVariant;
  user?: {
    name: string;
    role: "ADMIN" | "TUTOR";
  };
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ADMIN_PRIMARY_NAV: NavItem[] = [
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

const MOBILE_DIALOG_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isAdminVariant(variant: AppSidebarVariant) {
  return variant !== "tutor";
}

export function AppSidebar({ variant, user }: AppSidebarProps) {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDialogRef = useRef<HTMLElement | null>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationPending = useRef(false);
  const hasOpenedMobile = useRef(false);

  const isAdmin = isAdminVariant(variant);
  const primaryItems = isAdmin ? ADMIN_PRIMARY_NAV : TUTOR_NAV;
  const secondaryItems = isAdmin ? ADMIN_SECONDARY_NAV : [];
  const homeHref = isAdmin ? "/admin" : "/tutor";
  const productLabel = isAdmin ? "Navegación de administración" : "Navegación del tutor";
  const roleLabel = (user?.role ?? (isAdmin ? "ADMIN" : "TUTOR")) === "ADMIN"
    ? "Administrador"
    : "Tutor";

  const isLinkActive = (href: string): boolean => {
    if (href === "/admin" || href === "/tutor") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  };

  const closeMobileNav = () => setMobileOpen(false);

  useEffect(() => {
    if (mobileOpen) {
      hasOpenedMobile.current = true;
      mobileCloseRef.current?.focus();
      return;
    }

    if (hasOpenedMobile.current) {
      hasOpenedMobile.current = false;
      mobileTriggerRef.current?.focus();
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileNavigationPending.current) {
      return;
    }

    mobileNavigationPending.current = false;
    document
      .querySelector<HTMLElement>('main [data-slot="page-header"] h1[tabindex="-1"]')
      ?.focus();
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const drawer = mobileDialogRef.current;
      if (drawer === null) {
        return;
      }

      const focusableElements = Array.from(
        drawer.querySelectorAll<HTMLElement>(MOBILE_DIALOG_FOCUSABLE_SELECTOR),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (firstElement === undefined || lastElement === undefined) {
        event.preventDefault();
        return;
      }

      if (
        event.shiftKey &&
        (document.activeElement === firstElement ||
          !drawer.contains(document.activeElement))
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === lastElement ||
          !drawer.contains(document.activeElement))
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const renderNavItem = (item: NavItem) => {
    const active = isLinkActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => {
          if (mobileOpen && variant === "tutor" && pathname !== item.href) {
            mobileNavigationPending.current = true;
          }
          closeMobileNav();
        }}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        title={item.label}
        data-active={active ? "true" : "false"}
        className={cn(
          "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
          "focus-visible:z-10 focus-visible:outline-none",
          active
            ? "bg-nav-active font-semibold text-nav-active-foreground"
            : "text-nav-muted hover:bg-nav-hover hover:text-nav-foreground",
        )}
      >
        {active && (
          <span
            data-testid="faro-marker"
            className="absolute inset-y-2 left-0.5 w-1 rounded-r-full bg-nav-active-marker"
            aria-hidden="true"
          />
        )}
        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span className="truncate md:hidden lg:inline">{item.label}</span>
      </Link>
    );
  };

  const navContent = (isMobile = false) => (
    <div className="flex h-full min-h-0 flex-col bg-nav-background text-nav-foreground">
      <div className="flex min-h-20 items-center justify-between border-b border-border-subtle px-4 lg:px-5">
        <Link
          href={homeHref}
          onClick={closeMobileNav}
          aria-label="Tutorias UTN FRRe - inicio"
          aria-current={isLinkActive(homeHref) ? "page" : undefined}
          className="group flex min-w-0 items-center gap-3 rounded-md"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/40 bg-accent-surface text-accent transition-colors group-hover:border-accent">
            <FaroIcon className="h-7 w-7" />
          </span>
          <span className="min-w-0 md:hidden lg:flex lg:flex-col">
            <span className="truncate text-sm font-bold tracking-tight text-nav-foreground">
              Tutorias
            </span>
            <span className="truncate text-xs font-medium text-nav-muted">UTN FRRe · SGTA</span>
          </span>
        </Link>

        {isMobile && mobileOpen && (
          <button
            ref={mobileCloseRef}
            type="button"
            onClick={closeMobileNav}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-nav-muted hover:bg-nav-hover hover:text-nav-foreground md:hidden"
            aria-label="Cerrar navegación"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5" aria-label={productLabel}>
        <div className="space-y-1">{primaryItems.map(renderNavItem)}</div>

        {secondaryItems.length > 0 && (
          <div className="mt-6 border-t border-border-subtle pt-4">
            <p className="mb-2 px-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-nav-muted md:hidden lg:block">
              Sistema
            </p>
            <div className="space-y-1">{secondaryItems.map(renderNavItem)}</div>
          </div>
        )}
      </nav>

      <div className="border-t border-border-subtle p-3">
        <div className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-nav-muted">
          <UserRound className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
          {user === undefined ? (
            <span className="truncate md:hidden lg:inline">{roleLabel}</span>
          ) : (
            <span className="flex min-w-0 flex-col md:hidden lg:flex">
              <span className="truncate text-sm font-semibold text-nav-foreground">
                {user.name}
              </span>
              <span className="truncate text-xs text-nav-muted">{roleLabel}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const desktopSidebarClassName =
    variant === "admin-expanded"
      ? "flex w-[var(--sidebar-width)]"
      : variant === "admin-rail"
        ? "flex w-[var(--sidebar-width-collapsed)]"
        : variant === "mobile-drawer"
          ? "hidden"
          : "hidden md:flex md:w-[var(--sidebar-width-collapsed)] lg:w-[var(--sidebar-width)]";

  return (
    <>
      <div className="fixed left-4 top-4 z-40 md:hidden">
        <button
          ref={mobileTriggerRef}
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir navegación"
          aria-controls="sgta-mobile-navigation"
          aria-expanded={mobileOpen}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface text-foreground shadow-sm hover:bg-surface-subtle"
        >
          <Menu className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" data-slot="mobile-drawer">
          <button
            type="button"
            onClick={closeMobileNav}
            className="absolute inset-0 h-full w-full bg-brand-navy/20"
            aria-label="Cerrar navegación"
          />
          <aside
            id="sgta-mobile-navigation"
            className="relative z-10 h-full w-[min(var(--sidebar-width),calc(100%-2rem))] shadow-dialog"
            aria-label={productLabel}
            role="dialog"
            aria-modal="true"
            ref={mobileDialogRef}
          >
            {navContent(true)}
          </aside>
        </div>
      )}

      <aside
        className={cn(
          "sticky top-0 z-30 h-svh shrink-0 flex-col border-r border-border-subtle",
          desktopSidebarClassName,
        )}
        aria-label={productLabel}
        data-variant={
          variant === "tutor"
            ? "tutor"
            : variant === "mobile-drawer"
              ? "mobile-drawer"
              : "admin-responsive"
        }
      >
        {navContent(false)}
      </aside>
    </>
  );
}
