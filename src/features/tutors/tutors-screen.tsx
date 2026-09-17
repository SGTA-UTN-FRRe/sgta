"use client";

import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Settings2,
  UserRound,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  SafeCareer,
  SafeTutorDetail,
  SafeTutorListItem,
} from "@/features/tutors/tutor-service";
import type {
  TutorStateFixture,
  TutorsCatalogOptions,
  TutorsScreenData,
  TutorsScreenState,
} from "@/features/tutors/tutor-screen-types";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge, type StatusBadgeVariant } from "@/shared/components/status-badge";
import { cn } from "@/shared/utils";

export type { TutorsCatalogOptions, TutorsScreenData, TutorsScreenState } from "@/features/tutors/tutor-screen-types";

export const tutorsStateFixtures: TutorStateFixture[] = [
  {
    state: "loading",
    title: "Cargando tutores",
    description: "Estamos preparando la lista de tutores.",
  },
  {
    state: "empty",
    title: "Todavía no hay tutores",
    description: "Agregar el primer tutor para comenzar a organizar la cobertura.",
    actionLabel: "Agregar tutor",
  },
  {
    state: "search-empty",
    title: "No encontramos tutores",
    description: "Probar con otro nombre o limpiar los filtros.",
    actionLabel: "Limpiar filtros",
  },
  {
    state: "error",
    title: "No se pudo cargar la lista",
    description: "Reintentar para volver a consultar los tutores.",
    actionLabel: "Reintentar",
  },
  {
    state: "required-action",
    title: "Abrir un ciclo para gestionar tutores",
    description:
      "Es necesario contar con un ciclo abierto para incorporar tutores al período actual.",
    actionLabel: "Configurar ciclo",
  },
];

export interface TutorsScreenProps {
  data: TutorsScreenData;
  catalogOptions?: TutorsCatalogOptions;
  requiredAction?: "catalog" | "cycle";
  state?: TutorsScreenState;
}

type FilterStatus = "all" | "active" | "inactive";
type SheetMode = "add" | "edit" | "view";
type SheetState = {
  mode: SheetMode;
  tutor?: SafeTutorListItem;
} | null;
type StatusRequest = {
  tutor: SafeTutorListItem;
  trigger: HTMLElement;
} | null;

type TutorFormValues = {
  firstName: string;
  lastName: string;
  preferredDisplayName: string;
  institutionalIdentifier: string;
  primaryCareerId: string;
  subjectIds: string[];
  cycleId: string;
  scholarshipReferenceId: string;
};

type TutorFormSubmitOptions = {
  changedFields: string[];
  subjectsChanged: boolean;
  membershipChanged: boolean;
};

type TutorValidationIssue = {
  path: Array<string | number>;
  message: string;
};

class TutorRequestError extends Error {
  readonly code: string;
  readonly issues: TutorValidationIssue[];
  readonly status: number;

  constructor(
    code: string,
    status: number,
    issues: TutorValidationIssue[] = [],
  ) {
    super(code);
    this.name = "TutorRequestError";
    this.code = code;
    this.issues = issues;
    this.status = status;
  }
}

const selectClassName =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const stateVariants: Record<SafeTutorListItem["status"], StatusBadgeVariant> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
};

const tutorErrorMessages: Record<string, string> = {
  duplicate_subject_assignment:
    "No se puede asignar la misma materia m\\u00e1s de una vez.",
  unauthorized: "La sesión expiró. Volver a iniciar sesión para continuar.",
  forbidden: "No tienes permisos para administrar tutores.",
  invalid_request: "Revisar los datos ingresados antes de guardar.",
  open_cycle_required: "Abrir un ciclo para incorporar un tutor al período actual.",
  cycle_required_for_membership_change:
    "Seleccionar el ciclo abierto para actualizar la beca del tutor.",
  cycle_not_found: "No se encontró el ciclo seleccionado.",
  cycle_not_open: "El ciclo seleccionado ya no está abierto.",
  tutor_not_found: "No se encontró el tutor solicitado. Actualizar la lista e intentar nuevamente.",
  career_not_found: "La carrera seleccionada ya no está disponible.",
  subject_not_found: "Una de las materias seleccionadas ya no está disponible.",
  scholarship_reference_not_found:
    "La referencia de beca seleccionada ya no está disponible.",
  duplicate_institutional_identifier:
    "El identificador institucional ya está asociado a otro tutor.",
  career_subject_mismatch: "Las materias deben pertenecer a la carrera seleccionada.",
  inactive_career: "La carrera seleccionada está inactiva.",
  inactive_subject: "Una de las materias seleccionadas está inactiva.",
  inactive_scholarship_reference:
    "La referencia de beca seleccionada está inactiva.",
  catalog_conflict: "No se puede modificar esa relación porque conserva datos históricos.",
  status_already_set: "El tutor ya tiene ese estado.",
  internal_server_error: "No se pudo guardar el cambio. Intentar nuevamente.",
};

function getTutorErrorMessage(error: unknown, fallback = "No se pudo completar la solicitud.") {
  if (error instanceof TutorRequestError) {
    return tutorErrorMessages[error.code] ?? fallback;
  }

  return fallback;
}

