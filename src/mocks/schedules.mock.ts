import type { ScreenStateFixture } from "./screen-state";

export type SchedulePlanKind = "regular" | "special";

export interface SchedulePlanView {
  id: string;
  name: string;
  kind: SchedulePlanKind;
  kindLabel: string;
  validity: string;
  isActive: boolean;
}

export interface ScheduleAssignmentView {
  id: string;
  planId: string;
  day: string;
  date: string;
  start: string;
  end: string;
  tutor: string;
  modality: string;
}

export interface SchedulesScreenData {
  description: string;
  plans: SchedulePlanView[];
  assignments: ScheduleAssignmentView[];
  weekdays: string[];
  primaryAction: string;
  secondaryAction: string;
  emptyPlanLabel: string;
}

export const schedulesScreenData = {
  description: "Planificar guardias regulares y períodos especiales.",
  plans: [
    {
      id: "plan-regular-2026-2",
      name: "Regular · 2.º cuatrimestre",
      kind: "regular",
      kindLabel: "Regular",
      validity: "03/08/2026 — 27/11/2026",
      isActive: true,
    },
    {
      id: "plan-special-exams-2026",
      name: "Especial · Mesas de examen",
      kind: "special",
      kindLabel: "Especial",
      validity: "21/09/2026 — 02/10/2026",
      isActive: false,
    },
  ],
  assignments: [
    {
      id: "assignment-regular-mon-marina",
      planId: "plan-regular-2026-2",
      day: "LUN",
      date: "2026-09-14",
      start: "08:00",
      end: "10:00",
      tutor: "Benítez, Marina",
      modality: "Presencial · Aula 204",
    },
    {
      id: "assignment-regular-tue-tomas",
      planId: "plan-regular-2026-2",
      day: "MAR",
      date: "2026-09-15",
      start: "10:00",
      end: "12:00",
      tutor: "Acosta, Tomás",
      modality: "Remota",
    },
    {
      id: "assignment-regular-wed-lucia",
      planId: "plan-regular-2026-2",
      day: "MIÉ",
      date: "2026-09-16",
      start: "14:00",
      end: "16:00",
      tutor: "Funes, Lucía",
      modality: "Presencial · Aula 108",
    },
    {
      id: "assignment-regular-thu-marina",
      planId: "plan-regular-2026-2",
      day: "JUE",
      date: "2026-09-17",
      start: "16:00",
      end: "18:00",
      tutor: "Benítez, Marina",
      modality: "Presencial · Aula 204",
    },
  ],
  weekdays: ["LUN", "MAR", "MIÉ", "JUE", "VIE"],
  primaryAction: "Agregar asignación",
  secondaryAction: "Nuevo plan",
  emptyPlanLabel: "Este horario todavía no tiene asignaciones.",
} satisfies SchedulesScreenData;

export const schedulesStateFixtures = [
  {
    state: "loading",
    title: "Cargando horarios",
    description: "Estamos preparando el plan y sus asignaciones.",
  },
  {
    state: "empty",
    title: "Este horario todavía no tiene asignaciones.",
    description: "Agregar una asignación para comenzar a organizar las guardias.",
    actionLabel: "Agregar asignación",
  },
  {
    state: "error",
    title: "No se pudo cargar el horario",
    description: "Reintentar para volver a consultar el plan seleccionado.",
    actionLabel: "Reintentar",
  },
  {
    state: "required-action",
    title: "No hay un plan de horario activo",
    description: "Crear o activar un plan para comenzar a organizar las guardias.",
    actionLabel: "Crear plan",
  },
  {
    state: "conflict",
    title: "Hay asignaciones superpuestas",
    description: "Revisar los horarios señalados antes de continuar.",
    actionLabel: "Revisar conflicto",
  },
] satisfies ScreenStateFixture[];
