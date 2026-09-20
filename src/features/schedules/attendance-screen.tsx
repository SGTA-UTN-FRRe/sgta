"use client";

import Link from "next/link";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Info,
  Settings2,
  UserRound,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SafeHourCategory, SafeHourMovement } from "@/features/hours/hour-service";
import type {
  SafeAttendanceDateResult,
  SafeAttendanceMutationResult,
  SafeAttendanceOccurrence,
  SafeRecoveryRecognitionResult,
} from "./attendance-service";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import {
  StatusBadge,
  type StatusBadgeVariant,
} from "@/shared/components/status-badge";
import { cn } from "@/shared/utils";

export type AttendanceScreenState =
  | "default"
  | "empty"
  | "error"
  | "loading"
  | "required-action"
  | "success";

export interface AttendanceScreenProps {
  data: SafeAttendanceDateResult | null;
  initialErrorMessage?: string;
  state?: AttendanceScreenState;
}

type AttendanceMutationResponse =
  | SafeAttendanceMutationResult
  | SafeRecoveryRecognitionResult;

type AttendanceRequestIssue = {
  message: string;
  path: Array<string | number>;
};

type DialogState =
  | { entry: SafeAttendanceOccurrence; kind: "correction" }
  | { entry: SafeAttendanceOccurrence; kind: "debit" }
  | { entry: SafeAttendanceOccurrence; kind: "recovery" }
  | null;

type RecoveryOrigin = {
  categoryName: string;
  movementId: string;
};

type DebitFormValues = {
  categoryId: string;
  debitMinutes: number;
  note: string | null;
};

type CorrectionFormValues = {
  note: string | null;
  status: "PRESENT" | "ABSENT";
};

type RecoveryFormValues = {
  categoryId: string;
  note: string | null;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const selectClassName =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const textareaClassName =
  "min-h-20 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const attendanceStatusLabels = {
  ABSENT: "Falta",
  PENDING: "Pendiente",
  PRESENT: "Presente",
} as const;

const debitStatusLabels = {
  CANCELLED: "Sin débito",
  CONFIRMED: "Débito confirmado",
  NOT_PROPOSED: "Sin débito",
  PROPOSED: "Débito pendiente",
} as const;

const attendanceErrorMessages: Record<string, string> = {
  absence_proposal_not_found:
    "La propuesta de débito ya no está disponible. Actualizar la fecha e intentar nuevamente.",
  attendance_not_found:
    "La asistencia ya no está disponible. Actualizar la fecha e intentar nuevamente.",
  category_not_found: "La categoría seleccionada ya no está disponible.",
  cycle_not_open: "El ciclo seleccionado ya no está abierto para registrar asistencia.",
  date_outside_cycle: "La fecha debe pertenecer al ciclo administrativo vigente.",
  debit_already_confirmed:
    "El débito ya fue confirmado. Corregir la asistencia para revertirlo de forma trazable.",
  debit_minutes_invalid:
    "Los minutos deben ser positivos y no superar la duración de la ocurrencia.",
  forbidden: "No tienes permisos para registrar asistencia.",
  inactive_category: "La categoría seleccionada ya no está activa.",
  internal_server_error: "No se pudo completar la operación. Intentar nuevamente.",
  invalid_request: "Revisar los datos ingresados antes de intentar nuevamente.",
  occurrence_not_found:
    "La ocurrencia ya no está disponible. Actualizar la fecha e intentar nuevamente.",
  open_cycle_required: "Abrir un ciclo administrativo antes de registrar asistencia.",
  recovery_already_recognized:
    "La recuperación ya fue reconocida para esta ocurrencia.",
  recovery_category_required:
    "Seleccionar una categoría activa configurada para recuperación.",
  recovery_not_eligible: "Esta ocurrencia no está marcada como recuperación.",
  schedule_conflict: "La ocurrencia cambió de contexto. Actualizar la fecha e intentar nuevamente.",
  status_already_set: "La asistencia ya tiene el estado solicitado.",
  unauthorized: "La sesión expiró. Volver a iniciar sesión para continuar.",
};

class AttendanceRequestError extends Error {
  readonly code: string;
  readonly issues: AttendanceRequestIssue[];
  readonly status: number;

  constructor(
    code: string,
    status: number,
    issues: AttendanceRequestIssue[] = [],
  ) {
    super(code);
    this.name = "AttendanceRequestError";
    this.code = code;
    this.issues = issues;
    this.status = status;
  }
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
    (issue): issue is AttendanceRequestIssue =>
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
        accept: "application/json",
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new AttendanceRequestError("internal_server_error", 500);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AttendanceRequestError(
      getErrorCode(body),
      response.status,
      getErrorIssues(body),
    );
  }

  return body as T;
}

function getAttendanceErrorMessage(error: unknown) {
  if (error instanceof AttendanceRequestError) {
    return (
      attendanceErrorMessages[error.code] ??
      attendanceErrorMessages.internal_server_error
    );
  }

  return attendanceErrorMessages.internal_server_error;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  return year && month && day ? `${day}/${month}/${year}` : date;
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const remainder = (minutes % 60).toString().padStart(2, "0");

  return `${hours}:${remainder}`;
}