function getFieldErrors(error: unknown) {
  if (!(error instanceof TutorRequestError)) {
    return {};
  }

  return error.issues.reduce<Record<string, string>>((errors, issue) => {
    const field = issue.path.find((segment): segment is string => typeof segment === "string");

    if (field !== undefined && errors[field] === undefined) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
}

function getErrorCode(body: unknown) {
  if (typeof body === "object" && body !== null && "error" in body) {
    const code = (body as { error?: unknown }).error;

    if (typeof code === "string") {
      return code;
    }
  }

  return "internal_server_error";
}

function getErrorIssues(body: unknown) {
  if (typeof body !== "object" || body === null || !("issues" in body)) {
    return [];
  }

  const issues = (body as { issues?: unknown }).issues;

  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.filter(
    (issue): issue is TutorValidationIssue =>
      typeof issue === "object" &&
      issue !== null &&
      "path" in issue &&
      Array.isArray((issue as { path?: unknown }).path) &&
      "message" in issue &&
      typeof (issue as { message?: unknown }).message === "string",
  );
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  let response: Response;

  try {
    response = await fetch(input, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new TutorRequestError("internal_server_error", 500);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new TutorRequestError(
      getErrorCode(body),
      response.status,
      getErrorIssues(body),
    );
  }

  return body as T;
}

function statusLabel(status: SafeTutorListItem["status"]) {
  return status === "ACTIVE" ? "Activo" : "Inactivo";
}

function scholarshipLabel(tutor: SafeTutorListItem) {
  return tutor.scholarshipReference?.type ?? "Sin referencia";
}

function cycleLabel(tutor: SafeTutorListItem) {
  return tutor.currentCycleLabel ?? "Sin ciclo abierto";
}

function matchesTutorFilters(
  tutor: SafeTutorListItem,
  search: string,
  careerId: string,
  status: FilterStatus,
) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const searchFields = [
    tutor.formalName,
    tutor.firstName,
    tutor.lastName,
    tutor.preferredDisplayName,
    tutor.institutionalIdentifier,
    tutor.primaryCareer.name,
    tutor.scholarshipReference?.type,
  ];

  return (
    (normalizedSearch === "" ||
      searchFields.some((field) =>
        field?.toLocaleLowerCase().includes(normalizedSearch),
      )) &&
    (careerId === "" || tutor.primaryCareer.id === careerId) &&
    (status === "all" || tutor.status === status.toUpperCase())
  );
}

function findStateData(
  state: TutorsScreenState,
  requiredAction: "catalog" | "cycle",
): TutorStateFixture | undefined {
  if (state === "default" || state === "success") {
    return undefined;
  }

  if (state === "required-action" && requiredAction === "catalog") {
    return {
      state,
      title: "Completar el catálogo académico",
      description:
        "Es necesario contar con al menos una carrera activa para gestionar tutores.",
      actionLabel: "Configurar catálogo",
    };
  }

  return tutorsStateFixtures.find((stateData) => stateData.state === state);
}

function formatTutorCount(count: number) {
  return `${count} ${count === 1 ? "tutor" : "tutores"}`;
}

function TutorStatus({ tutor }: { tutor: SafeTutorListItem }) {
  return (
    <StatusBadge
      label={statusLabel(tutor.status)}
      variant={stateVariants[tutor.status]}
    />
  );
}

function TutorIdentity({
  showScholarship,
  tutor,
}: {
  showScholarship?: boolean;
  tutor: SafeTutorListItem;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{tutor.formalName}</p>
      <p className="mt-1 truncate text-xs text-foreground-muted">{cycleLabel(tutor)}</p>
      {showScholarship && (
        <p className="mt-1 truncate text-xs text-foreground-secondary">
          Beca: {scholarshipLabel(tutor)}
        </p>
      )}
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
      href={href}
    >
      {label}
    </Link>
  );
}

function FilterToolbar({
  careerId,
  careerLabel,
  careers,
  disabled,
  onCareerChange,
  onClear,
  onSearchChange,
  onStatusChange,
  search,
  searchPlaceholder,
  status,
  statusLabel: statusFilterLabel,
}: {
  careerId: string;
  careerLabel: string;
  careers: SafeCareer[];
  disabled: boolean;
  onCareerChange: (value: string) => void;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: FilterStatus) => void;
  search: string;
  searchPlaceholder: string;
  status: FilterStatus;
  statusLabel: string;
}) {
  const hasActiveFilters = Boolean(search || careerId || status !== "all");

  return (
    <div className="mt-6 rounded-md border border-border-subtle bg-surface-subtle/60 p-4">
      <div className="grid gap-4 md:grid-cols-2 md:items-end xl:grid-cols-[minmax(15rem,1fr)_minmax(12rem,0.7fr)_minmax(12rem,0.7fr)_auto]">
        <div className="space-y-1.5">
          <label
            className="text-xs font-semibold text-foreground-secondary"
            htmlFor="tutor-search"
          >
            Buscar tutor
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
            />
            <Input
              aria-label="Buscar tutor"
              className="pl-9"
              disabled={disabled}
              id="tutor-search"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              type="search"
              value={search}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            className="text-xs font-semibold text-foreground-secondary"
            htmlFor="tutor-career"
          >
            {careerLabel}
          </label>
          <select
            className={selectClassName}
            disabled={disabled}
            id="tutor-career"
            onChange={(event) => onCareerChange(event.target.value)}
            value={careerId}
          >
            <option value="">Todas las carreras</option>
            {careers.map((career) => (
              <option key={career.id} value={career.id}>
                {career.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            className="text-xs font-semibold text-foreground-secondary"
            htmlFor="tutor-status"
          >
            {statusFilterLabel}
          </label>
          <select
            className={selectClassName}
            disabled={disabled}
            id="tutor-status"
            onChange={(event) =>
              onStatusChange(event.target.value as FilterStatus)
            }
            value={status}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <Button
          className="self-end"
          disabled={disabled || !hasActiveFilters}
          onClick={onClear}
          size="sm"
          type="button"
          variant="ghost"
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}

function TutorActionsMenu({
  menuKey,
  onOpenSheet,
  onRequestStatusChange,
  onToggle,
  openMenuKey,
  tutor,
  view,
}: {
  menuKey: string;
  onOpenSheet: (
    mode: Exclude<SheetMode, "add">,
    tutor: SafeTutorListItem,
    trigger: HTMLElement,
  ) => void;
  onRequestStatusChange: (tutor: SafeTutorListItem, trigger: HTMLElement) => void;
  onToggle: (menuKey: string | null) => void;
  openMenuKey: string | null;
  tutor: SafeTutorListItem;
  view: "compact" | "medium" | "wide";
}) {
  const isOpen = openMenuKey === menuKey;
  const actionLabel = tutor.status === "ACTIVE" ? "Desactivar tutor" : "Reactivar";
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative flex justify-end">
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Acciones para ${tutor.formalName}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
        onClick={() => onToggle(isOpen ? null : menuKey)}
        ref={menuButtonRef}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          aria-label={`Acciones para ${tutor.formalName}`}
          className={cn(
            "absolute right-0 top-full z-30 mt-1 min-w-48 rounded-md border border-border bg-surface p-1 shadow-lg",
            view === "compact" && "right-0",
          )}
          role="menu"
        >
          <button
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline-none"
            onClick={(event) =>
              onOpenSheet("view", tutor, menuButtonRef.current ?? event.currentTarget)
            }
            role="menuitem"
            type="button"
          >
            <UserRound aria-hidden="true" className="h-4 w-4 text-foreground-muted" />
            Ver detalle
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline-none"
            onClick={(event) =>
              onOpenSheet("edit", tutor, menuButtonRef.current ?? event.currentTarget)
            }
            role="menuitem"
            type="button"
          >
            <Pencil aria-hidden="true" className="h-4 w-4 text-foreground-muted" />
            Editar
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline-none"
            onClick={(event) =>
              onOpenSheet("view", tutor, menuButtonRef.current ?? event.currentTarget)
            }
            role="menuitem"
            type="button"
          >
            <BookOpen aria-hidden="true" className="h-4 w-4 text-foreground-muted" />
            Ver materias
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline-none"
            onClick={() => {
              onToggle(null);
              const trigger =
                menuButtonRef.current ??
                (document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null);

              if (trigger !== null) {
                onRequestStatusChange(tutor, trigger);
              }
            }}
            role="menuitem"
            type="button"
          >
            {tutor.status === "ACTIVE" ? (
              <Power aria-hidden="true" className="h-4 w-4 text-foreground-muted" />
            ) : (
              <RefreshCw aria-hidden="true" className="h-4 w-4 text-foreground-muted" />
            )}
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function TutorWideTable({
  onOpenSheet,
  onRequestStatusChange,
  onToggleMenu,
  openMenuKey,
  rows,
}: {
  onOpenSheet: (
    mode: Exclude<SheetMode, "add">,
    tutor: SafeTutorListItem,
    trigger: HTMLElement,
  ) => void;
  onRequestStatusChange: (tutor: SafeTutorListItem, trigger: HTMLElement) => void;
  onToggleMenu: (menuKey: string | null) => void;
  openMenuKey: string | null;
  rows: SafeTutorListItem[];
}) {
  return (
    <div className="hidden overflow-x-auto rounded-md border border-border bg-surface lg:block">
      <Table className="min-w-[62rem]">
        <caption className="sr-only">Lista de tutores</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[24%]" scope="col">Tutor</TableHead>
            <TableHead className="w-[25%]" scope="col">Carrera</TableHead>
            <TableHead className="w-[18%]" scope="col">Beca</TableHead>
            <TableHead className="w-[13%]" scope="col">Materias</TableHead>
            <TableHead className="w-[14%]" scope="col">Estado</TableHead>
            <TableHead className="w-12 text-right" scope="col">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((tutor) => (
            <TableRow key={tutor.id}>
              <TableCell><TutorIdentity tutor={tutor} /></TableCell>
              <TableCell><span className="text-sm text-foreground">{tutor.primaryCareer.name}</span></TableCell>
              <TableCell><span className="text-sm text-foreground-secondary">{scholarshipLabel(tutor)}</span></TableCell>
              <TableCell>
                <span className="text-sm tabular-nums text-foreground">
                  {tutor.subjectCount} {tutor.subjectCount === 1 ? "materia" : "materias"}
                </span>
              </TableCell>
              <TableCell><TutorStatus tutor={tutor} /></TableCell>
              <TableCell className="text-right">
                <TutorActionsMenu
                  menuKey={`wide:${tutor.id}`}
                  onOpenSheet={onOpenSheet}
                  onRequestStatusChange={onRequestStatusChange}
                  onToggle={onToggleMenu}
                  openMenuKey={openMenuKey}
                  tutor={tutor}
                  view="wide"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TutorMediumTable({
  onOpenSheet,
  onRequestStatusChange,
  onToggleMenu,
  openMenuKey,
  rows,
}: {
  onOpenSheet: (
    mode: Exclude<SheetMode, "add">,
    tutor: SafeTutorListItem,
    trigger: HTMLElement,
  ) => void;
  onRequestStatusChange: (tutor: SafeTutorListItem, trigger: HTMLElement) => void;
  onToggleMenu: (menuKey: string | null) => void;
  openMenuKey: string | null;
  rows: SafeTutorListItem[];
}) {
  return (
    <div className="hidden overflow-x-auto rounded-md border border-border bg-surface md:block lg:hidden">
      <Table className="min-w-[40rem]">
        <caption className="sr-only">Lista de tutores</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[31%]" scope="col">Tutor</TableHead>
            <TableHead className="w-[34%]" scope="col">Carrera</TableHead>
            <TableHead className="w-[16%]" scope="col">Materias</TableHead>
            <TableHead className="w-[15%]" scope="col">Estado</TableHead>
            <TableHead className="w-12 text-right" scope="col">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((tutor) => (
            <TableRow key={tutor.id}>
              <TableCell><TutorIdentity showScholarship tutor={tutor} /></TableCell>
              <TableCell><span className="text-sm text-foreground">{tutor.primaryCareer.name}</span></TableCell>
              <TableCell>
                <span className="text-sm tabular-nums text-foreground">
                  {tutor.subjectCount} {tutor.subjectCount === 1 ? "materia" : "materias"}
                </span>
              </TableCell>
              <TableCell><TutorStatus tutor={tutor} /></TableCell>
              <TableCell className="text-right">
                <TutorActionsMenu
                  menuKey={`medium:${tutor.id}`}
                  onOpenSheet={onOpenSheet}
                  onRequestStatusChange={onRequestStatusChange}
                  onToggle={onToggleMenu}
                  openMenuKey={openMenuKey}
                  tutor={tutor}
                  view="medium"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TutorCompactList({
  onOpenSheet,
  onRequestStatusChange,
  onToggleMenu,
  openMenuKey,
  rows,
}: {
  onOpenSheet: (
    mode: Exclude<SheetMode, "add">,
    tutor: SafeTutorListItem,
    trigger: HTMLElement,
  ) => void;
  onRequestStatusChange: (tutor: SafeTutorListItem, trigger: HTMLElement) => void;
  onToggleMenu: (menuKey: string | null) => void;
  openMenuKey: string | null;
  rows: SafeTutorListItem[];
}) {
  return (
    <ul className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border bg-surface md:hidden">
      {rows.map((tutor) => (
        <li className="p-4" key={tutor.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">{tutor.formalName}</p>
              <p className="mt-1 text-sm leading-6 text-foreground-secondary">{tutor.primaryCareer.name}</p>
            </div>
            <TutorActionsMenu
              menuKey={`compact:${tutor.id}`}
              onOpenSheet={onOpenSheet}
              onRequestStatusChange={onRequestStatusChange}
              onToggle={onToggleMenu}
              openMenuKey={openMenuKey}
              tutor={tutor}
              view="compact"
            />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border-subtle pt-4">
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Beca</dt>
              <dd className="mt-1 truncate text-sm text-foreground">{scholarshipLabel(tutor)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Materias</dt>
              <dd className="mt-1 text-sm tabular-nums text-foreground">
                {tutor.subjectCount} {tutor.subjectCount === 1 ? "materia" : "materias"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-medium text-foreground-muted">Estado</dt>
              <dd className="mt-1"><TutorStatus tutor={tutor} /></dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

function TutorList({
  onOpenSheet,
  onRequestStatusChange,
  onToggleMenu,
  openMenuKey,
  rows,
}: {
  onOpenSheet: (
    mode: Exclude<SheetMode, "add">,
    tutor: SafeTutorListItem,
    trigger: HTMLElement,
  ) => void;
  onRequestStatusChange: (tutor: SafeTutorListItem, trigger: HTMLElement) => void;
  onToggleMenu: (menuKey: string | null) => void;
  openMenuKey: string | null;
  rows: SafeTutorListItem[];
}) {
  return (
    <div className="mt-4">
      <TutorWideTable
        onOpenSheet={onOpenSheet}
        onRequestStatusChange={onRequestStatusChange}
        onToggleMenu={onToggleMenu}
        openMenuKey={openMenuKey}
        rows={rows}
      />
      <TutorMediumTable
        onOpenSheet={onOpenSheet}
        onRequestStatusChange={onRequestStatusChange}
        onToggleMenu={onToggleMenu}
        openMenuKey={openMenuKey}
        rows={rows}
      />
      <TutorCompactList
        onOpenSheet={onOpenSheet}
        onRequestStatusChange={onRequestStatusChange}
        onToggleMenu={onToggleMenu}
        openMenuKey={openMenuKey}
        rows={rows}
      />
    </div>
  );
}

function LoadingTutorList() {
  const rows = ["one", "two", "three", "four"];

  return (
    <div
      aria-label="Cargando tutores"
      aria-live="polite"
      className="mt-4 overflow-hidden rounded-md border border-border bg-surface"
      role="status"
    >
      <span className="sr-only">Cargando tutores</span>
      <div className="hidden lg:block">
        <div className="grid grid-cols-[1.3fr_1.4fr_1fr_0.7fr_0.8fr_3rem] gap-4 border-b border-border px-3 py-3">
          {rows.slice(0, 6).map((key) => (
            <span className="h-3 animate-pulse rounded-sm bg-surface-subtle" key={key} />
          ))}
        </div>
        {rows.map((key) => (
          <div
            className="grid grid-cols-[1.3fr_1.4fr_1fr_0.7fr_0.8fr_3rem] gap-4 border-b border-border-subtle px-3 py-5 last:border-b-0"
            key={key}
          >
            <span className="h-4 w-32 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-4 w-44 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-4 w-24 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-4 w-12 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-4 w-16 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="ml-auto h-8 w-8 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        ))}
      </div>
      <div className="space-y-4 p-4 md:hidden">
        {rows.slice(0, 3).map((key) => (
          <div className="rounded-md border border-border-subtle p-4" key={key}>
            <div className="h-5 w-40 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="mt-2 h-4 w-48 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="mt-5 h-16 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}

function InlineStateNotice({
  action,
  description,
  icon,
  title,
  tone,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
  tone: "danger" | "success" | "warning";
}) {
  const styles = {
    danger: "border-danger/30 bg-danger-surface/60",
    success: "border-success/30 bg-success-surface/60",
    warning: "border-warning/30 bg-warning-surface/60",
  } as const;
  const iconStyles = {
    danger: "text-danger",
    success: "text-success",
    warning: "text-warning",
  } as const;

  return (
    <div
      aria-live="polite"
      className={cn("mt-6 flex items-start gap-3 rounded-md border p-4", styles[tone])}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span className={cn("mt-0.5 shrink-0", iconStyles[tone])}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-foreground-secondary">{description}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

function FieldError({ message, id }: { message?: string; id: string }) {
  if (message === undefined) {
    return null;
  }

  return (
    <p className="text-xs text-danger" id={id}>
      {message}
    </p>
  );
}

function formValuesForTutor(
  tutor: SafeTutorListItem | SafeTutorDetail | undefined,
  catalogOptions: TutorsCatalogOptions,
): TutorFormValues {
  const currentCycle =
    tutor === undefined ? catalogOptions.currentCycle : tutor.currentCycle;

  return {
    firstName: tutor?.firstName ?? "",
    lastName: tutor?.lastName ?? "",
    preferredDisplayName: tutor?.preferredDisplayName ?? "",
    institutionalIdentifier: tutor?.institutionalIdentifier ?? "",
    primaryCareerId: tutor?.primaryCareer.id ?? "",
    subjectIds:
      "subjects" in (tutor ?? {})
        ? (tutor as SafeTutorDetail).subjects.map((subject) => subject.id)
        : [],
    cycleId: currentCycle?.id ?? "",
    scholarshipReferenceId: tutor?.scholarshipReference?.id ?? "",
  };
}

function formsEqual(left: TutorFormValues, right: TutorFormValues) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function TutorSheet({
  catalogOptions,
  detail,
  detailError,
  detailLoading,
  fieldErrors,
  mode,
  onClose,
  onRetryDetail,
  onSubmit,
  open,
  saving,
  sheetError,
  tutor,
}: {
  catalogOptions: TutorsCatalogOptions;
  detail: SafeTutorDetail | null;
  detailError: TutorRequestError | null;
  detailLoading: boolean;
  fieldErrors: Record<string, string>;
  mode: SheetMode | null;
  onClose: () => void;
  onRetryDetail: () => void;
  onSubmit: (values: TutorFormValues, options: TutorFormSubmitOptions) => void;
  open: boolean;
  saving: boolean;
  sheetError: TutorRequestError | null;
  tutor?: SafeTutorListItem;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const baselineRef = useRef<TutorFormValues | null>(null);
  const formKey = open
    ? `${mode}:${tutor?.id ?? "new"}:${detail?.id ?? "pending"}`
    : "closed";
  const [form, setForm] = useState<TutorFormValues>(() =>
    formValuesForTutor(mode === "add" ? undefined : detail ?? tutor, catalogOptions),
  );
  const [subjectsChanged, setSubjectsChanged] = useState(false);
  const [membershipChanged, setMembershipChanged] = useState(false);

  useEffect(() => {
    if (!open || mode === null) {
      return;
    }

    const nextForm = formValuesForTutor(
      mode === "add" ? undefined : detail ?? tutor,
      catalogOptions,
    );
    // The form is reset when the selected tutor/detail changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(nextForm);
    baselineRef.current = nextForm;
    setSubjectsChanged(false);
    setMembershipChanged(false);
  }, [catalogOptions, detail, formKey, mode, open, tutor]);

  useEffect(() => {
    if (!open || mode === null || !panelRef.current) {
      return;
    }

    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        attemptClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelector),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
    // attemptClose intentionally reads the latest form through refs only when Escape is pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey, mode, open]);

  if (!open || mode === null) {
    return null;
  }

  const isView = mode === "view";
  const isAdd = mode === "add";
  const detailUnavailable = !isAdd && detail === null && detailError !== null;
  const record = detail ?? tutor;
  const title = isAdd
    ? "Agregar tutor"
    : `${mode === "edit" ? "Editar" : "Detalle de"} ${record?.formalName ?? "tutor"}`;
  const currentScholarship = detail?.scholarshipReference;
  const scholarshipOptions = [
    ...catalogOptions.scholarshipReferences,
    ...(currentScholarship !== null && currentScholarship !== undefined &&
    !catalogOptions.scholarshipReferences.some((option) => option.id === currentScholarship.id)
      ? [currentScholarship]
      : []),
  ];
  const subjectOptions = [
    ...catalogOptions.subjects.filter((subject) => subject.careerId === form.primaryCareerId),
    ...(detail?.subjects.filter(
      (subject) =>
        subject.careerId === form.primaryCareerId &&
        !catalogOptions.subjects.some((option) => option.id === subject.id),
    ) ?? []),
  ];
  const baseline = baselineRef.current ?? form;
  const isDirty = !formsEqual(form, baseline);
  const fieldErrorId = (field: string) => `tutor-${field}-error`;

  function attemptClose() {
    if (
      isDirty &&
      typeof window !== "undefined" &&
      !window.confirm("Hay cambios sin guardar. ¿Cerrar la ficha?" )
    ) {
      return;
    }

    onClose();
  }

  function updateForm<K extends keyof TutorFormValues>(field: K, value: TutorFormValues[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function handleCareerChange(value: string) {
    setForm((previous) => ({ ...previous, primaryCareerId: value, subjectIds: [] }));
    setSubjectsChanged(true);
  }

  function toggleSubject(subjectId: string) {
    setForm((previous) => ({
      ...previous,
      subjectIds: previous.subjectIds.includes(subjectId)
        ? previous.subjectIds.filter((id) => id !== subjectId)
        : [...previous.subjectIds, subjectId],
    }));
    setSubjectsChanged(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isView || detailLoading || detailUnavailable || (!isAdd && !isDirty)) {
      return;
    }

    const changedFields = [
      ...(form.firstName !== baseline.firstName ? ["firstName"] : []),
      ...(form.lastName !== baseline.lastName ? ["lastName"] : []),
      ...(form.preferredDisplayName !== baseline.preferredDisplayName
        ? ["preferredDisplayName"]
        : []),
      ...(form.institutionalIdentifier !== baseline.institutionalIdentifier
        ? ["institutionalIdentifier"]
        : []),
      ...(form.primaryCareerId !== baseline.primaryCareerId ? ["primaryCareerId"] : []),
    ];

    onSubmit(form, {
      changedFields,
      membershipChanged:
        membershipChanged ||
        form.cycleId !== baseline.cycleId ||
        form.scholarshipReferenceId !== baseline.scholarshipReferenceId,
      subjectsChanged: subjectsChanged || form.subjectIds.join(",") !== baseline.subjectIds.join(","),
    });
  }

  return (
    <div
      aria-label="Cerrar panel de tutor"
      className="fixed inset-0 z-[70] flex justify-end bg-brand-navy/30"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          attemptClose();
        }
      }}
    >
      <div
        aria-describedby="tutor-sheet-description"
        aria-labelledby="tutor-sheet-title"
        aria-modal="true"
        className="flex h-full w-full max-w-[36rem] flex-col border-l border-border bg-surface shadow-2xl"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Ficha de tutor</p>
            <h2 className="mt-2 truncate text-xl font-bold tracking-tight text-foreground" id="tutor-sheet-title">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground-secondary" id="tutor-sheet-description">
              {isAdd
                ? "Completar los datos para guardar el registro del tutor."
                : "Consultar o actualizar el contexto académico y la información vigente del tutor."}
            </p>
          </div>
          <button
            aria-label="Cerrar panel de tutor"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
            onClick={attemptClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
            {sheetError && (
              <div aria-live="assertive" className="rounded-md border border-danger/30 bg-danger-surface/60 p-4 text-sm text-danger" role="alert">
                {getTutorErrorMessage(sheetError)}
              </div>
            )}
            {detailError && (
              <div aria-live="assertive" className="rounded-md border border-danger/30 bg-danger-surface/60 p-4 text-sm text-danger" role="alert">
                <p>{getTutorErrorMessage(detailError, "No se pudo cargar el detalle del tutor.")}</p>
                <Button className="mt-3" onClick={onRetryDetail} size="sm" type="button" variant="outline">
                  Reintentar
                </Button>
              </div>
            )}
            {detailLoading && (
              <div aria-live="polite" className="flex items-center gap-2 text-sm text-foreground-secondary" role="status">
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                Cargando el detalle del tutor…
              </div>
            )}

            <section aria-labelledby="tutor-identity-heading">
              <h3 className="text-sm font-bold text-foreground" id="tutor-identity-heading">Identidad</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="tutor-first-name">Nombre</label>
                  <Input
                    aria-describedby={fieldErrors.firstName === undefined ? undefined : fieldErrorId("first-name")}
                    aria-invalid={fieldErrors.firstName !== undefined}
                    disabled={isView || detailLoading || detailUnavailable}
                    id="tutor-first-name"
                    onChange={(event) => updateForm("firstName", event.target.value)}
                    placeholder="Nombre"
                    value={form.firstName}
                  />
                  <FieldError id={fieldErrorId("first-name")} message={fieldErrors.firstName} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="tutor-last-name">Apellido</label>
                  <Input
                    aria-describedby={fieldErrors.lastName === undefined ? undefined : fieldErrorId("last-name")}
                    aria-invalid={fieldErrors.lastName !== undefined}
                    disabled={isView || detailLoading || detailUnavailable}
                    id="tutor-last-name"
                    onChange={(event) => updateForm("lastName", event.target.value)}
                    placeholder="Apellido"
                    value={form.lastName}
                  />
                  <FieldError id={fieldErrorId("last-name")} message={fieldErrors.lastName} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="tutor-preferred-name">Nombre preferido (opcional)</label>
                  <Input
                    disabled={isView || detailLoading || detailUnavailable}
                    id="tutor-preferred-name"
                    onChange={(event) => updateForm("preferredDisplayName", event.target.value)}
                    placeholder="Cómo desea aparecer en la operación"
                    value={form.preferredDisplayName}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="tutor-institutional-identifier">Identificador institucional (opcional)</label>
                  <Input
                    aria-describedby={fieldErrors.institutionalIdentifier === undefined ? undefined : fieldErrorId("institutional-identifier")}
                    aria-invalid={fieldErrors.institutionalIdentifier !== undefined}
                    disabled={isView || detailLoading || detailUnavailable}
                    id="tutor-institutional-identifier"
                    onChange={(event) => updateForm("institutionalIdentifier", event.target.value)}
                    placeholder="Legajo o identificador institucional"
                    value={form.institutionalIdentifier}
                  />
                  <FieldError id={fieldErrorId("institutional-identifier")} message={fieldErrors.institutionalIdentifier} />
                </div>
              </div>
            </section>

            <section aria-labelledby="tutor-academic-heading">
              <h3 className="text-sm font-bold text-foreground" id="tutor-academic-heading">Contexto académico</h3>
              <div className="mt-4 space-y-1.5">
                <label className="text-xs font-semibold text-foreground-secondary" htmlFor="tutor-career-sheet">Carrera</label>
                <select
                  aria-describedby={fieldErrors.primaryCareerId === undefined ? undefined : fieldErrorId("career")}
                  aria-invalid={fieldErrors.primaryCareerId !== undefined}
                  className={selectClassName}
                  disabled={isView || detailLoading || detailUnavailable}
                  id="tutor-career-sheet"
                  onChange={(event) => handleCareerChange(event.target.value)}
                  value={form.primaryCareerId}
                >
                  <option value="">Seleccionar una carrera</option>
                  {catalogOptions.careers.map((career) => (
                    <option key={career.id} value={career.id}>{career.name}</option>
                  ))}
                </select>
                <FieldError id={fieldErrorId("career")} message={fieldErrors.primaryCareerId} />
              </div>
            </section>

            <section aria-labelledby="tutor-subjects-heading">
              <h3 className="text-sm font-bold text-foreground" id="tutor-subjects-heading">Materias</h3>
              <p className="mt-2 text-sm leading-6 text-foreground-secondary">
                Seleccionar materias del catálogo que correspondan a la carrera del tutor.
              </p>
              <FieldError id={fieldErrorId("subjects")} message={fieldErrors.subjectIds} />
              <div className="mt-4 space-y-2 rounded-md border border-border-subtle bg-surface-subtle/60 p-4">
                {form.primaryCareerId === "" ? (
                  <p className="text-sm text-foreground-secondary">Seleccionar una carrera para ver sus materias.</p>
                ) : subjectOptions.length === 0 ? (
                  <p className="text-sm text-foreground-secondary">No hay materias activas para esta carrera.</p>
                ) : (
                  subjectOptions.map((subject) => {
                    const checked = form.subjectIds.includes(subject.id);
                    const inactive = subject.status === "INACTIVE";

                    return (
                      <label className="flex items-start gap-3 rounded-sm px-2 py-2 hover:bg-surface" key={subject.id}>
                        <input
                          checked={checked}
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus-visible:ring-3 focus-visible:ring-ring"
                          disabled={isView || detailLoading || detailUnavailable || inactive}
                          onChange={() => toggleSubject(subject.id)}
                          type="checkbox"
                        />
                        <span className="min-w-0 text-sm text-foreground">
                          <span className="block font-medium">{subject.name}</span>
                          {inactive && <span className="text-xs text-foreground-muted">Inactiva · se conserva como antecedente</span>}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-2 text-xs text-foreground-muted">{form.subjectIds.length} {form.subjectIds.length === 1 ? "materia seleccionada" : "materias seleccionadas"}</p>
            </section>

            <section aria-labelledby="tutor-cycle-heading">
              <h3 className="text-sm font-bold text-foreground" id="tutor-cycle-heading">Ciclo y beca</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="tutor-cycle">Ciclo abierto</label>
                  <select
                    aria-describedby={fieldErrors.cycleId === undefined ? undefined : fieldErrorId("cycle")}
                    aria-invalid={fieldErrors.cycleId !== undefined}
                    className={selectClassName}
                    disabled={
                      isView ||
                      detailLoading ||
                      detailUnavailable ||
                      catalogOptions.currentCycle === null
                    }
                    id="tutor-cycle"
                    onChange={(event) => {
                      setMembershipChanged(true);
                      updateForm("cycleId", event.target.value);
                    }}
                    value={form.cycleId}
                  >
                    <option value="">Seleccionar ciclo abierto</option>
                    {catalogOptions.currentCycle !== null && (
                      <option value={catalogOptions.currentCycle.id}>{catalogOptions.currentCycle.name}</option>
                    )}
                  </select>
                  <FieldError id={fieldErrorId("cycle")} message={fieldErrors.cycleId} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="tutor-scholarship">Referencia de beca (opcional)</label>
                  <select
                    className={selectClassName}
                    disabled={isView || detailLoading || detailUnavailable}
                    id="tutor-scholarship"
                    onChange={(event) => {
                      setMembershipChanged(true);
                      updateForm("scholarshipReferenceId", event.target.value);
                    }}
                    value={form.scholarshipReferenceId}
                  >
                    <option value="">Sin referencia</option>
                    {scholarshipOptions.map((reference) => (
                      <option disabled={reference.status === "INACTIVE"} key={reference.id} value={reference.id}>
                        {reference.type}{reference.status === "INACTIVE" ? " · inactiva" : ""}
                      </option>
                    ))}
                  </select>
                  <FieldError id={fieldErrorId("scholarship")} message={fieldErrors.scholarshipReferenceId} />
                </div>
              </div>
            </section>

            <section aria-labelledby="tutor-status-heading">
              <h3 className="text-sm font-bold text-foreground" id="tutor-status-heading">Estado</h3>
              <div className="mt-4 flex items-center gap-3">
                <StatusBadge
                  label={statusLabel(record?.status ?? "ACTIVE")}
                  variant={stateVariants[record?.status ?? "ACTIVE"]}
                />
                <span className="text-sm text-foreground-secondary">
                  {isAdd ? "El tutor se crea activo." : "El estado se actualiza desde el menú de acciones."}
                </span>
              </div>
            </section>
          </div>

          <div className="border-t border-border bg-surface px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={attemptClose} type="button" variant="outline">Cerrar</Button>
              {!isView && (
                <Button
                  disabled={
                    saving ||
                    detailLoading ||
                    detailUnavailable ||
                    (!isAdd && !isDirty)
                  }
                  type="submit"
                >
                  {saving ? "Guardando…" : isAdd ? "Agregar tutor" : "Guardar cambios"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusConfirmation({
  error,
  loading,
  onCancel,
  onConfirm,
  request,
}: {
  error: TutorRequestError | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  request: NonNullable<StatusRequest>;
}) {
  const isDeactivation = request.tutor.status === "ACTIVE";
  const action = isDeactivation ? "Desactivar tutor" : "Reactivar";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-navy/20 p-4">
      <div
        aria-describedby="status-confirmation-description"
        aria-labelledby="status-confirmation-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-dialog"
        role="alertdialog"
      >
        <h2 className="text-lg font-semibold text-foreground" id="status-confirmation-title">{action}</h2>
        <p className="mt-2 text-sm leading-6 text-foreground-secondary" id="status-confirmation-description">
          {isDeactivation
            ? `El tutor ${request.tutor.formalName} quedará inactivo. Sus materias y antecedentes de ciclo se conservarán.`
            : `El tutor ${request.tutor.formalName} volverá a estar disponible en las operaciones activas.`}
        </p>
        {error && (
          <p aria-live="assertive" className="mt-4 rounded-md border border-danger/30 bg-danger-surface/60 p-3 text-sm text-danger" role="alert">
            {getTutorErrorMessage(error)}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={loading} onClick={onCancel} type="button" variant="outline">Cancelar</Button>
          <Button disabled={loading} onClick={onConfirm} type="button" variant={isDeactivation ? "destructive" : "default"}>
            {loading ? "Guardando…" : action}
          </Button>
        </div>
      </div>
    </div>
  );
}

function readInitialFilter(name: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get(name) ?? "";
}

function normalizeInitialStatus(value: string): FilterStatus {
  return value === "active" || value === "inactive" ? value : "all";
}

export function TutorsScreen({
  catalogOptions,
  data,
  requiredAction = "cycle",
  state = "default",
}: TutorsScreenProps) {
  const [search, setSearch] = useState(() => readInitialFilter("search"));
  const [careerId, setCareerId] = useState(() => readInitialFilter("careerId"));
  const [status, setStatus] = useState<FilterStatus>(() =>
    normalizeInitialStatus(readInitialFilter("status")),
  );
  const [rows, setRows] = useState<SafeTutorListItem[]>(data.rows);
  const [screenState, setScreenState] = useState<TutorsScreenState>(state);
  const [listError, setListError] = useState<TutorRequestError | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [sheetDetail, setSheetDetail] = useState<SafeTutorDetail | null>(null);
  const [sheetDetailLoading, setSheetDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<TutorRequestError | null>(null);
  const [sheetError, setSheetError] = useState<TutorRequestError | null>(null);
  const [sheetFieldErrors, setSheetFieldErrors] = useState<Record<string, string>>({});
  const [sheetSaving, setSheetSaving] = useState(false);
  const [statusRequest, setStatusRequest] = useState<StatusRequest>(null);
  const [statusError, setStatusError] = useState<TutorRequestError | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const hasRequestedListRef = useRef(false);
  const detailRequestIdRef = useRef(0);

  const activeCatalogOptions = catalogOptions ?? {
    careers: [],
    subjects: [],
    scholarshipReferences: [],
    currentCycle: null,
  } satisfies TutorsCatalogOptions;

  const careers = activeCatalogOptions.careers;
  const hasActiveFilters = Boolean(search.trim() || careerId || status !== "all");

  useEffect(() => {
    // The public state prop is also used by state-fixture and recovery renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScreenState(state);
  }, [state]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (search.trim()) url.searchParams.set("search", search.trim());
      else url.searchParams.delete("search");
      if (careerId) url.searchParams.set("careerId", careerId);
      else url.searchParams.delete("careerId");
      if (status !== "all") url.searchParams.set("status", status);
      else url.searchParams.delete("status");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }

    const shouldFetch = hasRequestedListRef.current || hasActiveFilters || retryToken > 0;

    if (!shouldFetch) {
      return;
    }

    const controller = new AbortController();
    hasRequestedListRef.current = true;
    setScreenState("loading");
    setListError(null);
    const query = new URLSearchParams();

    if (search.trim()) query.set("search", search.trim());
    if (careerId) query.set("careerId", careerId);
    if (status !== "all") query.set("status", status.toUpperCase());

    void requestJson<{ tutors: SafeTutorListItem[] }>(
      `/api/admin/tutors${query.toString() === "" ? "" : `?${query.toString()}`}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setRows(result.tutors);
          setScreenState("default");
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setListError(error instanceof TutorRequestError ? error : new TutorRequestError("internal_server_error", 500));
          setScreenState("error");
        }
      });

    return () => controller.abort();
  }, [careerId, hasActiveFilters, retryToken, search, status]);

  const loadTutorDetail = useCallback(async (tutorId: string) => {
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    setSheetDetailLoading(true);
    setDetailError(null);
    setSheetError(null);
    setSheetDetail(null);

    try {
      const result = await requestJson<{ tutor: SafeTutorDetail }>(
        `/api/admin/tutors/${encodeURIComponent(tutorId)}`,
      );
      if (detailRequestIdRef.current === requestId) {
        setSheetDetail(result.tutor);
        setDetailError(null);
      }
    } catch (error) {
      if (detailRequestIdRef.current === requestId) {
        setDetailError(
          error instanceof TutorRequestError
            ? error
            : new TutorRequestError("internal_server_error", 500),
        );
      }
    } finally {
      if (detailRequestIdRef.current === requestId) {
        setSheetDetailLoading(false);
      }
    }
  }, []);

  const openSheet = useCallback(
    (mode: SheetMode, tutor: SafeTutorListItem | undefined, trigger: HTMLElement) => {
      lastTriggerRef.current = trigger;
      setOpenMenuKey(null);
      setSheet({ mode, tutor });
      setDetailError(null);
      setSheetError(null);
      setSheetFieldErrors({});
      if (mode === "add" || tutor === undefined) {
        detailRequestIdRef.current += 1;
        setSheetDetail(null);
        setSheetDetailLoading(false);
      } else {
        void loadTutorDetail(tutor.id);
      }
    },
    [loadTutorDetail],
  );

  const closeSheet = useCallback(() => {
    detailRequestIdRef.current += 1;
    setSheet(null);
    setSheetDetail(null);
    setDetailError(null);
    setSheetError(null);
    setSheetFieldErrors({});
    setSheetSaving(false);
  }, []);

  const updateRow = useCallback(
    (updatedTutor: SafeTutorListItem) => {
      setRows((previous) => {
        const index = previous.findIndex((tutor) => tutor.id === updatedTutor.id);
        const matchesFilters = matchesTutorFilters(
          updatedTutor,
          search,
          careerId,
          status,
        );

        if (!matchesFilters) {
          return previous.filter((tutor) => tutor.id !== updatedTutor.id);
        }

        if (index === -1) {
          return [updatedTutor, ...previous];
        }

        const next = [...previous];
        next[index] = updatedTutor;
        return next;
      });
    },
    [careerId, search, status],
  );

  const handleSheetSubmit = useCallback(
    async (values: TutorFormValues, options: TutorFormSubmitOptions) => {
      if (sheet === null || sheet.mode === "view") {
        return;
      }

      setSheetSaving(true);
      setSheetError(null);
      setSheetFieldErrors({});

      const cleanOptional = (value: string) => (value.trim() === "" ? null : value.trim());
      const basePayload = {
        firstName: values.firstName,
        lastName: values.lastName,
        preferredDisplayName: cleanOptional(values.preferredDisplayName),
        institutionalIdentifier: cleanOptional(values.institutionalIdentifier),
      };
      const payload =
        sheet.mode === "add"
          ? {
              ...basePayload,
              primaryCareerId: values.primaryCareerId,
              subjectIds: values.subjectIds,
              cycleId: values.cycleId,
              scholarshipReferenceId: values.scholarshipReferenceId || null,
            }
          : {
              ...Object.fromEntries(
                options.changedFields.map((field) => [field, basePayload[field as keyof typeof basePayload]]),
              ),
              ...(options.changedFields.includes("primaryCareerId")
                ? { primaryCareerId: values.primaryCareerId }
                : {}),
              ...(options.subjectsChanged ? { subjectIds: values.subjectIds } : {}),
              ...(options.membershipChanged
                ? {
                    cycleId: values.cycleId,
                    scholarshipReferenceId: values.scholarshipReferenceId || null,
                  }
                : {}),
            };

      try {
        const result =
          sheet.mode === "add"
            ? await requestJson<{ tutor: SafeTutorDetail }>("/api/admin/tutors", {
                method: "POST",
                body: JSON.stringify(payload),
              })
            : await requestJson<{ tutor: SafeTutorDetail }>(
                `/api/admin/tutors/${encodeURIComponent(sheet.tutor!.id)}`,
                { method: "PATCH", body: JSON.stringify(payload) },
              );

        updateRow(result.tutor);
        closeSheet();
        setScreenState("success");
        setAnnouncement(
          sheet.mode === "add"
            ? "El tutor se agregó correctamente."
            : "Los datos del tutor se actualizaron correctamente.",
        );
      } catch (error) {
        const requestError =
          error instanceof TutorRequestError
            ? error
            : new TutorRequestError("internal_server_error", 500);
        setSheetError(requestError);
        setSheetFieldErrors(getFieldErrors(requestError));
      } finally {
        setSheetSaving(false);
      }
    },
    [closeSheet, sheet, updateRow],
  );

  const requestStatusChange = useCallback((tutor: SafeTutorListItem, trigger: HTMLElement) => {
    lastTriggerRef.current = trigger;
    setOpenMenuKey(null);
    setStatusError(null);
    setStatusRequest({ tutor, trigger });
  }, []);

  const confirmStatusChange = useCallback(async () => {
    if (statusRequest === null) {
      return;
    }

    setStatusSaving(true);
    setStatusError(null);

    try {
      const status = statusRequest.tutor.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const result = await requestJson<{ tutor: SafeTutorDetail }>(
        `/api/admin/tutors/${encodeURIComponent(statusRequest.tutor.id)}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );
      updateRow(result.tutor);
      setStatusRequest(null);
      setScreenState("success");
      setAnnouncement(
        status === "INACTIVE"
          ? "El tutor se desactivó y sus antecedentes se conservaron."
          : "El tutor se reactivó correctamente.",
      );
    } catch (error) {
      setStatusError(error instanceof TutorRequestError ? error : new TutorRequestError("internal_server_error", 500));
    } finally {
      setStatusSaving(false);
    }
  }, [statusRequest, updateRow]);

  useEffect(() => {
    if (sheet !== null || statusRequest !== null || lastTriggerRef.current === null) {
      return;
    }

    if (document.contains(lastTriggerRef.current)) {
      lastTriggerRef.current.focus();
    } else {
      document.getElementById("tutor-search")?.focus();
    }
    lastTriggerRef.current = null;
  }, [sheet, statusRequest]);

  useEffect(() => {
    if (!openMenuKey || sheet !== null || statusRequest !== null) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenMenuKey(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [openMenuKey, sheet, statusRequest]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setCareerId("");
    setStatus("all");
  }, []);

  const retryList = useCallback(() => setRetryToken((value) => value + 1), []);
  const retryDetail = useCallback(() => {
    if (sheet?.tutor !== undefined) {
      void loadTutorDetail(sheet.tutor.id);
    }
  }, [loadTutorDetail, sheet]);

  const derivedState: TutorsScreenState =
    screenState === "default" || screenState === "success"
      ? rows.length === 0
        ? hasActiveFilters
          ? "search-empty"
          : "empty"
        : screenState
      : screenState;
  const stateData =
    listError !== null
      ? {
          state: "error" as const,
          title: "No se pudo cargar la lista",
          description: getTutorErrorMessage(listError, "Reintentar para volver a consultar los tutores."),
          actionLabel: "Reintentar",
        }
      : findStateData(derivedState, requiredAction);
  const headerAction =
    derivedState === "required-action" ? (
      <ActionLink href="/admin/settings" label={stateData?.actionLabel ?? "Configurar ciclo"} />
    ) : (
      <Button
        disabled={derivedState === "loading"}
        onClick={(event) => openSheet("add", undefined, event.currentTarget)}
        type="button"
      >
        <Plus aria-hidden="true" />
        {data.emptyAction}
      </Button>
    );

  return (
    <>
      <div
        aria-hidden={sheet !== null || statusRequest !== null ? true : undefined}
        data-slot="tutors-screen"
        data-state={derivedState}
      >
        <PageHeader action={headerAction} description={data.description} title="Tutores" />

        {screenState === "success" && (
          <InlineStateNotice
            description={announcement ?? "La información quedó actualizada."}
            icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
            title="Cambios guardados"
            tone="success"
          />
        )}

        {announcement !== null && screenState !== "success" && (
          <div aria-live="polite" className="mt-6 flex items-start gap-3 rounded-md border border-info/30 bg-info-surface/60 p-4" role="status">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <p className="text-sm leading-6 text-foreground">{announcement}</p>
          </div>
        )}

        {derivedState === "error" && stateData && (
          <InlineStateNotice
            action={<Button onClick={retryList} size="sm" type="button" variant="outline">{stateData.actionLabel ?? "Reintentar"}</Button>}
            description={stateData.description}
            icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
            title={stateData.title}
            tone="danger"
          />
        )}

        {derivedState === "required-action" && stateData && (
          <InlineStateNotice
            action={<ActionLink href="/admin/settings" label={stateData.actionLabel ?? "Configurar ciclo"} />}
            description={stateData.description}
            icon={<Settings2 aria-hidden="true" className="h-5 w-5" />}
            title={stateData.title}
            tone="warning"
          />
        )}

        {derivedState !== "error" && derivedState !== "required-action" && (
          <>
            <FilterToolbar
              careerId={careerId}
              careerLabel={data.careerFilterLabel}
              careers={careers}
              disabled={derivedState === "empty"}
              onCareerChange={setCareerId}
              onClear={clearFilters}
              onSearchChange={setSearch}
              onStatusChange={setStatus}
              search={search}
              searchPlaceholder={data.searchPlaceholder}
              status={status}
              statusLabel={data.statusFilterLabel}
            />

            <p aria-live="polite" className="mt-4 text-sm text-foreground-secondary">
              {derivedState === "loading"
                ? "Preparando la lista de tutores…"
                : derivedState === "empty"
                  ? "Todavía no hay tutores cargados."
                  : derivedState === "search-empty"
                    ? "No hay resultados para la búsqueda actual."
                    : `Mostrando ${formatTutorCount(rows.length)}`}
            </p>

            {derivedState === "loading" && <LoadingTutorList />}

            {derivedState === "empty" && (
              <div className="mt-4">
                <EmptyState
                  action={<Button onClick={(event) => openSheet("add", undefined, event.currentTarget)} type="button"><Plus aria-hidden="true" />{data.emptyAction}</Button>}
                  description="Agregar el primer tutor para comenzar a organizar la cobertura."
                  title={data.emptyTitle}
                />
              </div>
            )}

            {derivedState === "search-empty" && (
              <div className="mt-4">
                <EmptyState
                  action={<Button onClick={clearFilters} type="button" variant="outline">Limpiar filtros</Button>}
                  description={stateData?.description ?? "Probar con otro nombre o limpiar los filtros."}
                  title={stateData?.title ?? "No encontramos tutores"}
                />
              </div>
            )}

            {derivedState !== "loading" && derivedState !== "empty" && derivedState !== "search-empty" && (
              <TutorList
                onOpenSheet={openSheet}
                onRequestStatusChange={requestStatusChange}
                onToggleMenu={setOpenMenuKey}
                openMenuKey={openMenuKey}
                rows={rows}
              />
            )}
          </>
        )}
      </div>

      <TutorSheet
        catalogOptions={activeCatalogOptions}
        detail={sheetDetail}
        detailError={detailError}
        detailLoading={sheetDetailLoading}
        fieldErrors={sheetFieldErrors}
        mode={sheet?.mode ?? null}
        onClose={closeSheet}
        onRetryDetail={retryDetail}
        onSubmit={handleSheetSubmit}
        open={sheet !== null}
        saving={sheetSaving}
        sheetError={sheetError}
        tutor={sheet?.tutor}
      />

      {statusRequest !== null && (
        <StatusConfirmation
          error={statusError}
          loading={statusSaving}
          onCancel={() => {
            setStatusRequest(null);
            setStatusError(null);
          }}
          onConfirm={() => void confirmStatusChange()}
          request={statusRequest}
        />
      )}
    </>
  );
}
