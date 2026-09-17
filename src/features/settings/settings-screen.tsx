"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Pencil,
  Power,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";
import type {
  SafeCareer,
  SafeScholarshipReference,
  SafeSubject,
} from "@/features/tutors/tutor-service";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge, type StatusBadgeVariant } from "@/shared/components/status-badge";
import { cn } from "@/shared/utils";

export type SettingsState =
  | "default"
  | "loading"
  | "error"
  | "required-action"
  | "success";

type Feedback = {
  kind: "error" | "success";
  message: string;
};

type CycleForm = {
  name: string;
  startDate: string;
  endDate: string;
};

type CareerForm = {
  id: string | null;
  name: string;
};

type SubjectForm = {
  id: string | null;
  name: string;
  careerId: string;
};

type ScholarshipForm = {
  id: string | null;
  type: string;
  knownRequiredHours: string;
  notes: string;
};

type SettingsPayload = {
  currentCycle: SafeAdministrativeCycle | null;
  cycles: SafeAdministrativeCycle[];
  careers: SafeCareer[];
  subjects: SafeSubject[];
  scholarshipReferences: SafeScholarshipReference[];
};

type SubmitHandler = (event: FormEvent<HTMLFormElement>) => void;

export interface SettingsScreenProps {
  currentCycle: SafeAdministrativeCycle | null;
  cycles: SafeAdministrativeCycle[];
  careers?: SafeCareer[];
  subjects?: SafeSubject[];
  scholarshipReferences?: SafeScholarshipReference[];
  initialErrorMessage?: string;
  initialState?: SettingsState;
}

const EMPTY_CYCLE_FORM: CycleForm = {
  name: "",
  startDate: "",
  endDate: "",
};

const EMPTY_CAREER_FORM: CareerForm = {
  id: null,
  name: "",
};

const EMPTY_SUBJECT_FORM: SubjectForm = {
  id: null,
  name: "",
  careerId: "",
};

const EMPTY_SCHOLARSHIP_FORM: ScholarshipForm = {
  id: null,
  type: "",
  knownRequiredHours: "",
  notes: "",
};

const selectClassName =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const textareaClassName =
  "min-h-24 w-full resize-y rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-foreground-muted focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const settingsErrorMessages: Record<string, string> = {
  unauthorized: "La sesión expiró. Volver a iniciar sesión para continuar.",
  forbidden: "No tienes permisos para administrar la configuración.",
  invalid_request: "Revisar los datos ingresados antes de guardar.",
  invalid_date_range:
    "La fecha de finalización debe ser posterior o igual a la de inicio.",
  open_cycle_exists:
    "Ya existe un ciclo abierto. Cerrar el ciclo actual antes de crear otro.",
  cycle_not_found: "No se encontró el ciclo solicitado.",
  cycle_already_closed: "El ciclo ya está cerrado y no puede modificarse.",
  duplicate_career_name: "Ya existe una carrera con ese nombre.",
  duplicate_subject_name:
    "Ya existe una materia con ese nombre dentro de la carrera seleccionada.",
  duplicate_scholarship_reference_type:
    "Ya existe una referencia de beca con ese tipo.",
  inactive_career: "Seleccionar una carrera activa para continuar.",
  inactive_subject: "Seleccionar una materia activa para continuar.",
  inactive_scholarship_reference:
    "Seleccionar una referencia de beca activa para continuar.",
  career_subject_mismatch:
    "La materia seleccionada debe pertenecer a la carrera indicada.",
  catalog_conflict:
    "No se puede cambiar la carrera porque la materia conserva asignaciones.",
  status_already_set: "El estado seleccionado ya está aplicado.",
  internal_server_error:
    "No se pudo guardar la configuración. Intentar nuevamente.",
};

class SettingsRequestError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "SettingsRequestError";
    this.code = code;
  }
}

function formatCycleDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function formatCyclePeriod(cycle: SafeAdministrativeCycle) {
  return `${formatCycleDate(cycle.startDate)} — ${formatCycleDate(cycle.endDate)}`;
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

async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(input, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new SettingsRequestError("internal_server_error");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new SettingsRequestError(getErrorCode(body));
  }

  return body as T;
}

function getFeedbackMessage(error: unknown) {
  if (error instanceof SettingsRequestError) {
    return (
      settingsErrorMessages[error.code] ??
      settingsErrorMessages.internal_server_error
    );
  }

  return settingsErrorMessages.internal_server_error;
}