function occurrenceDuration(entry: SafeAttendanceOccurrence) {
  return entry.occurrence.endMinutes - entry.occurrence.startMinutes;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return `${hours} h ${remainder.toString().padStart(2, "0")} min`;
}

function attendanceStatusVariant(
  status: SafeAttendanceOccurrence["attendance"]["status"],
): StatusBadgeVariant {
  if (status === "PRESENT") return "success";
  if (status === "ABSENT") return "danger";
  return "neutral";
}

function debitStatusVariant(
  status: SafeAttendanceOccurrence["attendance"]["debitStatus"],
): StatusBadgeVariant {
  if (status === "CONFIRMED") return "warning";
  if (status === "PROPOSED") return "info";
  return "neutral";
}

function deriveState(data: SafeAttendanceDateResult | null): AttendanceScreenState {
  if (data === null) {
    return "error";
  }

  return data.occurrences.length === 0 ? "empty" : "default";
}

function useOverlayFocus({
  initialFocusRef,
  onClose,
  open,
  panelRef,
}: {
  initialFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  open: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    if (!open || !panelRef.current) {
      return;
    }

    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      initialFocusRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const elements = Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelector),
      );

      if (elements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [initialFocusRef, onClose, open, panelRef]);
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

function LoadingAttendance() {
  return (
    <div
      aria-label="Cargando asistencia"
      aria-live="polite"
      className="mt-6 space-y-3"
      role="status"
    >
      <span className="sr-only">Cargando asistencia</span>
      {["one", "two", "three"].map((key) => (
        <div
          className="animate-pulse rounded-md border border-border bg-surface p-5"
          key={key}
        >
          <div className="h-4 w-48 rounded-sm bg-surface-subtle" />
          <div className="mt-3 h-4 w-72 rounded-sm bg-surface-subtle" />
          <div className="mt-4 h-10 w-full rounded-sm bg-surface-subtle" />
        </div>
      ))}
    </div>
  );
}

