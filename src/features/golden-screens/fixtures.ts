/**
 * View-only data for the Golden Screens.
 *
 * These fixtures intentionally model the props that the visual surfaces need,
 * not SGTA domain entities. They are serializable so a future Server Component
 * can pass the same shape to an interactive Client Component without changing
 * the visual contract.
 */

export type GoldenScreenId =
  | "login"
  | "admin-overview"
  | "tutors"
  | "hours"
  | "schedules";

export type GoldenScreenState =
  | "loading"
  | "empty"
  | "search-empty"
  | "error"
  | "required-action"
  | "degraded"
  | "conflict"
  | "permission-denied";

export interface GoldenStateFixture {
  state: GoldenScreenState;
  title: string;
  description: string;
  actionLabel?: string;
}

export type AttentionTone = "warning" | "danger" | "info";
export type TutorStatus = "active" | "inactive";
export type BalanceState = "current" | "owes";
export type MovementDirection = "credit" | "debit";
export type SchedulePlanKind = "regular" | "special";

export interface LoginGoldenFixture {
  productName: string;
  institutionalContext: string;
  title: string;
  supportingText: string;
  ctaLabel: string;
  recoveryText: string;
  states: {
    loadingLabel: string;
    errorTitle: string;
    errorDescription: string;
    permissionDeniedTitle: string;
    permissionDeniedDescription: string;
  };
}

export interface CycleGoldenFixture {
  name: string;
  period: string;
  status: "open" | "closed";
  statusLabel: string;
}

export interface AttentionItemGoldenFixture {
  id: string;
  label: string;
  count: number;
  description: string;
  href: string;
  tone: AttentionTone;
}

export interface DutyGoldenFixture {
  id: string;
  date: string;
  dayLabel: string;
  time: string;
  tutor: string;
  location: string;
}

export interface AdminOverviewGoldenFixture {
  cycle: CycleGoldenFixture;
  attention: AttentionItemGoldenFixture[];
  upcomingDuties: DutyGoldenFixture[];
  emptyAttentionLabel: string;
  requiredCycleAction: string;
}

export interface TutorGoldenFixture {
  id: string;
  name: string;
  career: string;
  scholarship: string;
  subjectCount: number;
  status: TutorStatus;
  statusLabel: string;
  cycleLabel: string;
}

export interface TutorsGoldenFixture {
  description: string;
  searchPlaceholder: string;
  careerFilterLabel: string;
  statusFilterLabel: string;
  rows: TutorGoldenFixture[];
  emptyTitle: string;
  emptyAction: string;
}

export interface BalanceGoldenFixture {
  id: string;
  tutor: string;
  cycle: string;
  signedBalance: string;
  state: BalanceState;
  stateLabel: string;
}

export interface EligibleTutorGoldenFixture {
  id: string;
  name: string;
  career: string;
}

export interface MovementDialogGoldenFixture {
  title: string;
  directionLabel: string;
  directionOptions: Array<{
    value: MovementDirection;
    label: string;
  }>;
  categoryLabel: string;
  durationLabel: string;
  dateLabel: string;
  noteLabel: string;
  tutorsLabel: string;
  selectAllLabel: string;
  selectedCountLabel: string;
  summary: string;
  submitLabel: string;
  eligibleTutors: EligibleTutorGoldenFixture[];
}

export interface HoursGoldenFixture {
  description: string;
  searchPlaceholder: string;
  statusFilterLabel: string;
  categoryFilterLabel: string;
  balances: BalanceGoldenFixture[];
  categories: string[];
  movementDialog: MovementDialogGoldenFixture;
}

export interface SchedulePlanGoldenFixture {
  id: string;
  name: string;
  kind: SchedulePlanKind;
  kindLabel: string;
  validity: string;
  isActive: boolean;
}

export interface ScheduleAssignmentGoldenFixture {
  id: string;
  planId: string;
  day: string;
  date: string;
  start: string;
  end: string;
  tutor: string;
  modality: string;
}

export interface SchedulesGoldenFixture {
  description: string;
  plans: SchedulePlanGoldenFixture[];
  assignments: ScheduleAssignmentGoldenFixture[];
  weekdays: string[];
  primaryAction: string;
  secondaryAction: string;
  emptyPlanLabel: string;
}

export interface GoldenScreenFixtureBundle {
  login: LoginGoldenFixture;
  adminOverview: AdminOverviewGoldenFixture;
  tutors: TutorsGoldenFixture;
  hours: HoursGoldenFixture;
  schedules: SchedulesGoldenFixture;
}

export type GoldenScreenStateFixtureBundle = Record<GoldenScreenId, GoldenStateFixture[]>;