async function loadSettings(): Promise<SettingsPayload> {
  const [
    currentCycleResponse,
    cyclesResponse,
    careersResponse,
    subjectsResponse,
    scholarshipResponse,
  ] = await Promise.all([
    requestJson<{ cycle: SafeAdministrativeCycle | null }>(
      "/api/admin/cycles/current",
    ),
    requestJson<{ cycles: SafeAdministrativeCycle[] }>(
      "/api/admin/cycles",
    ),
    requestJson<{ careers: SafeCareer[] }>(
      "/api/admin/settings/careers?status=ALL",
    ),
    requestJson<{ subjects: SafeSubject[] }>(
      "/api/admin/settings/subjects?status=ALL",
    ),
    requestJson<{ scholarshipReferences: SafeScholarshipReference[] }>(
      "/api/admin/settings/scholarship-references?status=ALL",
    ),
  ]);

  return {
    currentCycle: currentCycleResponse.cycle,
    cycles: cyclesResponse.cycles,
    careers: careersResponse.careers,
    subjects: subjectsResponse.subjects,
    scholarshipReferences: scholarshipResponse.scholarshipReferences,
  };
}

function statusLabel(status: "ACTIVE" | "INACTIVE") {
  return status === "ACTIVE" ? "Activa" : "Inactiva";
}

function statusVariant(status: "ACTIVE" | "INACTIVE"): StatusBadgeVariant {
  return status === "ACTIVE" ? "success" : "neutral";
}

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((left, right) =>
    left.name.localeCompare(right.name, "es-AR", { sensitivity: "base" }),
  );
}

function sortSubjects(items: SafeSubject[]) {
  return [...items].sort((left, right) => {
    const careerOrder = left.careerName.localeCompare(
      right.careerName,
      "es-AR",
      { sensitivity: "base" },
    );

    if (careerOrder !== 0) {
      return careerOrder;
    }

    return left.name.localeCompare(right.name, "es-AR", {
      sensitivity: "base",
    });
  });
}

function sortScholarshipReferences(items: SafeScholarshipReference[]) {
  return [...items].sort((left, right) =>
    left.type.localeCompare(right.type, "es-AR", { sensitivity: "base" }),
  );
}

function upsertById<T extends { id: string }>(items: T[], next: T) {
  const existingIndex = items.findIndex((item) => item.id === next.id);

  if (existingIndex === -1) {
    return [...items, next];
  }

  return items.map((item) => (item.id === next.id ? next : item));
}