function DialogShell({
  children,
  closeButtonRef,
  description,
  onClose,
  panelRef,
  title,
  titleId,
}: {
  children: ReactNode;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  description: string;
  onClose: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  title: string;
  titleId: string;
}) {
  return (
    <div
      aria-label={`Cerrar ${title}`}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-brand-navy/30 sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby={`${titleId}-description`}
        aria-labelledby={titleId}
        aria-modal="true"
        className="flex h-full max-h-[100svh] w-full flex-col border-border bg-surface shadow-2xl sm:h-auto sm:max-h-[calc(100svh-3rem)] sm:max-w-[42rem] sm:rounded-md sm:border"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Asistencia
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground" id={titleId}>
              {title}
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-foreground-secondary"
              id={`${titleId}-description`}
            >
              {description}
            </p>
          </div>
          <button
            aria-label={`Cerrar ${title}`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogError({
  action,
  children,
}: {
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      aria-live="assertive"
      className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-surface/60 p-4"
      role="alert"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      <div className="min-w-0 text-sm leading-6 text-foreground">
        <p>{children}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

function AttendanceDebitDialog({
  categories,
  categoriesLoading,
  categoryError,
  entry,
  onClose,
  onRetryCategories,
  onSubmit,
}: {
  categories: SafeHourCategory[];
  categoriesLoading: boolean;
  categoryError: string | null;
  entry: SafeAttendanceOccurrence;
  onClose: () => void;
  onRetryCategories: () => void;
  onSubmit: (values: DebitFormValues) => Promise<void>;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const debitCategories = useMemo(
    () => categories.filter((category) => category.activityKind === null),
    [categories],
  );
  const [categoryId, setCategoryId] = useState("");
  const [debitMinutes, setDebitMinutes] = useState(
    String(entry.attendance.proposedDebitMinutes ?? occurrenceDuration(entry)),
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useOverlayFocus({
    initialFocusRef: closeButtonRef,
    onClose,
    open: true,
    panelRef,
  });

  /* eslint-disable react-hooks/set-state-in-effect -- reset the dialog form when the selected occurrence changes. */
  useEffect(() => {
    setDebitMinutes(
      String(entry.attendance.proposedDebitMinutes ?? occurrenceDuration(entry)),
    );
    setNote("");
    setError(null);
  }, [entry]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- reconcile the selected category with async category data. */
  useEffect(() => {
    if (!debitCategories.some((category) => category.id === categoryId)) {
      setCategoryId(debitCategories[0]?.id ?? "");
    }
  }, [categoryId, debitCategories]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedMinutes = Number(debitMinutes);
    const maxMinutes = occurrenceDuration(entry);

    if (!categoryId) {
      setError("Seleccionar una categoría activa para confirmar el débito.");
      return;
    }

    if (
      !Number.isInteger(parsedMinutes) ||
      parsedMinutes < 1 ||
      parsedMinutes > maxMinutes
    ) {
      setError(`Ingresar entre 1 y ${maxMinutes} minutos para esta ocurrencia.`);
      return;
    }

    setSaving(true);

    try {
      await onSubmit({
        categoryId,
        debitMinutes: parsedMinutes,
        note: note.trim() || null,
      });
    } catch (submitError) {
      setError(getAttendanceErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell
      closeButtonRef={closeButtonRef}
      description={`Tutor: ${entry.tutor.formalName}. La falta conserva la asistencia registrada y este débito sólo afectará el balance después de confirmar.`}
      onClose={onClose}
      panelRef={panelRef}
      title="Confirmar débito por inasistencia"
      titleId="attendance-debit-title"
    >
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {error && <DialogError>{error}</DialogError>}

          <section className="rounded-md border border-info/30 bg-info-surface/60 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-info">
              Resumen de la ocurrencia
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {formatDate(entry.occurrence.occurrenceDate)} · {formatMinutes(entry.occurrence.startMinutes)} a {formatMinutes(entry.occurrence.endMinutes)}
            </p>
            <p className="mt-1 text-sm leading-6 text-foreground-secondary">
              Duración propuesta: {formatDuration(occurrenceDuration(entry))}. El balance no cambia hasta confirmar.
            </p>
          </section>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground" htmlFor="attendance-debit-category">
              Categoría de horas
            </label>
            <select
              className={selectClassName}
              disabled={saving || categoriesLoading || debitCategories.length === 0}
              id="attendance-debit-category"
              onChange={(event) => setCategoryId(event.target.value)}
              value={categoryId}
            >
              {debitCategories.length === 0 && (
                <option value="">No hay categorías de débito activas</option>
              )}
              {debitCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categoriesLoading && (
              <p className="text-xs text-foreground-muted">Cargando categorías activas…</p>
            )}
          </div>

          {categoryError && (
            <DialogError
              action={
                <Button onClick={onRetryCategories} size="sm" type="button" variant="outline">
                  Reintentar categorías
                </Button>
              }
            >
              {categoryError}
            </DialogError>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground" htmlFor="attendance-debit-minutes">
              Minutos a debitar
            </label>
            <Input
              disabled={saving}
              id="attendance-debit-minutes"
              max={occurrenceDuration(entry)}
              min={1}
              onChange={(event) => setDebitMinutes(event.target.value)}
              type="number"
              value={debitMinutes}
            />
            <p className="text-xs leading-5 text-foreground-muted">
              Se puede ajustar sin superar la duración programada de la ocurrencia.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground" htmlFor="attendance-debit-note">
              Nota
            </label>
            <textarea
              className={textareaClassName}
              disabled={saving}
              id="attendance-debit-note"
              onChange={(event) => setNote(event.target.value)}
              value={note}
            />
          </div>
        </div>

        <div className="border-t border-border bg-surface px-6 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button disabled={saving} onClick={onClose} type="button" variant="outline">
              Cancelar
            </Button>
            <Button disabled={saving || categoriesLoading || debitCategories.length === 0} type="submit">
              <Check aria-hidden="true" />
              {saving ? "Confirmando…" : "Confirmar débito"}
            </Button>
          </div>
        </div>
      </form>
    </DialogShell>
  );
}

function AttendanceCorrectionDialog({
  entry,
  onClose,
  onSubmit,
}: {
  entry: SafeAttendanceOccurrence;
  onClose: () => void;
  onSubmit: (values: CorrectionFormValues) => Promise<void>;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<CorrectionFormValues["status"]>(
    entry.attendance.status === "PRESENT" ? "ABSENT" : "PRESENT",
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useOverlayFocus({
    initialFocusRef: closeButtonRef,
    onClose,
    open: true,
    panelRef,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSubmit({ status, note: note.trim() || null });
    } catch (submitError) {
      setError(getAttendanceErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell
      closeButtonRef={closeButtonRef}
      description={
        entry.attendance.debitStatus === "CONFIRMED"
          ? "El movimiento vinculado se conservará visible y se revertirá mediante la ruta contable trazable."
          : "La corrección modifica el hecho de asistencia; cualquier débito posterior requiere una confirmación explícita."
      }
      onClose={onClose}
      panelRef={panelRef}
      title="Corregir asistencia"
      titleId="attendance-correction-title"
    >
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {error && <DialogError>{error}</DialogError>}
          <section className="rounded-md border border-border-subtle bg-surface-subtle/60 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground-muted">
              Registro seleccionado
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">{entry.tutor.formalName}</p>
            <p className="mt-1 text-sm leading-6 text-foreground-secondary">
              {formatDate(entry.occurrence.occurrenceDate)} · {formatMinutes(entry.occurrence.startMinutes)} a {formatMinutes(entry.occurrence.endMinutes)} · Estado actual: {attendanceStatusLabels[entry.attendance.status]}.
            </p>
          </section>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground" htmlFor="attendance-correction-status">
              Estado corregido
            </label>
            <select
              className={selectClassName}
              disabled={saving}
              id="attendance-correction-status"
              onChange={(event) => setStatus(event.target.value as CorrectionFormValues["status"])}
              value={status}
            >
              <option value="PRESENT">Presente</option>
              <option value="ABSENT">Falta</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground" htmlFor="attendance-correction-note">
              Nota de corrección
            </label>
            <textarea
              className={textareaClassName}
              disabled={saving}
              id="attendance-correction-note"
              onChange={(event) => setNote(event.target.value)}
              value={note}
            />
          </div>
        </div>

        <div className="border-t border-border bg-surface px-6 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button disabled={saving} onClick={onClose} type="button" variant="outline">
              Cancelar
            </Button>
            <Button disabled={saving} type="submit">
              <Check aria-hidden="true" />
              {saving ? "Guardando…" : "Guardar corrección"}
            </Button>
          </div>
        </div>
      </form>
    </DialogShell>
  );
}

function RecoveryDialog({
  categories,
  categoriesLoading,
  categoryError,
  entry,
  onClose,
  onRetryCategories,
  onSubmit,
}: {
  categories: SafeHourCategory[];
  categoriesLoading: boolean;
  categoryError: string | null;
  entry: SafeAttendanceOccurrence;
  onClose: () => void;
  onRetryCategories: () => void;
  onSubmit: (values: RecoveryFormValues) => Promise<void>;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const recoveryCategories = useMemo(
    () => categories.filter((category) => category.activityKind === "RECOVERY"),
    [categories],
  );
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useOverlayFocus({
    initialFocusRef: closeButtonRef,
    onClose,
    open: true,
    panelRef,
  });

  /* eslint-disable react-hooks/set-state-in-effect -- reconcile the selected category with async category data. */
  useEffect(() => {
    if (!recoveryCategories.some((category) => category.id === categoryId)) {
      setCategoryId(recoveryCategories[0]?.id ?? "");
    }
  }, [categoryId, recoveryCategories]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!categoryId) {
      setError("Seleccionar una categoría activa de recuperación.");
      return;
    }

    setSaving(true);

    try {
      await onSubmit({ categoryId, note: note.trim() || null });
    } catch (submitError) {
      setError(getAttendanceErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell
      closeButtonRef={closeButtonRef}
      description={`Reconocer explícitamente la recuperación de ${entry.tutor.formalName} por ${formatDuration(occurrenceDuration(entry))}. Esta acción crea un crédito trazable.`}
      onClose={onClose}
      panelRef={panelRef}
      title="Reconocer recuperación"
      titleId="attendance-recovery-title"
    >
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {error && <DialogError>{error}</DialogError>}

          <section className="rounded-md border border-warning/30 bg-warning-surface/60 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-warning">
              Fuente programada
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">Recuperación · {entry.tutor.formalName}</p>
            <p className="mt-1 text-sm leading-6 text-foreground-secondary">
              {formatDate(entry.occurrence.occurrenceDate)} · {formatMinutes(entry.occurrence.startMinutes)} a {formatMinutes(entry.occurrence.endMinutes)}
            </p>
          </section>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground" htmlFor="attendance-recovery-category">
              Categoría de recuperación
            </label>
            <select
              className={selectClassName}
              disabled={saving || categoriesLoading || recoveryCategories.length === 0}
              id="attendance-recovery-category"
              onChange={(event) => setCategoryId(event.target.value)}
              value={categoryId}
            >
              {recoveryCategories.length === 0 && (
                <option value="">No hay categorías de recuperación activas</option>
              )}
              {recoveryCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categoriesLoading && (
              <p className="text-xs text-foreground-muted">Cargando categorías activas…</p>
            )}
          </div>

          {categoryError && (
            <DialogError
              action={
                <Button onClick={onRetryCategories} size="sm" type="button" variant="outline">
                  Reintentar categorías
                </Button>
              }
            >
              {categoryError}
            </DialogError>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground" htmlFor="attendance-recovery-note">
              Nota
            </label>
            <textarea
              className={textareaClassName}
              disabled={saving}
              id="attendance-recovery-note"
              onChange={(event) => setNote(event.target.value)}
              value={note}
            />
          </div>
        </div>

        <div className="border-t border-border bg-surface px-6 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button disabled={saving} onClick={onClose} type="button" variant="outline">
              Cancelar
            </Button>
            <Button disabled={saving || categoriesLoading || recoveryCategories.length === 0} type="submit">
              <Check aria-hidden="true" />
              {saving ? "Reconociendo…" : "Reconocer recuperación"}
            </Button>
          </div>
        </div>
      </form>
    </DialogShell>
  );
}

function AttendanceRow({
  busy,
  entry,
  onCancelDebit,
  onConfirmDebit,
  onCorrect,
  onMarkAbsent,
  onMarkPresent,
  onRecognizeRecovery,
  onReopenDebit,
  recoveryOrigin,
}: {
  busy: boolean;
  entry: SafeAttendanceOccurrence;
  onCancelDebit: (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => void;
  onConfirmDebit: (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => void;
  onCorrect: (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => void;
  onMarkAbsent: (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => void;
  onMarkPresent: (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => void;
  onRecognizeRecovery: (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => void;
  onReopenDebit: (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => void;
  recoveryOrigin?: RecoveryOrigin;
}) {
  const { attendance, occurrence, tutor } = entry;
  const duration = occurrenceDuration(entry);

  return (
    <article
      className="rounded-md border border-border bg-surface p-4 shadow-xs sm:p-5"
      data-attendance-occurrence-id={occurrence.id}
      role="listitem"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{tutor.formalName}</h3>
            <StatusBadge
              label={attendanceStatusLabels[attendance.status]}
              variant={attendanceStatusVariant(attendance.status)}
            />
            <StatusBadge
              label={debitStatusLabels[attendance.debitStatus]}
              variant={debitStatusVariant(attendance.debitStatus)}
            />
          </div>
          <p className="mt-1 text-sm text-foreground-secondary">{tutor.careerName}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-foreground-secondary">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              {formatDate(occurrence.occurrenceDate)}
            </span>
            <span className="inline-flex items-center gap-1.5 font-numeric tabular-nums">
              <Clock3 aria-hidden="true" className="h-4 w-4" />
              {formatMinutes(occurrence.startMinutes)} a {formatMinutes(occurrence.endMinutes)} · {formatDuration(duration)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound aria-hidden="true" className="h-4 w-4" />
              {occurrence.kind === "RECOVERY" ? "Recuperación" : "Guardia"}
            </span>
            {occurrence.modality && <span>{occurrence.modality}</span>}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end xl:max-w-[34rem]">
          {attendance.status === "PENDING" && (
            <>
              <Button
                aria-label={`Presente para ${tutor.formalName}`}
                disabled={busy}
                onClick={(event) => onMarkPresent(entry, event.currentTarget)}
                type="button"
                variant="outline"
              >
                Presente
              </Button>
              <Button
                aria-label={`Falta para ${tutor.formalName}`}
                disabled={busy}
                onClick={(event) => onMarkAbsent(entry, event.currentTarget)}
                type="button"
                variant="outline"
              >
                Falta
              </Button>
            </>
          )}

          {attendance.status !== "PENDING" && (
            <Button
              aria-label={`Corregir asistencia de ${tutor.formalName}`}
              disabled={busy}
              onClick={(event) => onCorrect(entry, event.currentTarget)}
              type="button"
              variant="outline"
            >
              Corregir asistencia
            </Button>
          )}

          {attendance.status === "ABSENT" && attendance.debitStatus === "PROPOSED" && (
            <>
              <Button
                aria-label={`Confirmar débito por inasistencia para ${tutor.formalName}`}
                disabled={busy}
                onClick={(event) => onConfirmDebit(entry, event.currentTarget)}
                type="button"
              >
                Confirmar débito
              </Button>
              <Button
                aria-label={`Cancelar débito por inasistencia para ${tutor.formalName}`}
                disabled={busy}
                onClick={(event) => onCancelDebit(entry, event.currentTarget)}
                type="button"
                variant="ghost"
              >
                Cancelar débito
              </Button>
            </>
          )}

          {attendance.status === "ABSENT" && attendance.debitStatus === "CANCELLED" && (
            <>
              <Button
                aria-label={`Reabrir débito por inasistencia para ${tutor.formalName}`}
                disabled={busy}
                onClick={(event) => onReopenDebit(entry, event.currentTarget)}
                type="button"
                variant="outline"
              >
                Reabrir débito
              </Button>
              <Button
                aria-label={`Confirmar débito por inasistencia para ${tutor.formalName}`}
                disabled={busy}
                onClick={(event) => onConfirmDebit(entry, event.currentTarget)}
                type="button"
              >
                Confirmar débito
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-foreground-secondary">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p>
            {attendance.debitStatus === "CONFIRMED"
              ? `Movimiento de débito vinculado por ${formatDuration(attendance.recognizedDebitMinutes ?? attendance.proposedDebitMinutes ?? duration)}. La corrección conserva el original y registra la reversión.`
              : attendance.debitStatus === "CANCELLED"
                ? "Falta registrada sin débito. El débito puede confirmarse más adelante."
                : attendance.debitStatus === "PROPOSED"
                  ? `Débito propuesto por ${formatDuration(attendance.proposedDebitMinutes ?? duration)}. Requiere confirmación explícita.`
                  : "Presente no modifica el balance de horas."
            }
          </p>
        </div>

        {occurrence.recovery.markedForRecovery && (
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {recoveryOrigin ? (
              <p className="text-sm font-semibold text-success">
                Recuperación reconocida · {recoveryOrigin.categoryName} · origen {recoveryOrigin.movementId.slice(0, 8)}
              </p>
            ) : (
              <Button
                aria-label={`Reconocer recuperación de ${tutor.formalName}`}
                disabled={busy}
                onClick={(event) => onRecognizeRecovery(entry, event.currentTarget)}
                type="button"
                variant="outline"
              >
                Reconocer recuperación
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function recoveryOriginFromMovement(movement: SafeHourMovement): RecoveryOrigin {
  return {
    categoryName: movement.category.name,
    movementId: movement.id,
  };
}

export function AttendanceScreen({
  data: initialData,
  initialErrorMessage,
  state = "default",
}: AttendanceScreenProps) {
  const [workspace, setWorkspace] = useState(initialData);
  const [viewState, setViewState] = useState<AttendanceScreenState>(state);
  const [selectedDate, setSelectedDate] = useState(initialData?.date ?? "");
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage ?? "");
  const [busyOccurrenceId, setBusyOccurrenceId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [categories, setCategories] = useState<SafeHourCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [recoveryOrigins, setRecoveryOrigins] = useState<Record<string, RecoveryOrigin>>({});
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const dialogOccurrenceIdRef = useRef<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- rehydrate client state after server navigation changes the initial data. */
  useEffect(() => {
    setWorkspace(initialData);
    setViewState(state);
    setSelectedDate(initialData?.date ?? "");
    setAnnouncement(null);
    setErrorMessage(initialErrorMessage ?? "");
    setDialog(null);
    setRecoveryOrigins({});
  }, [initialData, initialErrorMessage, state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedDialogEntry = useMemo(() => {
    if (dialog === null) {
      return null;
    }

    return (
      workspace?.occurrences.find(
        (entry) => entry.occurrence.id === dialog.entry.occurrence.id,
      ) ?? dialog.entry
    );
  }, [dialog, workspace]);

  const restoreDialogFocus = useCallback(() => {
    const trigger = dialogTriggerRef.current;

    if (trigger?.isConnected) {
      trigger.focus();
      return;
    }

    const occurrenceId = dialogOccurrenceIdRef.current;

    if (occurrenceId) {
      document
        .querySelector<HTMLElement>(
          `[data-attendance-occurrence-id="${occurrenceId}"] button:not([disabled])`,
        )
        ?.focus();
    }
  }, []);

  const closeDialog = useCallback(() => {
    setDialog(null);
    window.requestAnimationFrame(() => {
      restoreDialogFocus();
      dialogTriggerRef.current = null;
      dialogOccurrenceIdRef.current = null;
    });
  }, [restoreDialogFocus]);

  const openDialog = useCallback(
    (nextDialog: Exclude<DialogState, null>, trigger: HTMLElement) => {
      dialogTriggerRef.current = trigger;
      dialogOccurrenceIdRef.current = nextDialog.entry.occurrence.id;
      setDialog(nextDialog);
      setCategoryError(null);
    },
    [],
  );

  const loadCategories = useCallback(
    async (force = false) => {
      if (!force && categories.length > 0) {
        return categories;
      }

      setCategoriesLoading(true);
      setCategoryError(null);

      try {
        const response = await requestJson<{ categories: SafeHourCategory[] }>(
          "/api/admin/settings/hour-categories?status=active",
        );
        const activeCategories = response.categories.filter(
          (category) => category.status === "ACTIVE",
        );
        setCategories(activeCategories);
        return activeCategories;
      } catch (error) {
        const message = getAttendanceErrorMessage(error);
        setCategoryError(message);
        throw error;
      } finally {
        setCategoriesLoading(false);
      }
    },
    [categories],
  );

  const mergeAttendance = useCallback((entry: SafeAttendanceOccurrence) => {
    setWorkspace((previous) => {
      if (previous === null) {
        return previous;
      }

      return {
        ...previous,
        occurrences: previous.occurrences.map((candidate) =>
          candidate.occurrence.id === entry.occurrence.id ? entry : candidate,
        ),
      };
    });
  }, []);

  const mutateAttendance = useCallback(
    async (
      occurrenceId: string,
      body: Record<string, unknown>,
      successMessage: string,
    ): Promise<AttendanceMutationResponse> => {
      setBusyOccurrenceId(occurrenceId);
      setErrorMessage("");
      setAnnouncement(null);

      try {
        const response = await requestJson<AttendanceMutationResponse>(
          `/api/admin/schedules/attendance/${occurrenceId}`,
          {
            body: JSON.stringify(body),
            method: "POST",
          },
        );
        mergeAttendance(response.attendance);
        setViewState("success");
        setAnnouncement(successMessage);
        return response;
      } catch (error) {
        setErrorMessage(getAttendanceErrorMessage(error));
        setViewState(workspace === null ? "error" : deriveState(workspace));
        throw error;
      } finally {
        setBusyOccurrenceId(null);
      }
    },
    [mergeAttendance, workspace],
  );

  const loadDate = useCallback(
    async (date: string) => {
      if (workspace === null) {
        return;
      }

      setViewState("loading");
      setErrorMessage("");
      setAnnouncement(null);

      try {
        const params = new URLSearchParams({
          cycleId: workspace.cycle.id,
          date,
        });
        const nextData = await requestJson<SafeAttendanceDateResult>(
          `/api/admin/schedules/attendance?${params.toString()}`,
        );
        setWorkspace(nextData);
        setSelectedDate(nextData.date);
        setViewState(deriveState(nextData));
      } catch (error) {
        setErrorMessage(getAttendanceErrorMessage(error));
        setViewState("error");
        throw error;
      }
    },
    [workspace],
  );

  const handleDateChange = useCallback(
    (date: string) => {
      if (!date || workspace === null || date === selectedDate || busyOccurrenceId !== null) {
        return;
      }

      setSelectedDate(date);
      setDialog(null);
      void loadDate(date).catch(() => undefined);
    },
    [busyOccurrenceId, loadDate, selectedDate, workspace],
  );

  const handlePresent = useCallback(
    async (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => {
      dialogTriggerRef.current = trigger;
      dialogOccurrenceIdRef.current = entry.occurrence.id;

      try {
        await mutateAttendance(
          entry.occurrence.id,
          { operation: "PRESENT" },
          "La asistencia se registró como Presente.",
        );
      } catch {
        // The row keeps its previous context and the inline error explains recovery.
      }
    },
    [mutateAttendance],
  );

  const handleAbsent = useCallback(
    async (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => {
      dialogTriggerRef.current = trigger;
      dialogOccurrenceIdRef.current = entry.occurrence.id;

      try {
        const response = await mutateAttendance(
          entry.occurrence.id,
          { operation: "ABSENT" },
          "La falta se registró. Confirmar o cancelar el débito propuesto.",
        );
        openDialog(
          { entry: response.attendance, kind: "debit" },
          trigger,
        );
        void loadCategories().catch(() => undefined);
      } catch {
        // The row keeps its previous context and the inline error explains recovery.
      }
    },
    [loadCategories, mutateAttendance, openDialog],
  );

  const handleConfirmDebit = useCallback(
    (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => {
      openDialog({ entry, kind: "debit" }, trigger);
      void loadCategories().catch(() => undefined);
    },
    [loadCategories, openDialog],
  );

  const handleCancelDebit = useCallback(
    async (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => {
      dialogTriggerRef.current = trigger;
      dialogOccurrenceIdRef.current = entry.occurrence.id;

      try {
        await mutateAttendance(
          entry.occurrence.id,
          { operation: "CANCEL_DEBIT" },
          "La falta permanece registrada y el débito quedó cancelado.",
        );
      } catch {
        // The row keeps its previous context and the inline error explains recovery.
      }
    },
    [mutateAttendance],
  );

  const handleReopenDebit = useCallback(
    async (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => {
      dialogTriggerRef.current = trigger;
      dialogOccurrenceIdRef.current = entry.occurrence.id;

      try {
        const response = await mutateAttendance(
          entry.occurrence.id,
          { operation: "REOPEN_DEBIT" },
          "La propuesta de débito se reabrió para revisión.",
        );
        openDialog({ entry: response.attendance, kind: "debit" }, trigger);
        void loadCategories().catch(() => undefined);
      } catch {
        // The row keeps its previous context and the inline error explains recovery.
      }
    },
    [loadCategories, mutateAttendance, openDialog],
  );

  const handleCorrect = useCallback(
    (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => {
      openDialog({ entry, kind: "correction" }, trigger);
    },
    [openDialog],
  );

  const handleRecognizeRecovery = useCallback(
    (entry: SafeAttendanceOccurrence, trigger: HTMLElement) => {
      openDialog({ entry, kind: "recovery" }, trigger);
      void loadCategories().catch(() => undefined);
    },
    [loadCategories, openDialog],
  );

  const handleDebitSubmit = useCallback(
    async (values: DebitFormValues) => {
      if (selectedDialogEntry === null) {
        return;
      }

      await mutateAttendance(
        selectedDialogEntry.occurrence.id,
        {
          categoryId: values.categoryId,
          debitMinutes: values.debitMinutes,
          note: values.note,
          operation: "CONFIRM_DEBIT",
        },
        "El débito se confirmó y quedó vinculado a la asistencia.",
      );
      closeDialog();
    },
    [closeDialog, mutateAttendance, selectedDialogEntry],
  );

  const handleCorrectionSubmit = useCallback(
    async (values: CorrectionFormValues) => {
      if (selectedDialogEntry === null) {
        return;
      }

      await mutateAttendance(
        selectedDialogEntry.occurrence.id,
        {
          note: values.note,
          operation: "CORRECT",
          status: values.status,
        },
        "La corrección de asistencia se guardó correctamente.",
      );
      closeDialog();
    },
    [closeDialog, mutateAttendance, selectedDialogEntry],
  );

  const handleRecoverySubmit = useCallback(
    async (values: RecoveryFormValues) => {
      if (selectedDialogEntry === null) {
        return;
      }

      const response = await mutateAttendance(
        selectedDialogEntry.occurrence.id,
        {
          categoryId: values.categoryId,
          note: values.note,
          operation: "RECOGNIZE_RECOVERY",
        },
        "La recuperación se reconoció y quedó vinculada a su origen.",
      );

      if (!("reversal" in response)) {
        setRecoveryOrigins((previous) => ({
          ...previous,
          [selectedDialogEntry.occurrence.id]: recoveryOriginFromMovement(
            response.movement,
          ),
        }));
      }

      closeDialog();
    },
    [closeDialog, mutateAttendance, selectedDialogEntry],
  );

  const currentState = viewState;
  const hasWorkspace = workspace !== null;
  const errorAction = hasWorkspace ? (
    <Button
      onClick={() => void loadDate(selectedDate || workspace.date).catch(() => undefined)}
      size="sm"
      type="button"
      variant="outline"
    >
      Reintentar
    </Button>
  ) : (
    <Link
      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
      href="/admin/schedules/attendance"
    >
      Reintentar
    </Link>
  );

  return (
    <>
      <div
        aria-hidden={dialog ? true : undefined}
        data-slot="attendance-screen"
        data-state={currentState}
      >
        <PageHeader
          breadcrumbs={[{ label: "Inicio", href: "/admin" }, { label: "Asistencia" }]}
          description="Registrar asistencia y decidir débitos de forma explícita."
          title="Asistencia"
        />

        {currentState === "success" && announcement && (
          <InlineStateNotice
            description={announcement}
            icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
            title="Cambios guardados"
            tone="success"
          />
        )}

        {currentState === "error" && (
          <InlineStateNotice
            action={errorAction}
            description={errorMessage || "Reintentar para volver a consultar la asistencia."}
            icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
            title="No se pudo cargar la asistencia"
            tone="danger"
          />
        )}

        {currentState === "required-action" && (
          <InlineStateNotice
            action={
              <Link
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
                href="/admin/settings"
              >
                Configurar ciclo
              </Link>
            }
            description="Abrir un ciclo administrativo antes de cargar y registrar ocurrencias."
            icon={<Settings2 aria-hidden="true" className="h-5 w-5" />}
            title="Abrir un ciclo para gestionar asistencia"
            tone="warning"
          />
        )}

        {currentState === "loading" && <LoadingAttendance />}

        {workspace && currentState !== "loading" && currentState !== "required-action" && (
          <section aria-labelledby="attendance-context-title" className="mt-6 space-y-4">
            <div className="rounded-md border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Contexto de asistencia
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight text-foreground" id="attendance-context-title">
                      {workspace.cycle.name}
                    </h2>
                    <StatusBadge label={workspace.cycle.status === "OPEN" ? "Ciclo abierto" : "Ciclo cerrado"} variant={workspace.cycle.status === "OPEN" ? "success" : "neutral"} />
                    <StatusBadge label={workspace.plan?.name ?? "Sin plan efectivo"} variant="info" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground-secondary">
                    Fecha efectiva: {formatDate(workspace.date)}. Las decisiones de horas requieren una acción administrativa explícita.
                  </p>
                </div>
                <div className="w-full sm:max-w-xs">
                  <label className="text-sm font-bold text-foreground" htmlFor="attendance-date">
                    Fecha
                  </label>
                  <div className="relative mt-1.5">
                    <CalendarDays aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                    <Input
                      className="pl-9"
                      disabled={busyOccurrenceId !== null}
                      id="attendance-date"
                      max={workspace.cycle.endDate}
                      min={workspace.cycle.startDate}
                      onChange={(event) => handleDateChange(event.target.value)}
                      type="date"
                      value={selectedDate || workspace.date}
                    />
                  </div>
                </div>
              </div>
            </div>

            {workspace.occurrences.length === 0 ? (
              <EmptyState
                description={
                  workspace.plan === null
                    ? "La fecha seleccionada no tiene un plan efectivo ni ocurrencias para registrar."
                    : "La fecha seleccionada no tiene ocurrencias efectivas."
                }
                title={workspace.plan === null ? "No hay un horario efectivo para esta fecha" : "No hay guardias para esta fecha"}
              />
            ) : (
              <div aria-label="Ocurrencias de asistencia" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" role="list">
                {workspace.occurrences.map((entry) => (
                  <AttendanceRow
                    busy={busyOccurrenceId !== null}
                    entry={entry}
                    key={entry.occurrence.id}
                    onCancelDebit={handleCancelDebit}
                    onConfirmDebit={handleConfirmDebit}
                    onCorrect={handleCorrect}
                    onMarkAbsent={handleAbsent}
                    onMarkPresent={handlePresent}
                    onRecognizeRecovery={handleRecognizeRecovery}
                    onReopenDebit={handleReopenDebit}
                    recoveryOrigin={recoveryOrigins[entry.occurrence.id]}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {selectedDialogEntry && dialog?.kind === "debit" && (
        <AttendanceDebitDialog
          categories={categories}
          categoriesLoading={categoriesLoading}
          categoryError={categoryError}
          entry={selectedDialogEntry}
          onClose={closeDialog}
          onRetryCategories={() => void loadCategories(true).catch(() => undefined)}
          onSubmit={handleDebitSubmit}
        />
      )}

      {selectedDialogEntry && dialog?.kind === "correction" && (
        <AttendanceCorrectionDialog
          entry={selectedDialogEntry}
          onClose={closeDialog}
          onSubmit={handleCorrectionSubmit}
        />
      )}

      {selectedDialogEntry && dialog?.kind === "recovery" && (
        <RecoveryDialog
          categories={categories}
          categoriesLoading={categoriesLoading}
          categoryError={categoryError}
          entry={selectedDialogEntry}
          onClose={closeDialog}
          onRetryCategories={() => void loadCategories(true).catch(() => undefined)}
          onSubmit={handleRecoverySubmit}
        />
      )}
    </>
  );
}