export const goldenScreenFixtures = {
  login: {
    productName: "Sistema de Gestión de Tutorías",
    institutionalContext: "Tutorías UTN FRRe",
    title: "Sistema de Gestión de Tutorías",
    supportingText: "Acceso para usuarios habilitados de Tutorías UTN FRRe.",
    ctaLabel: "Continuar con Google",
    recoveryText: "Contactá a la administración de Tutorías si necesitás acceso.",
    states: {
      loadingLabel: "Conectando…",
      errorTitle: "No pudimos iniciar sesión",
      errorDescription: "Reintentá en unos instantes. Si el problema continúa, contactá a la administración.",
      permissionDeniedTitle: "Esta cuenta no está habilitada en SGTA",
      permissionDeniedDescription: "Contactá a la administración de Tutorías si necesitás acceso.",
    },
  },
  adminOverview: {
    cycle: {
      name: "2.º cuatrimestre 2026",
      period: "Agosto — Noviembre 2026",
      status: "open",
      statusLabel: "Ciclo abierto",
    },
    attention: [
      {
        id: "pending-attendance",
        label: "Asistencia pendiente",
        count: 3,
        description: "Guardias de los últimos dos días esperan registro.",
        href: "/admin/horarios/asistencia",
        tone: "warning",
      },
      {
        id: "negative-balances",
        label: "Saldo negativo",
        count: 2,
        description: "Tutores que requieren seguimiento de horas.",
        href: "/admin/horas?status=owes",
        tone: "danger",
      },
      {
        id: "consultations-to-review",
        label: "Consultas por revisar",
        count: 7,
        description: "Registros nuevos o con clasificación pendiente.",
        href: "/admin/consultas?status=review",
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
        location: "Aula 204 · Presencial",
      },
      {
        id: "duty-tomorrow-1",
        date: "2026-09-17",
        dayLabel: "Mañana",
        time: "14:00 — 16:00",
        tutor: "Acosta, Tomás",
        location: "Sala virtual · Remota",
      },
      {
        id: "duty-friday-1",
        date: "2026-09-18",
        dayLabel: "Viernes",
        time: "10:00 — 12:00",
        tutor: "Funes, Lucía",
        location: "Aula 108 · Presencial",
      },
    ],
    emptyAttentionLabel: "No hay acciones pendientes.",
    requiredCycleAction: "Abrí un ciclo para comenzar a operar.",
  },
  tutors: {
    description: "Gestioná perfiles, carrera, materias y estado.",
    searchPlaceholder: "Buscar tutor",
    careerFilterLabel: "Carrera",
    statusFilterLabel: "Estado",
    rows: [
      {
        id: "tutor-marina-benitez",
        name: "Benítez, Marina",
        career: "Ingeniería en Sistemas de Información",
        scholarship: "Beca UTN",
        subjectCount: 4,
        status: "active",
        statusLabel: "Activo",
        cycleLabel: "2.º cuatrimestre 2026",
      },
      {
        id: "tutor-tomas-acosta",
        name: "Acosta, Tomás",
        career: "Ingeniería Electromecánica",
        scholarship: "Beca de tutoría",
        subjectCount: 3,
        status: "active",
        statusLabel: "Activo",
        cycleLabel: "2.º cuatrimestre 2026",
      },
      {
        id: "tutor-lucia-funes",
        name: "Funes, Lucía",
        career: "Ingeniería Química",
        scholarship: "Sin referencia",
        subjectCount: 2,
        status: "active",
        statusLabel: "Activo",
        cycleLabel: "2.º cuatrimestre 2026",
      },
      {
        id: "tutor-diego-sosa",
        name: "Sosa, Diego",
        career: "Ingeniería en Sistemas de Información",
        scholarship: "Beca UTN",
        subjectCount: 0,
        status: "inactive",
        statusLabel: "Inactivo",
        cycleLabel: "Ciclo anterior",
      },
    ],
    emptyTitle: "Todavía no hay tutores",
    emptyAction: "Agregar tutor",
  },
  hours: {
    description: "Consultá saldos y registrá movimientos trazables.",
    searchPlaceholder: "Buscar tutor",
    statusFilterLabel: "Estado",
    categoryFilterLabel: "Categoría",
    balances: [
      {
        id: "balance-marina-benitez",
        tutor: "Benítez, Marina",
        cycle: "2.º cuatrimestre 2026",
        signedBalance: "+02:30",
        state: "current",
        stateLabel: "Al día",
      },
      {
        id: "balance-tomas-acosta",
        tutor: "Acosta, Tomás",
        cycle: "2.º cuatrimestre 2026",
        signedBalance: "-01:30",
        state: "owes",
        stateLabel: "Debe horas",
      },
      {
        id: "balance-lucia-funes",
        tutor: "Funes, Lucía",
        cycle: "2.º cuatrimestre 2026",
        signedBalance: "+00:45",
        state: "current",
        stateLabel: "Al día",
      },
    ],
    categories: ["Reunión de equipo", "Guardia", "Actividad extraordinaria"],
    movementDialog: {
      title: "Registrar movimiento",
      directionLabel: "Dirección",
      directionOptions: [
        { value: "credit", label: "Crédito" },
        { value: "debit", label: "Débito" },
      ],
      categoryLabel: "Categoría",
      durationLabel: "Duración",
      dateLabel: "Fecha",
      noteLabel: "Nota",
      tutorsLabel: "Tutores",
      selectAllLabel: "Seleccionar todos",
      selectedCountLabel: "3 tutores seleccionados",
      summary: "Crédito — Reunión de equipo — 01:30 — 3 tutores — 16/09/2026",
      submitLabel: "Registrar movimientos",
      eligibleTutors: [
        {
          id: "tutor-marina-benitez",
          name: "Benítez, Marina",
          career: "Ingeniería en Sistemas de Información",
        },
        {
          id: "tutor-tomas-acosta",
          name: "Acosta, Tomás",
          career: "Ingeniería Electromecánica",
        },
        {
          id: "tutor-lucia-funes",
          name: "Funes, Lucía",
          career: "Ingeniería Química",
        },
      ],
    },
  },
  schedules: {
    description: "Planificá guardias regulares y períodos especiales.",
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
  },
} satisfies GoldenScreenFixtureBundle;

