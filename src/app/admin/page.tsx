import type { Metadata } from "next";

import { getDatabase } from "@/db/client";
import { AdminOverviewScreen } from "@/features/admin-overview/admin-overview-screen";
import {
  getAdminOverviewCurrentDate,
  getAdminOverviewReadModel,
} from "@/features/admin-overview/admin-overview-service";
import type {
  AdminOverviewScreenData,
  AttentionItem,
  OverviewFailure,
} from "@/features/admin-overview/admin-overview-types";

export const metadata: Metadata = {
  title: "Inicio | SGTA",
  description: "Resumen operativo del ciclo administrativo vigente.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emptyScreenData = (currentDate: string): AdminOverviewScreenData => ({
  cycle: null,
  currentDate,
  attention: [],
  upcomingDuties: [],
  emptyAttentionLabel: "No hay acciones pendientes.",
  requiredCycleAction: "Abrir un ciclo para comenzar a operar.",
});

function formatCyclePeriod(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const start = formatter.format(new Date(`${startDate}T00:00:00.000Z`));
  const end = formatter.format(new Date(`${endDate}T00:00:00.000Z`));

  return start === end
    ? start
    : `${start} — ${end}`;
}

function failure(
  id: string,
  title: string,
  description: string,
  actionHref: string,
  actionLabel: string,
): OverviewFailure {
  return { id, title, description, actionHref, actionLabel };
}

export default async function AdminOverviewPage() {
  const today = getAdminOverviewCurrentDate();
  let state: "default" | "empty" | "error" | "degraded" | "required-action" =
    "default";
  let data = emptyScreenData(today);

  try {
    const model = await getAdminOverviewReadModel(getDatabase());

    if (model.cycle === null) {
      state = "required-action";
      data = { ...emptyScreenData(model.currentDate) };
    } else {
      const cycle = model.cycle;
      const attention: AttentionItem[] = [];
      const attentionFailures: OverviewFailure[] = [];

      if (model.pendingAttendance.status === "ready") {
        const pending = model.pendingAttendance.value;
        if (pending.count > 0) {
          const date = pending.firstDate ?? model.currentDate;
          attention.push({
            id: "pending-attendance",
            label: "Asistencia pendiente",
            count: pending.count,
            description: "Guardias vencidas que esperan registro de asistencia.",
            href: `/admin/schedules/attendance?cycleId=${encodeURIComponent(cycle.id)}&date=${date}`,
            tone: "warning",
          });
        }
      } else {
        attentionFailures.push(
          failure(
            "attendance-read-failed",
            "No se pudo cargar la asistencia pendiente",
            "Abrir Asistencia para volver a consultar las guardias del ciclo.",
            `/admin/schedules/attendance?cycleId=${encodeURIComponent(cycle.id)}&date=${model.currentDate}`,
            "Abrir asistencia",
          ),
        );
      }

      if (model.negativeBalances.status === "ready") {
        if (model.negativeBalances.value > 0) {
          attention.push({
            id: "negative-balances",
            label: "Saldo negativo",
            count: model.negativeBalances.value,
            description: "Tutores activos con saldo de horas menor que cero.",
            href: "/admin/hours",
            tone: "danger",
          });
        }
      } else {
        attentionFailures.push(
          failure(
            "hours-read-failed",
            "No se pudieron cargar los saldos de horas",
            "Abrir Horas para volver a consultar los saldos del ciclo.",
            "/admin/hours",
            "Abrir horas",
          ),
        );
      }

      if (model.consultationReviews.status === "ready") {
        if (model.consultationReviews.value > 0) {
          attention.push({
            id: "consultations-to-review",
            label: "Consultas por revisar",
            count: model.consultationReviews.value,
            description: "Registros locales que esperan revisión administrativa.",
            href: "/admin/consultations?status=PENDING_REVIEW",
            tone: "info",
          });
        }
      } else {
        attentionFailures.push(
          failure(
            "consultations-read-failed",
            "No se pudo cargar la cola de consultas",
            "Abrir Consultas para volver a consultar los registros locales.",
            "/admin/consultations?status=PENDING_REVIEW",
            "Abrir consultas",
          ),
        );
      }

      const sourceDegraded =
        model.consultationSource.status === "ready" &&
        model.consultationSource.value.degraded;
      if (model.consultationSource.status === "error") {
        attentionFailures.push(
          failure(
            "consultation-source-status-failed",
            "No se pudo verificar la fuente de consultas",
            "La cola local sigue disponible; el estado de la última importación no se pudo consultar.",
            "/admin/consultations",
            "Abrir consultas",
          ),
        );
      }

      const upcomingFailure =
        model.upcomingDuties.status === "error"
          ? failure(
              "upcoming-duties-read-failed",
              "No se pudieron cargar las guardias próximas",
              "Abrir Horarios para volver a consultar el cronograma vigente.",
              `/admin/schedules?cycleId=${encodeURIComponent(cycle.id)}&date=${model.currentDate}`,
              "Abrir horarios",
            )
          : null;

      data = {
        cycle: {
          name: cycle.name,
          period: formatCyclePeriod(cycle.startDate, cycle.endDate),
          status: cycle.status === "OPEN" ? "open" : "closed",
          statusLabel: cycle.status === "OPEN" ? "Ciclo abierto" : "Ciclo cerrado",
        },
        currentDate: model.currentDate,
        attention,
        attentionFailures,
        upcomingFailure,
        upcomingDuties:
          model.upcomingDuties.status === "ready"
            ? model.upcomingDuties.value
            : [],
        emptyAttentionLabel: "No hay acciones pendientes.",
        requiredCycleAction: "Abrir un ciclo para comenzar a operar.",
      };

      if (sourceDegraded) {
        state = "degraded";
      } else if (
        attention.length === 0 &&
        attentionFailures.length === 0
      ) {
        state = "empty";
      }
    }
  } catch {
    state = "error";
    data = {
      ...emptyScreenData(today),
      upcomingFailure: failure(
        "overview-load-failed",
        "No se pudo cargar el cronograma",
        "Reintentar para volver a consultar el ciclo y las guardias.",
        "/admin",
        "Reintentar",
      ),
    };
  }

  return <AdminOverviewScreen data={data} state={state} />;
}