function FeedbackBanner({
  action,
  feedback,
}: {
  action?: ReactNode;
  feedback: Feedback;
}) {
  return (
    <div
      aria-live={feedback.kind === "error" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3 text-sm",
        feedback.kind === "error"
          ? "border-danger/30 bg-danger-surface/60 text-danger"
          : "border-success/30 bg-success-surface/60 text-success",
      )}
      role={feedback.kind === "error" ? "alert" : "status"}
    >
      {feedback.kind === "error" ? (
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>{feedback.message}</span>
        {action}
      </div>
    </div>
  );
}

function ReferenceStatusAction({
  disabled,
  entityLabel,
  onClick,
  status,
}: {
  disabled: boolean;
  entityLabel: string;
  onClick: () => void;
  status: "ACTIVE" | "INACTIVE";
}) {
  const activating = status === "INACTIVE";
  const actionLabel = activating ? "Activar" : "Inactivar";

  return (
    <Button
      aria-label={`${actionLabel} ${entityLabel}`}
      disabled={disabled}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      <Power aria-hidden="true" />
      {actionLabel}
    </Button>
  );
}

function ReferenceStatusBadge({ status }: { status: "ACTIVE" | "INACTIVE" }) {
  return <StatusBadge label={statusLabel(status)} variant={statusVariant(status)} />;
}

function EmptyReferenceList({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-foreground-secondary">
      {children}
    </p>
  );
}

function CareerSection({
  careers,
  disabled,
  form,
  onCancel,
  onEdit,
  onNameChange,
  onStatusChange,
  onSubmit,
}: {
  careers: SafeCareer[];
  disabled: boolean;
  form: CareerForm;
  onCancel: () => void;
  onEdit: (career: SafeCareer) => void;
  onNameChange: (name: string) => void;
  onStatusChange: (career: SafeCareer) => void;
  onSubmit: SubmitHandler;
}) {
  const editingCareer =
    form.id === null
      ? null
      : careers.find((career) => career.id === form.id) ?? null;

  return (
    <section aria-labelledby="career-settings-title">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle id="career-settings-title">Carreras</CardTitle>
              <CardDescription className="mt-2">
                Mantener las carreras disponibles para el contexto académico de los tutores.
              </CardDescription>
            </div>
            <StatusBadge
              label={`${careers.filter((career) => career.status === "ACTIVE").length} activas`}
              variant="info"
            />
          </div>
        </CardHeader>
        <CardContent>
          <form
            aria-label={
              editingCareer === null
                ? "Agregar carrera"
                : `Editar carrera ${editingCareer.name}`
            }
            className="rounded-md border border-border-subtle bg-surface-subtle/60 p-4"
            onSubmit={onSubmit}
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground-secondary">
                  Nombre de la carrera
                </span>
                <Input
                  disabled={disabled}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder="Ingeniería en Sistemas"
                  required
                  value={form.name}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button disabled={disabled} size="sm" type="submit">
                  {editingCareer === null ? "Agregar carrera" : "Guardar cambios"}
                </Button>
                {editingCareer !== null && (
                  <Button
                    disabled={disabled}
                    onClick={onCancel}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </form>

          {careers.length === 0 ? (
            <EmptyReferenceList>Todavía no hay carreras registradas.</EmptyReferenceList>
          ) : (
            <>
              <ul aria-label="Carreras registradas" className="mt-6 space-y-3 md:hidden">
                {careers.map((career) => (
                  <li className="rounded-md border border-border-subtle p-4" key={career.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{career.name}</p>
                        <div className="mt-2">
                          <ReferenceStatusBadge status={career.status} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          aria-label={`Editar carrera ${career.name}`}
                          disabled={disabled}
                          onClick={() => onEdit(career)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <Pencil aria-hidden="true" />
                          Editar
                        </Button>
                        <ReferenceStatusAction
                          disabled={disabled}
                          entityLabel={`carrera ${career.name}`}
                          onClick={() => onStatusChange(career)}
                          status={career.status}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 hidden overflow-x-auto rounded-md border border-border-subtle md:block">
                <Table className="min-w-[38rem]">
                  <caption className="sr-only">Carreras registradas</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Carrera</TableHead>
                      <TableHead scope="col">Estado</TableHead>
                      <TableHead scope="col">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {careers.map((career) => (
                      <TableRow key={career.id}>
                        <TableCell className="font-medium">{career.name}</TableCell>
                        <TableCell>
                          <ReferenceStatusBadge status={career.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              aria-label={`Editar carrera ${career.name}`}
                              disabled={disabled}
                              onClick={() => onEdit(career)}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              <Pencil aria-hidden="true" />
                              Editar
                            </Button>
                            <ReferenceStatusAction
                              disabled={disabled}
                              entityLabel={`carrera ${career.name}`}
                              onClick={() => onStatusChange(career)}
                              status={career.status}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function SubjectSection({
  careers,
  disabled,
  form,
  onCancel,
  onCareerChange,
  onEdit,
  onNameChange,
  onStatusChange,
  onSubmit,
  subjects,
}: {
  careers: SafeCareer[];
  disabled: boolean;
  form: SubjectForm;
  onCancel: () => void;
  onCareerChange: (careerId: string) => void;
  onEdit: (subject: SafeSubject) => void;
  onNameChange: (name: string) => void;
  onStatusChange: (subject: SafeSubject) => void;
  onSubmit: SubmitHandler;
  subjects: SafeSubject[];
}) {
  const editingSubject =
    form.id === null
      ? null
      : subjects.find((subject) => subject.id === form.id) ?? null;
  const activeCareers = careers.filter((career) => career.status === "ACTIVE");
  const selectedCareer = careers.find((career) => career.id === form.careerId);
  const careerOptions = useMemo(() => {
    if (selectedCareer !== undefined && selectedCareer.status === "INACTIVE") {
      return [
        selectedCareer,
        ...activeCareers.filter((career) => career.id !== selectedCareer.id),
      ];
    }

    return activeCareers;
  }, [activeCareers, selectedCareer]);

  return (
    <section aria-labelledby="subject-settings-title">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle id="subject-settings-title">Materias</CardTitle>
              <CardDescription className="mt-2">
                Administrar materias dentro de una carrera activa. Las relaciones históricas se conservan.
              </CardDescription>
            </div>
            <StatusBadge
              label={`${subjects.filter((subject) => subject.status === "ACTIVE").length} activas`}
              variant="info"
            />
          </div>
        </CardHeader>
        <CardContent>
          <form
            aria-label={
              editingSubject === null
                ? "Agregar materia"
                : `Editar materia ${editingSubject.name}`
            }
            className="rounded-md border border-border-subtle bg-surface-subtle/60 p-4"
            onSubmit={onSubmit}
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground-secondary">
                  Nombre de la materia
                </span>
                <Input
                  disabled={disabled}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder="Álgebra"
                  required
                  value={form.name}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground-secondary">
                  Carrera
                </span>
                <select
                  className={selectClassName}
                  disabled={disabled || activeCareers.length === 0}
                  onChange={(event) => onCareerChange(event.target.value)}
                  required
                  value={form.careerId}
                >
                  <option value="">Seleccionar una carrera activa</option>
                  {careerOptions.map((career) => (
                    <option
                      disabled={career.status === "INACTIVE"}
                      key={career.id}
                      value={career.id}
                    >
                      {career.name}{career.status === "INACTIVE" ? " · inactiva" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={disabled || activeCareers.length === 0}
                  size="sm"
                  type="submit"
                >
                  {editingSubject === null ? "Agregar materia" : "Guardar cambios"}
                </Button>
                {editingSubject !== null && (
                  <Button
                    disabled={disabled}
                    onClick={onCancel}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
            {activeCareers.length === 0 && (
              <p className="mt-3 text-sm text-warning">
                Crear o activar una carrera antes de agregar materias.
              </p>
            )}
          </form>

          {subjects.length === 0 ? (
            <EmptyReferenceList>Todavía no hay materias registradas.</EmptyReferenceList>
          ) : (
            <>
              <ul aria-label="Materias registradas" className="mt-6 space-y-3 md:hidden">
                {subjects.map((subject) => (
                  <li className="rounded-md border border-border-subtle p-4" key={subject.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{subject.name}</p>
                        <p className="mt-1 text-sm text-foreground-secondary">{subject.careerName}</p>
                        <div className="mt-2">
                          <ReferenceStatusBadge status={subject.status} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          aria-label={`Editar materia ${subject.name}`}
                          disabled={disabled}
                          onClick={() => onEdit(subject)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <Pencil aria-hidden="true" />
                          Editar
                        </Button>
                        <ReferenceStatusAction
                          disabled={disabled}
                          entityLabel={`materia ${subject.name}`}
                          onClick={() => onStatusChange(subject)}
                          status={subject.status}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 hidden overflow-x-auto rounded-md border border-border-subtle md:block">
                <Table className="min-w-[52rem]">
                  <caption className="sr-only">Materias registradas</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Materia</TableHead>
                      <TableHead scope="col">Carrera</TableHead>
                      <TableHead scope="col">Estado</TableHead>
                      <TableHead scope="col">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell className="text-foreground-secondary">
                          {subject.careerName}
                        </TableCell>
                        <TableCell>
                          <ReferenceStatusBadge status={subject.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              aria-label={`Editar materia ${subject.name}`}
                              disabled={disabled}
                              onClick={() => onEdit(subject)}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              <Pencil aria-hidden="true" />
                              Editar
                            </Button>
                            <ReferenceStatusAction
                              disabled={disabled}
                              entityLabel={`materia ${subject.name}`}
                              onClick={() => onStatusChange(subject)}
                              status={subject.status}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ScholarshipSection({
  disabled,
  form,
  onCancel,
  onEdit,
  onHoursChange,
  onNotesChange,
  onStatusChange,
  onSubmit,
  onTypeChange,
  references,
}: {
  disabled: boolean;
  form: ScholarshipForm;
  onCancel: () => void;
  onEdit: (reference: SafeScholarshipReference) => void;
  onHoursChange: (hours: string) => void;
  onNotesChange: (notes: string) => void;
  onStatusChange: (reference: SafeScholarshipReference) => void;
  onSubmit: SubmitHandler;
  onTypeChange: (type: string) => void;
  references: SafeScholarshipReference[];
}) {
  const editingReference =
    form.id === null
      ? null
      : references.find((reference) => reference.id === form.id) ?? null;

  return (
    <section aria-labelledby="scholarship-settings-title">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle id="scholarship-settings-title">Referencias de beca</CardTitle>
              <CardDescription className="mt-2">
                Mantener tipos de referencia y datos conocidos. Esta información es orientativa y no certifica cumplimiento.
              </CardDescription>
            </div>
            <StatusBadge
              label={`${references.filter((reference) => reference.status === "ACTIVE").length} activas`}
              variant="info"
            />
          </div>
        </CardHeader>
        <CardContent>
          <form
            aria-label={
              editingReference === null
                ? "Agregar referencia de beca"
                : `Editar referencia ${editingReference.type}`
            }
            className="rounded-md border border-border-subtle bg-surface-subtle/60 p-4"
            onSubmit={onSubmit}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground-secondary">
                  Tipo de referencia
                </span>
                <Input
                  disabled={disabled}
                  onChange={(event) => onTypeChange(event.target.value)}
                  placeholder="Beca institucional"
                  required
                  value={form.type}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground-secondary">
                  Horas requeridas conocidas (informativo)
                </span>
                <Input
                  disabled={disabled}
                  min="0"
                  onChange={(event) => onHoursChange(event.target.value)}
                  placeholder="Sin dato"
                  step="1"
                  type="number"
                  value={form.knownRequiredHours}
                />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-foreground-secondary">Notas</span>
                <textarea
                  className={textareaClassName}
                  disabled={disabled}
                  onChange={(event) => onNotesChange(event.target.value)}
                  placeholder="Contexto de referencia, sin resultado de cumplimiento"
                  value={form.notes}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={disabled} size="sm" type="submit">
                {editingReference === null ? "Agregar referencia" : "Guardar cambios"}
              </Button>
              {editingReference !== null && (
                <Button
                  disabled={disabled}
                  onClick={onCancel}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>

          {references.length === 0 ? (
            <EmptyReferenceList>
              Todavía no hay referencias de beca registradas.
            </EmptyReferenceList>
          ) : (
            <>
              <ul
                aria-label="Referencias de beca registradas"
                className="mt-6 space-y-3 md:hidden"
              >
                {references.map((reference) => (
                  <li className="rounded-md border border-border-subtle p-4" key={reference.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{reference.type}</p>
                        <p className="mt-1 text-sm text-foreground-secondary">
                          {reference.knownRequiredHours === null
                            ? "Horas requeridas: sin dato"
                            : `Horas requeridas conocidas: ${reference.knownRequiredHours}`}
                        </p>
                        {reference.notes !== null && (
                          <p className="mt-1 text-sm text-foreground-muted">{reference.notes}</p>
                        )}
                        <div className="mt-2">
                          <ReferenceStatusBadge status={reference.status} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          aria-label={`Editar referencia ${reference.type}`}
                          disabled={disabled}
                          onClick={() => onEdit(reference)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <Pencil aria-hidden="true" />
                          Editar
                        </Button>
                        <ReferenceStatusAction
                          disabled={disabled}
                          entityLabel={`referencia ${reference.type}`}
                          onClick={() => onStatusChange(reference)}
                          status={reference.status}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 hidden overflow-x-auto rounded-md border border-border-subtle md:block">
                <Table className="min-w-[64rem]">
                  <caption className="sr-only">Referencias de beca registradas</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Tipo</TableHead>
                      <TableHead scope="col">Horas conocidas</TableHead>
                      <TableHead scope="col">Notas</TableHead>
                      <TableHead scope="col">Estado</TableHead>
                      <TableHead scope="col">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {references.map((reference) => (
                      <TableRow key={reference.id}>
                        <TableCell className="font-medium">{reference.type}</TableCell>
                        <TableCell className="text-foreground-secondary">
                          {reference.knownRequiredHours === null
                            ? "Sin dato"
                            : `${reference.knownRequiredHours} horas`}
                        </TableCell>
                        <TableCell className="max-w-xs text-foreground-secondary">
                          {reference.notes ?? "Sin notas"}
                        </TableCell>
                        <TableCell>
                          <ReferenceStatusBadge status={reference.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              aria-label={`Editar referencia ${reference.type}`}
                              disabled={disabled}
                              onClick={() => onEdit(reference)}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              <Pencil aria-hidden="true" />
                              Editar
                            </Button>
                            <ReferenceStatusAction
                              disabled={disabled}
                              entityLabel={`referencia ${reference.type}`}
                              onClick={() => onStatusChange(reference)}
                              status={reference.status}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function SettingsScreen({
  careers: initialCareers = [],
  currentCycle: initialCurrentCycle,
  cycles: initialCycles,
  initialErrorMessage,
  initialState,
  scholarshipReferences: initialScholarshipReferences = [],
  subjects: initialSubjects = [],
}: SettingsScreenProps) {
  const [currentCycle, setCurrentCycle] = useState(initialCurrentCycle);
  const [cycles, setCycles] = useState(initialCycles);
  const [careers, setCareers] = useState(sortByName(initialCareers));
  const [subjects, setSubjects] = useState(sortSubjects(initialSubjects));
  const [scholarshipReferences, setScholarshipReferences] = useState(
    sortScholarshipReferences(initialScholarshipReferences),
  );
  const [cycleForm, setCycleForm] = useState<CycleForm>(EMPTY_CYCLE_FORM);
  const [careerForm, setCareerForm] = useState<CareerForm>(EMPTY_CAREER_FORM);
  const [subjectForm, setSubjectForm] = useState<SubjectForm>(EMPTY_SUBJECT_FORM);
  const [scholarshipForm, setScholarshipForm] = useState<ScholarshipForm>(
    EMPTY_SCHOLARSHIP_FORM,
  );
  const [state, setState] = useState<SettingsState>(initialState ?? "default");
  const [feedback, setFeedback] = useState<Feedback | null>(
    initialErrorMessage === undefined
      ? null
      : { kind: "error", message: initialErrorMessage },
  );
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);

  const isLoading = state === "loading";
  const screenState =
    currentCycle === null && state === "default" ? "required-action" : state;

  const updateStateForEditing = () => {
    setState("default");
    setFeedback(null);
  };

  const runSettingsAction = async <T,>(
    action: () => Promise<T>,
    successMessage: string,
    onSuccess: (value: T) => void,
  ) => {
    setState("loading");
    setFeedback(null);

    try {
      const value = await action();
      onSuccess(value);
      setState("success");
      setFeedback({ kind: "success", message: successMessage });
    } catch (error) {
      setState("error");
      setFeedback({ kind: "error", message: getFeedbackMessage(error) });
    }
  };

  const refreshSettings = async () => {
    setState("loading");
    setFeedback(null);

    try {
      const next = await loadSettings();
      setCurrentCycle(next.currentCycle);
      setCycles(next.cycles);
      setCareers(sortByName(next.careers));
      setSubjects(sortSubjects(next.subjects));
      setScholarshipReferences(sortScholarshipReferences(next.scholarshipReferences));
      setState("default");
    } catch (error) {
      setState("error");
      setFeedback({ kind: "error", message: getFeedbackMessage(error) });
    }
  };

  const handleCreateCycle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runSettingsAction(
      async () => {
        const response = await requestJson<{ cycle?: SafeAdministrativeCycle }>(
          "/api/admin/cycles",
          { method: "POST", body: JSON.stringify(cycleForm) },
        );

        if (response.cycle === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.cycle;
      },
      "El ciclo se creó correctamente.",
      (cycle) => {
        setCurrentCycle(cycle);
        setCycles((previous) => [
          cycle,
          ...previous.filter((previousCycle) => previousCycle.id !== cycle.id),
        ]);
        setCycleForm(EMPTY_CYCLE_FORM);
      },
    );
  };

  const handleCloseCycle = async () => {
    if (currentCycle === null) {
      return;
    }

    await runSettingsAction(
      async () => {
        const response = await requestJson<{ cycle?: SafeAdministrativeCycle }>(
          `/api/admin/cycles/${encodeURIComponent(currentCycle.id)}/close`,
          { method: "POST" },
        );

        if (response.cycle === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.cycle;
      },
      "El ciclo se cerró correctamente. El historial se conserva.",
      (cycle) => {
        setCurrentCycle(null);
        setCycles((previous) =>
          previous.map((previousCycle) =>
            previousCycle.id === cycle.id ? cycle : previousCycle,
          ),
        );
        setCloseConfirmationOpen(false);
      },
    );
  };

  const handleCareerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const careerId = careerForm.id;
    const endpoint =
      careerId === null
        ? "/api/admin/settings/careers"
        : `/api/admin/settings/careers/${encodeURIComponent(careerId)}`;

    await runSettingsAction(
      async () => {
        const response = await requestJson<{ career?: SafeCareer }>(endpoint, {
          body: JSON.stringify({ name: careerForm.name }),
          method: careerId === null ? "POST" : "PATCH",
        });

        if (response.career === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.career;
      },
      careerId === null
        ? "La carrera se creó correctamente."
        : "La carrera se actualizó correctamente.",
      (career) => {
        setCareers((previous) => sortByName(upsertById(previous, career)));
        setCareerForm(EMPTY_CAREER_FORM);
      },
    );
  };

  const handleCareerStatusChange = async (career: SafeCareer) => {
    await runSettingsAction(
      async () => {
        const response = await requestJson<{ career?: SafeCareer }>(
          `/api/admin/settings/careers/${encodeURIComponent(career.id)}/status`,
          {
            body: JSON.stringify({
              status: career.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            }),
            method: "PATCH",
          },
        );

        if (response.career === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.career;
      },
      career.status === "ACTIVE"
        ? "La carrera se inactivó y se conservaron sus relaciones."
        : "La carrera se activó correctamente.",
      (nextCareer) => {
        setCareers((previous) => sortByName(upsertById(previous, nextCareer)));
      },
    );
  };

  const handleSubjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subjectId = subjectForm.id;
    const existingSubject =
      subjectId === null
        ? undefined
        : subjects.find((subject) => subject.id === subjectId);
    const endpoint =
      subjectId === null
        ? "/api/admin/settings/subjects"
        : `/api/admin/settings/subjects/${encodeURIComponent(subjectId)}`;
    const body =
      subjectId !== null &&
      existingSubject !== undefined &&
      existingSubject.careerId === subjectForm.careerId
        ? { name: subjectForm.name }
        : { careerId: subjectForm.careerId, name: subjectForm.name };

    await runSettingsAction(
      async () => {
        const response = await requestJson<{ subject?: SafeSubject }>(endpoint, {
          body: JSON.stringify(body),
          method: subjectId === null ? "POST" : "PATCH",
        });

        if (response.subject === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.subject;
      },
      subjectId === null
        ? "La materia se creó correctamente."
        : "La materia se actualizó correctamente.",
      (subject) => {
        setSubjects((previous) => sortSubjects(upsertById(previous, subject)));
        setSubjectForm(EMPTY_SUBJECT_FORM);
      },
    );
  };

  const handleSubjectStatusChange = async (subject: SafeSubject) => {
    await runSettingsAction(
      async () => {
        const response = await requestJson<{ subject?: SafeSubject }>(
          `/api/admin/settings/subjects/${encodeURIComponent(subject.id)}/status`,
          {
            body: JSON.stringify({
              status: subject.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            }),
            method: "PATCH",
          },
        );

        if (response.subject === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.subject;
      },
      subject.status === "ACTIVE"
        ? "La materia se inactivó y se conservaron sus relaciones."
        : "La materia se activó correctamente.",
      (nextSubject) => {
        setSubjects((previous) => sortSubjects(upsertById(previous, nextSubject)));
      },
    );
  };

  const handleScholarshipSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hoursValue = scholarshipForm.knownRequiredHours.trim();

    if (
      hoursValue !== "" &&
      (!Number.isInteger(Number(hoursValue)) || Number(hoursValue) < 0)
    ) {
      setState("error");
      setFeedback({
        kind: "error",
        message: "Las horas requeridas deben ser un número entero no negativo.",
      });
      return;
    }

    const referenceId = scholarshipForm.id;
    const endpoint =
      referenceId === null
        ? "/api/admin/settings/scholarship-references"
        : `/api/admin/settings/scholarship-references/${encodeURIComponent(referenceId)}`;
    const body = {
      knownRequiredHours: hoursValue === "" ? null : Number(hoursValue),
      notes: scholarshipForm.notes.trim() === "" ? null : scholarshipForm.notes,
      type: scholarshipForm.type,
    };

    await runSettingsAction(
      async () => {
        const response = await requestJson<{
          scholarshipReference?: SafeScholarshipReference;
        }>(endpoint, {
          body: JSON.stringify(body),
          method: referenceId === null ? "POST" : "PATCH",
        });

        if (response.scholarshipReference === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.scholarshipReference;
      },
      referenceId === null
        ? "La referencia de beca se creó correctamente."
        : "La referencia de beca se actualizó correctamente.",
      (reference) => {
        setScholarshipReferences((previous) =>
          sortScholarshipReferences(upsertById(previous, reference)),
        );
        setScholarshipForm(EMPTY_SCHOLARSHIP_FORM);
      },
    );
  };

  const handleScholarshipStatusChange = async (
    reference: SafeScholarshipReference,
  ) => {
    await runSettingsAction(
      async () => {
        const response = await requestJson<{
          scholarshipReference?: SafeScholarshipReference;
        }>(
          `/api/admin/settings/scholarship-references/${encodeURIComponent(reference.id)}/status`,
          {
            body: JSON.stringify({
              status: reference.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            }),
            method: "PATCH",
          },
        );

        if (response.scholarshipReference === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.scholarshipReference;
      },
      reference.status === "ACTIVE"
        ? "La referencia de beca se inactivó y se conservaron sus relaciones."
        : "La referencia de beca se activó correctamente.",
      (nextReference) => {
        setScholarshipReferences((previous) =>
          sortScholarshipReferences(upsertById(previous, nextReference)),
        );
      },
    );
  };

  return (
    <div data-slot="settings-screen" data-state={screenState}>
      <PageHeader
        action={
          <Button
            disabled={isLoading}
            onClick={() => void refreshSettings()}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw aria-hidden="true" className={cn(isLoading && "animate-spin")} />
            {state === "error" ? "Reintentar" : "Actualizar"}
          </Button>
        }
        breadcrumbs={[{ label: "Configuración" }]}
        description="Administrar el ciclo vigente, el catálogo académico y las referencias de beca."
        title="Configuración"
      />

      <div className="mt-6 space-y-6">
        {feedback && (
          <FeedbackBanner
            action={
              feedback.kind === "error" ? (
                <Button
                  disabled={isLoading}
                  onClick={() => void refreshSettings()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Reintentar
                </Button>
              ) : undefined
            }
            feedback={feedback}
          />
        )}

        {state === "loading" && (
          <div
            aria-live="polite"
            className="rounded-md border border-border-subtle bg-surface-subtle/60 px-4 py-3 text-sm text-foreground-secondary"
            role="status"
          >
            Guardando cambios de configuración…
          </div>
        )}

        <section aria-labelledby="current-cycle-title">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle id="current-cycle-title">Ciclo actual</CardTitle>
                  <CardDescription className="mt-2">
                    El ciclo abierto define el contexto administrativo vigente.
                  </CardDescription>
                </div>
                <StatusBadge
                  label={currentCycle === null ? "Requiere acción" : "Ciclo abierto"}
                  variant={currentCycle === null ? "warning" : "success"}
                />
              </div>
            </CardHeader>
            <CardContent>
              {currentCycle === null ? (
                <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-surface/60 p-4 text-sm text-foreground-secondary">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  <p>
                    Todavía no hay un ciclo abierto. Crear uno para establecer el contexto de las operaciones administrativas.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {currentCycle.name}
                    </h3>
                    <p className="mt-1 text-sm text-foreground-secondary">
                      {formatCyclePeriod(currentCycle)}
                    </p>
                  </div>
                  <Button
                    disabled={isLoading}
                    onClick={() => setCloseConfirmationOpen(true)}
                    type="button"
                    variant="destructive"
                  >
                    Cerrar ciclo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="create-cycle-title">
          <Card>
            <CardHeader>
              <CardTitle id="create-cycle-title">Crear ciclo</CardTitle>
              <CardDescription>
                Definir el período del nuevo ciclo administrativo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleCreateCycle}>
                <div className="grid gap-5 md:grid-cols-3">
                  <label className="space-y-2 md:col-span-3">
                    <span className="text-sm font-medium text-foreground">Nombre</span>
                    <Input
                      disabled={isLoading || currentCycle !== null}
                      onChange={(event) =>
                        setCycleForm((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Ciclo lectivo 2027"
                      required
                      value={cycleForm.name}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Fecha de inicio</span>
                    <Input
                      disabled={isLoading || currentCycle !== null}
                      onChange={(event) =>
                        setCycleForm((previous) => ({
                          ...previous,
                          startDate: event.target.value,
                        }))
                      }
                      required
                      type="date"
                      value={cycleForm.startDate}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Fecha de finalización</span>
                    <Input
                      disabled={isLoading || currentCycle !== null}
                      onChange={(event) =>
                        setCycleForm((previous) => ({
                          ...previous,
                          endDate: event.target.value,
                        }))
                      }
                      required
                      type="date"
                      value={cycleForm.endDate}
                    />
                  </label>
                </div>

                {currentCycle !== null && (
                  <p className="text-sm text-foreground-secondary">
                    Cerrar el ciclo actual para crear uno nuevo.
                  </p>
                )}

                <Button disabled={isLoading || currentCycle !== null} type="submit">
                  {isLoading ? "Guardando ciclo…" : "Crear ciclo"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <CareerSection
            careers={careers}
            disabled={isLoading}
            form={careerForm}
            onCancel={() => {
              setCareerForm(EMPTY_CAREER_FORM);
              updateStateForEditing();
            }}
            onEdit={(career) => {
              setCareerForm({ id: career.id, name: career.name });
              updateStateForEditing();
            }}
            onNameChange={(name) =>
              setCareerForm((previous) => ({ ...previous, name }))
            }
            onStatusChange={(career) => void handleCareerStatusChange(career)}
            onSubmit={handleCareerSubmit}
          />

          <SubjectSection
            careers={careers}
            disabled={isLoading}
            form={subjectForm}
            onCancel={() => {
              setSubjectForm(EMPTY_SUBJECT_FORM);
              updateStateForEditing();
            }}
            onCareerChange={(careerId) =>
              setSubjectForm((previous) => ({ ...previous, careerId }))
            }
            onEdit={(subject) => {
              setSubjectForm({
                id: subject.id,
                name: subject.name,
                careerId: subject.careerId,
              });
              updateStateForEditing();
            }}
            onNameChange={(name) =>
              setSubjectForm((previous) => ({ ...previous, name }))
            }
            onStatusChange={(subject) => void handleSubjectStatusChange(subject)}
            onSubmit={handleSubjectSubmit}
            subjects={subjects}
          />
        </div>

        <ScholarshipSection
          disabled={isLoading}
          form={scholarshipForm}
          onCancel={() => {
            setScholarshipForm(EMPTY_SCHOLARSHIP_FORM);
            updateStateForEditing();
          }}
          onEdit={(reference) => {
            setScholarshipForm({
              id: reference.id,
              type: reference.type,
              knownRequiredHours:
                reference.knownRequiredHours === null
                  ? ""
                  : String(reference.knownRequiredHours),
              notes: reference.notes ?? "",
            });
            updateStateForEditing();
          }}
          onHoursChange={(knownRequiredHours) =>
            setScholarshipForm((previous) => ({ ...previous, knownRequiredHours }))
          }
          onNotesChange={(notes) =>
            setScholarshipForm((previous) => ({ ...previous, notes }))
          }
          onStatusChange={(reference) => void handleScholarshipStatusChange(reference)}
          onSubmit={handleScholarshipSubmit}
          onTypeChange={(type) =>
            setScholarshipForm((previous) => ({ ...previous, type }))
          }
          references={scholarshipReferences}
        />

        <section aria-labelledby="cycle-history-title">
          <Card>
            <CardHeader>
              <CardTitle id="cycle-history-title">Historial de ciclos</CardTitle>
              <CardDescription>
                Los ciclos cerrados conservan su información para consulta futura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cycles.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-foreground-secondary">
                  Todavía no hay ciclos registrados.
                </p>
              ) : (
                <ul className="divide-y divide-border" aria-label="Ciclos registrados">
                  {cycles.map((cycle) => (
                    <li
                      className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      key={cycle.id}
                    >
                      <div>
                        <p className="font-medium text-foreground">{cycle.name}</p>
                        <p className="mt-1 text-sm text-foreground-secondary">
                          {formatCyclePeriod(cycle)}
                        </p>
                      </div>
                      <StatusBadge
                        label={cycle.status === "OPEN" ? "Abierto" : "Cerrado"}
                        variant={cycle.status === "OPEN" ? "success" : "neutral"}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {closeConfirmationOpen && currentCycle !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/20 p-4">
          <div
            aria-describedby="close-cycle-description"
            aria-labelledby="close-cycle-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-dialog"
            role="alertdialog"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold text-foreground" id="close-cycle-title">
                  Confirmar cierre del ciclo
                </h2>
                <p
                  className="mt-2 text-sm leading-relaxed text-foreground-secondary"
                  id="close-cycle-description"
                >
                  Se cerrará “{currentCycle.name}”. El historial permanecerá disponible y el próximo ciclo comenzará con saldo de horas cero.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                disabled={isLoading}
                onClick={() => setCloseConfirmationOpen(false)}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                disabled={isLoading}
                onClick={() => void handleCloseCycle()}
                type="button"
                variant="destructive"
              >
                {isLoading ? "Cerrando ciclo…" : "Confirmar cierre"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
