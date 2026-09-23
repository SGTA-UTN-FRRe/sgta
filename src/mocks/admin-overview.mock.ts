import type { ScreenStateFixture } from "./screen-state";
import type { AdminOverviewScreenData } from "@/features/admin-overview/admin-overview-types";

export type {
  AdminOverviewScreenData,
  AttentionItem,
  AttentionTone,
  CycleSummary,
  DutyView,
} from "@/features/admin-overview/admin-overview-types";

export const adminOverviewScreenData = {
  cycle: {
    name: "2.º cuatrimestre 2026",
    period: "Agosto — Noviembre 2026",
    status: "open",
    statusLabel: "Ciclo abierto",
  },
  currentDate: "2026-09-16",
  attention: [
    {
      id: "pending-attendance",
      label: "Asistencia pendiente",
      count: 3,
      description: "Guardias de los últimos dos días esperan registro.",
      href: "/admin/schedules/attendance?date=2026-09-16",
      tone: "warning",
    },
    {
      id: "negative-balances",
      label: "Saldo negativo",
      count: 2,
      description: "Tutores que requieren seguimiento de horas.",
      href: "/admin/hours",
      tone: "danger",
    },
    {
      id: "consultations-to-review",
      label: "Consultas por revisar",
      count: 7,
      description: "Registros nuevos o con clasificación pendiente.",
      href: "/admin/consultations?status=PENDING_REVIEW",
      tone: "info",
    },
  ],
  upcomingDuties: [
    {
      id: "duty-today-1",
      date: "2026-09-16",
      dayLabel: "Hoy",
      time: "16:00 — 18:00",
      tutor: "Benítez, Marina",
      modality: "Presencial",
    },
    {
      id: "duty-tomorrow-1",
      date: "2026-09-17",
      dayLabel: "Mañana",
      time: "14:00 — 16:00",
      tutor: "Acosta, Tomás",
      modality: "Remota",
    },
    {
      id: "duty-friday-1",
      date: "2026-09-18",
      dayLabel: "Viernes",
      time: "10:00 — 12:00",
      tutor: "Funes, Lucía",
      modality: "Presencial",
    },
  ],
  emptyAttentionLabel: "No hay acciones pendientes.",
  requiredCycleAction: "Abrir un ciclo para comenzar a operar.",
} satisfies AdminOverviewScreenData;

export const adminOverviewStateFixtures = [
  {
    state: "loading",
    title: "Cargando el inicio",
    description: "Estamos preparando el ciclo y las tareas pendientes.",
  },
  {
    state: "empty",
    title: "No hay acciones pendientes.",
    description: "La operación del ciclo está al día.",
  },
  {
    state: "error",
    title: "No se pudo cargar la atención",
    description: "Reintentar para volver a consultar la información operativa.",
    actionLabel: "Reintentar",
  },
  {
    state: "degraded",
    title: "Importación de consultas con incidencias",
    description:
      "La última importación no se completó por completo. La cola local y el resto de la operación siguen disponibles.",
    actionLabel: "Revisar consultas",
  },
  {
    state: "required-action",
    title: "Abrir un ciclo para comenzar a operar.",
    description: "Es necesario contar con un ciclo abierto para ver la atención y las guardias.",
    actionLabel: "Configurar ciclo",
  },
] satisfies ScreenStateFixture[];
