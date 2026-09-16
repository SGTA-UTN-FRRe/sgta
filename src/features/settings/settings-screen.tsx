"use client";

import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
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
import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { cn } from "@/shared/utils";

type SettingsState =
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

export interface SettingsScreenProps {
  currentCycle: SafeAdministrativeCycle | null;
  cycles: SafeAdministrativeCycle[];
}

const EMPTY_FORM: CycleForm = {
  name: "",
  startDate: "",
  endDate: "",
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const cycleErrorMessages: Record<string, string> = {
  unauthorized: "La sesión expiró. Volver a iniciar sesión para continuar.",
  forbidden: "No tienes permisos para administrar ciclos.",
  invalid_request: "Revisar el nombre y las fechas del ciclo.",
  invalid_date_range: "La fecha de finalización debe ser posterior o igual a la de inicio.",
  open_cycle_exists: "Ya existe un ciclo abierto. Cerrar el ciclo actual antes de crear otro.",
  cycle_not_found: "No se encontró el ciclo solicitado.",
  cycle_already_closed: "El ciclo ya está cerrado y no puede modificarse.",
  internal_server_error: "No se pudo guardar el ciclo. Intentar nuevamente.",
};

class CycleRequestError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "CycleRequestError";
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
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new CycleRequestError("internal_server_error");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new CycleRequestError(getErrorCode(body));
  }

  return body as T;
}

function getFeedbackMessage(error: unknown) {
  if (error instanceof CycleRequestError) {
    return cycleErrorMessages[error.code] ?? cycleErrorMessages.internal_server_error;
  }

  return cycleErrorMessages.internal_server_error;
}

export function SettingsScreen({
  currentCycle: initialCurrentCycle,
  cycles: initialCycles,
}: SettingsScreenProps) {
  const [currentCycle, setCurrentCycle] = useState(initialCurrentCycle);
  const [cycles, setCycles] = useState(initialCycles);
  const [form, setForm] = useState<CycleForm>(EMPTY_FORM);
  const [state, setState] = useState<SettingsState>("default");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);

  const isLoading = state === "loading";
  const screenState =
    currentCycle === null && state === "default" ? "required-action" : state;

  const updateForm = (field: keyof CycleForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("loading");
    setFeedback(null);

    try {
      const response = await requestJson<{ cycle?: SafeAdministrativeCycle }>(
        "/api/admin/cycles",
        {
          method: "POST",
          body: JSON.stringify(form),
        },
      );

      const { cycle } = response;

      if (cycle === undefined) {
        throw new CycleRequestError("internal_server_error");
      }

      setCurrentCycle(cycle);
      setCycles((previous) => [
        cycle,
        ...previous.filter((previousCycle) => previousCycle.id !== cycle.id),
      ]);
      setForm(EMPTY_FORM);
      setState("success");
      setFeedback({
        kind: "success",
        message: "El ciclo se creó correctamente.",
      });
    } catch (error) {
      setState("error");
      setFeedback({ kind: "error", message: getFeedbackMessage(error) });
    }
  };

  const handleClose = async () => {
    if (currentCycle === null) {
      return;
    }

    setState("loading");
    setFeedback(null);

    try {
      const response = await requestJson<{ cycle?: SafeAdministrativeCycle }>(
        `/api/admin/cycles/${encodeURIComponent(currentCycle.id)}/close`,
        { method: "POST" },
      );

      const { cycle } = response;

      if (cycle === undefined) {
        throw new CycleRequestError("internal_server_error");
      }

      setCurrentCycle(null);
      setCycles((previous) =>
        previous.map((previousCycle) =>
          previousCycle.id === cycle.id ? cycle : previousCycle,
        ),
      );
      setCloseConfirmationOpen(false);
      setState("success");
      setFeedback({
        kind: "success",
        message: "El ciclo se cerró correctamente. El historial se conserva.",
      });
    } catch (error) {
      setState("error");
      setFeedback({ kind: "error", message: getFeedbackMessage(error) });
    }
  };

  return (
    <div data-slot="settings-screen" data-state={screenState}>
      <PageHeader
        title="Configuración"
        description="Administrar el ciclo vigente y conservar el contexto histórico de Tutorías."
        breadcrumbs={[{ label: "Configuración" }]}
      />

      <div className="mt-6 space-y-6">
        {feedback && (
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
            <span>{feedback.message}</span>
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
                  variant={currentCycle === null ? "warning" : "success"}
                  label={currentCycle === null ? "Requiere acción" : "Ciclo abierto"}
                />
              </div>
            </CardHeader>
            <CardContent>
              {currentCycle === null ? (
                <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-surface/60 p-4 text-sm text-foreground-secondary">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  <p>
                    Todavía no hay un ciclo abierto. Crear uno para establecer
                    el contexto de las operaciones administrativas.
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
                    type="button"
                    variant="destructive"
                    disabled={isLoading}
                    onClick={() => setCloseConfirmationOpen(true)}
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
              <form className="space-y-5" onSubmit={handleCreate}>
                <div className="grid gap-5 md:grid-cols-3">
                  <label className="space-y-2 md:col-span-3">
                    <span className="text-sm font-medium text-foreground">Nombre</span>
                    <Input
                      required
                      disabled={isLoading || currentCycle !== null}
                      value={form.name}
                      onChange={(event) => updateForm("name", event.target.value)}
                      placeholder="Ciclo lectivo 2027"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Fecha de inicio</span>
                    <Input
                      required
                      type="date"
                      disabled={isLoading || currentCycle !== null}
                      value={form.startDate}
                      onChange={(event) => updateForm("startDate", event.target.value)}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Fecha de finalización</span>
                    <Input
                      required
                      type="date"
                      disabled={isLoading || currentCycle !== null}
                      value={form.endDate}
                      onChange={(event) => updateForm("endDate", event.target.value)}
                    />
                  </label>
                </div>

                {currentCycle !== null && (
                  <p className="text-sm text-foreground-secondary">
                    Cerrar el ciclo actual para crear uno nuevo.
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || currentCycle !== null}
                >
                  {isLoading ? "Guardando ciclo…" : "Crear ciclo"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

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
                      key={cycle.id}
                      className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground">{cycle.name}</p>
                        <p className="mt-1 text-sm text-foreground-secondary">
                          {formatCyclePeriod(cycle)}
                        </p>
                      </div>
                      <StatusBadge
                        variant={cycle.status === "OPEN" ? "success" : "neutral"}
                        label={cycle.status === "OPEN" ? "Abierto" : "Cerrado"}
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
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="close-cycle-title"
            aria-describedby="close-cycle-description"
            className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-dialog"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
              <div>
                <h2 id="close-cycle-title" className="text-lg font-semibold text-foreground">
                  Confirmar cierre del ciclo
                </h2>
                <p id="close-cycle-description" className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                  Se cerrará “{currentCycle.name}”. El historial permanecerá
                  disponible y el próximo ciclo comenzará con saldo de horas cero.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => setCloseConfirmationOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isLoading}
                onClick={() => void handleClose()}
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
