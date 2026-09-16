import type { ScreenStateFixture } from "./screen-state";

export type BalanceState = "current" | "owes";
export type MovementDirection = "credit" | "debit";
export type MovementReversalState = "confirmed" | "reversed";

export interface BalanceRow {
  id: string;
  tutor: string;
  cycle: string;
  signedBalance: string;
  state: BalanceState;
  stateLabel: string;
}

export interface EligibleTutor {
  id: string;
  name: string;
  career: string;
}

export interface MovementHistoryRow {
  id: string;
  tutorId: string;
  date: string;
  category: string;
  direction: MovementDirection;
  directionLabel: string;
  duration: string;
  note: string;
  actor: string;
  reversalState: MovementReversalState;
  reversalLabel: string;
}

export interface MovementDialogData {
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
  eligibleTutors: EligibleTutor[];
}

export interface HoursScreenData {
  description: string;
  searchPlaceholder: string;
  statusFilterLabel: string;
  categoryFilterLabel: string;
  balances: BalanceRow[];
  history: MovementHistoryRow[];
  categories: string[];
  movementDialog: MovementDialogData;
}

export const hoursScreenData = {
  description: "Consultar saldos y registrar movimientos trazables.",
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
  history: [
    {
      id: "movement-marina-reunion",
      tutorId: "tutor-marina-benitez",
      date: "2026-09-15",
      category: "Reunión de equipo",
      direction: "credit",
      directionLabel: "Crédito",
      duration: "01:30",
      note: "Coordinación de la cobertura semanal.",
      actor: "Administración",
      reversalState: "confirmed",
      reversalLabel: "Confirmado",
    },
    {
      id: "movement-marina-guardia",
      tutorId: "tutor-marina-benitez",
      date: "2026-09-10",
      category: "Guardia",
      direction: "debit",
      directionLabel: "Débito",
      duration: "00:45",
      note: "Movimiento revertido por corrección de carga.",
      actor: "Administración",
      reversalState: "reversed",
      reversalLabel: "Revertido",
    },
    {
      id: "movement-tomas-guardia",
      tutorId: "tutor-tomas-acosta",
      date: "2026-09-12",
      category: "Guardia",
      direction: "credit",
      directionLabel: "Crédito",
      duration: "02:00",
      note: "Cobertura de mesa de consultas.",
      actor: "Administración",
      reversalState: "confirmed",
      reversalLabel: "Confirmado",
    },
    {
      id: "movement-lucia-extraordinary",
      tutorId: "tutor-lucia-funes",
      date: "2026-09-11",
      category: "Actividad extraordinaria",
      direction: "credit",
      directionLabel: "Crédito",
      duration: "00:45",
      note: "Acompañamiento en actividad institucional.",
      actor: "Administración",
      reversalState: "confirmed",
      reversalLabel: "Confirmado",
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
} satisfies HoursScreenData;

export const hoursStateFixtures = [
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
    description: "Probar con otro nombre o limpiar los filtros.",
    actionLabel: "Limpiar filtros",
  },
  {
    state: "error",
    title: "No se pudieron cargar las horas",
    description: "Reintentar para volver a consultar los saldos.",
    actionLabel: "Reintentar",
  },
  {
    state: "required-action",
    title: "Abrir un ciclo para consultar horas",
    description: "El balance se calcula dentro de un ciclo administrativo abierto.",
    actionLabel: "Configurar ciclo",
  },
] satisfies ScreenStateFixture[];
