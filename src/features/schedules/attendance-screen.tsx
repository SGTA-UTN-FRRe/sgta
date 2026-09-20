import { CalendarDays, Clock3, UserRound } from "lucide-react";

import type { SafeAttendanceDateResult } from "./attendance-service";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge, type StatusBadgeVariant } from "@/shared/components/status-badge";

export type AttendanceScreenState =
  | "default"
  | "empty"
  | "error"
  | "required-action";

export interface AttendanceScreenProps {
  data: SafeAttendanceDateResult | null;
  state?: AttendanceScreenState;
}

const statusLabels = {
  ABSENT: "Falta",
  PENDING: "Pendiente",
  PRESENT: "Presente",
} as const;

const debitLabels = {
  CANCELLED: "Débito cancelado",
  CONFIRMED: "Débito confirmado",
  NOT_PROPOSED: "Sin débito",
  PROPOSED: "Débito pendiente",
} as const;

function statusVariant(status: keyof typeof statusLabels): StatusBadgeVariant {
  if (status === "PRESENT") return "success";
  if (status === "ABSENT") return "danger";
  return "neutral";
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

function statusContent(state: AttendanceScreenState) {
  switch (state) {
    case "required-action":
      return {
        title: "Abrir un ciclo para consultar asistencia",
        description:
          "Abrir un ciclo administrativo antes de cargar las ocurrencias del día.",
      };
    case "error":
      return {
        title: "No se pudo cargar la asistencia",
        description: "Reintentar para volver a consultar las ocurrencias persistidas.",
      };
    case "empty":
      return {
        title: "No hay guardias para esta fecha",
        description: "La fecha seleccionada no tiene ocurrencias efectivas.",
      };
    default:
      return null;
  }
}

export function AttendanceScreen({ data, state = "default" }: AttendanceScreenProps) {
  const detail = statusContent(state);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Inicio", href: "/admin" }, { label: "Asistencia" }]}
        title="Asistencia"
        description="Consultar las ocurrencias efectivas y su estado de asistencia."
      />

      {detail ? (
        <EmptyState title={detail.title} description={detail.description} />
      ) : data === null ? (
        <EmptyState
          title="No hay un ciclo de asistencia disponible"
          description="Abrir un ciclo administrativo para consultar ocurrencias."
        />
      ) : (
        <section aria-labelledby="attendance-context" className="space-y-4">
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground-secondary">
              <h2 id="attendance-context" className="font-semibold text-foreground">
                {data.cycle.name}
              </h2>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {formatDate(data.date)}
              </span>
              <span>{data.plan?.name ?? "Sin plan efectivo"}</span>
            </div>
          </div>

          {data.occurrences.length === 0 ? (
            <EmptyState
              title="No hay guardias para esta fecha"
              description="La fecha seleccionada no tiene ocurrencias efectivas."
            />
          ) : (
            <div className="grid gap-3" role="list" aria-label="Ocurrencias de asistencia">
              {data.occurrences.map(({ occurrence, tutor, attendance }) => (
                <article
                  key={occurrence.id}
                  className="rounded-md border border-border bg-surface p-4"
                  role="listitem"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{tutor.formalName}</h3>
                        <span className="text-sm text-foreground-secondary">{tutor.careerName}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-secondary">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                          {occurrence.kind === "RECOVERY" ? "Recuperación" : "Guardia"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-4 w-4" aria-hidden="true" />
                          {formatMinutes(occurrence.startMinutes)} a {formatMinutes(occurrence.endMinutes)}
                        </span>
                        {occurrence.modality && <span>{occurrence.modality}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        label={statusLabels[attendance.status]}
                        variant={statusVariant(attendance.status)}
                      />
                      <StatusBadge
                        label={debitLabels[attendance.debitStatus]}
                        variant={attendance.debitStatus === "CONFIRMED" ? "warning" : "neutral"}
                      />
                    </div>
                  </div>
                  {occurrence.recovery.markedForRecovery && (
                    <p className="mt-3 text-sm text-foreground-secondary">
                      Esta recuperación requiere reconocimiento explícito.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