/**
 * Reachable presentation states for each Golden Screen.
 *
 * These copies are deliberately separate from the populated data above so a
 * future live adapter can replace rows without changing state composition.
 */
export const goldenScreenStateFixtures = {
  login: [
    {
      state: "loading",
      title: "Conectando con Google",
      description: "Esperá un momento mientras verificamos tu acceso.",
    },
    {
      state: "error",
      title: "No pudimos iniciar sesión",
      description: "Reintentá en unos instantes para volver a intentar.",
      actionLabel: "Reintentar",
    },
    {
      state: "permission-denied",
      title: "Esta cuenta no está habilitada en SGTA",
      description: "Contactá a la administración de Tutorías si necesitás acceso.",
    },
  ],
  "admin-overview": [
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
      description: "Reintentá para volver a consultar la información operativa.",
      actionLabel: "Reintentar",
    },
    {
      state: "degraded",
      title: "Consultas temporalmente no disponibles",
      description: "La fuente de consultas no responde. El resto de la operación sigue disponible.",
      actionLabel: "Reintentar consultas",
    },
    {
      state: "required-action",
      title: "Abrí un ciclo para comenzar a operar.",
      description: "Necesitás un ciclo abierto para ver la atención y las guardias.",
      actionLabel: "Configurar ciclo",
    },
  ],
  tutors: [
    {
      state: "loading",
      title: "Cargando tutores",
      description: "Estamos preparando la lista de tutores.",
    },
    {
      state: "empty",
      title: "Todavía no hay tutores",
      description: "Agregá el primer tutor para comenzar a organizar la cobertura.",
      actionLabel: "Agregar tutor",
    },
    {
      state: "search-empty",
      title: "No encontramos tutores",
      description: "Probá con otro nombre o limpiá los filtros.",
      actionLabel: "Limpiar filtros",
    },
    {
      state: "error",
      title: "No se pudo cargar la lista",
      description: "Reintentá para volver a consultar los tutores.",
      actionLabel: "Reintentar",
    },
    {
      state: "required-action",
      title: "Abrí un ciclo para gestionar tutores",
      description: "Necesitás un ciclo abierto para incorporar tutores al período actual.",
      actionLabel: "Configurar ciclo",
    },
  ],
  hours: [
    {
      state: "loading",
      title: "Cargando saldos",
      description: "Estamos preparando los balances del ciclo actual.",
    },
    {
      state: "empty",
      title: "Todavía no hay saldos",
      description: "Los movimientos del ciclo aparecerán cuando se registren.",
      actionLabel: "Registrar movimiento",
    },
    {
      state: "search-empty",
      title: "No encontramos balances",
      description: "Probá con otro nombre o limpiá los filtros.",
      actionLabel: "Limpiar filtros",
    },
    {
      state: "error",
      title: "No se pudieron cargar las horas",
      description: "Reintentá para volver a consultar los saldos.",
      actionLabel: "Reintentar",
    },
    {
      state: "required-action",
      title: "Abrí un ciclo para consultar horas",
      description: "El balance se calcula dentro de un ciclo administrativo abierto.",
      actionLabel: "Configurar ciclo",
    },
  ],
  schedules: [
    {
      state: "loading",
      title: "Cargando horarios",
      description: "Estamos preparando el plan y sus asignaciones.",
    },
    {
      state: "empty",
      title: "Este horario todavía no tiene asignaciones.",
      description: "Agregá una asignación para comenzar a organizar las guardias.",
      actionLabel: "Agregar asignación",
    },
    {
      state: "error",
      title: "No se pudo cargar el horario",
      description: "Reintentá para volver a consultar el plan seleccionado.",
      actionLabel: "Reintentar",
    },
    {
      state: "required-action",
      title: "No hay un plan de horario activo",
      description: "Creá o activá un plan para comenzar a organizar las guardias.",
      actionLabel: "Crear plan",
    },
    {
      state: "conflict",
      title: "Hay asignaciones superpuestas",
      description: "Revisá los horarios señalados antes de continuar.",
      actionLabel: "Revisar conflicto",
    },
  ],
} satisfies GoldenScreenStateFixtureBundle;
