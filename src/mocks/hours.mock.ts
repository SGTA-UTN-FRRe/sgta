import type { ScreenStateFixture } from "./screen-state";
import type { HoursScreenData } from "@/features/hours/hours-screen-types";

const cycle = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "2.º cuatrimestre 2026",
  startDate: "2026-08-01",
  endDate: "2026-12-31",
  status: "OPEN" as const,
};

const categoryMeeting = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Reunión de equipo",
  activityKind: "MEETING" as const,
  status: "ACTIVE" as const,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const categoryGuard = {
  ...categoryMeeting,
  id: "44444444-4444-4444-8444-444444444444",
  name: "Guardia",
  activityKind: null,
};

const categoryExtraordinary = {
  ...categoryMeeting,
  id: "55555555-5555-4555-8555-555555555555",
  name: "Actividad extraordinaria",
  activityKind: "EXTRAORDINARY" as const,
};

const categoryRecovery = {
  ...categoryMeeting,
  id: "12121212-1212-4121-8121-121212121212",
  name: "Recuperación de guardia",
  activityKind: "RECOVERY" as const,
};

const tutorMarina = {
  id: "22222222-2222-4222-8222-222222222222",
  formalName: "Benítez, Marina",
  careerName: "Ingeniería en Sistemas de Información",
  status: "ACTIVE" as const,
};

const tutorTomas = {
  ...tutorMarina,
  id: "66666666-6666-4666-8666-666666666666",
  formalName: "Acosta, Tomás",
  careerName: "Ingeniería Electromecánica",
};

const tutorLucia = {
  ...tutorMarina,
  id: "77777777-7777-4777-8777-777777777777",
  formalName: "Funes, Lucía",
  careerName: "Ingeniería Química",
};

const movementMarinaMeeting = {
  id: "88888888-8888-4888-8888-888888888888",
  tutor: tutorMarina,
  category: categoryMeeting,
  cycle,
  direction: "CREDIT" as const,
  durationMinutes: 90,
  signedDurationMinutes: 90,
  movementDate: "2026-09-15",
  note: "Coordinación de la cobertura semanal.",
  actor: { id: "99999999-9999-4999-8999-999999999999", displayName: "Administración" },
  origin: {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    kind: "MEETING" as const,
    activityDate: "2026-09-15",
    durationMinutes: 90,
    note: "Coordinación de la cobertura semanal.",
    actor: { id: "99999999-9999-4999-8999-999999999999", displayName: "Administración" },
    createdAt: "2026-09-15T12:00:00.000Z",
  },
  reversalOfMovementId: null,
  reversalMovementId: null,
  reversalState: "CONFIRMED" as const,
  createdAt: "2026-09-15T12:00:00.000Z",
};

const movementMarinaGuard = {
  ...movementMarinaMeeting,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  category: categoryGuard,
  direction: "DEBIT" as const,
  durationMinutes: 45,
  signedDurationMinutes: -45,
  movementDate: "2026-09-10",
  note: "Movimiento revertido por corrección de carga.",
  origin: null,
  reversalState: "REVERSED" as const,
  reversalMovementId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  createdAt: "2026-09-10T12:00:00.000Z",
};

const movementMarinaGuardReversal = {
  ...movementMarinaGuard,
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  direction: "CREDIT" as const,
  signedDurationMinutes: 45,
  reversalOfMovementId: movementMarinaGuard.id,
  reversalMovementId: null,
  reversalState: "REVERSAL" as const,
  createdAt: "2026-09-16T12:00:00.000Z",
};

const movementTomasGuard = {
  ...movementMarinaMeeting,
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  tutor: tutorTomas,
  category: categoryGuard,
  durationMinutes: 120,
  signedDurationMinutes: 120,
  movementDate: "2026-09-12",
  note: "Cobertura de mesa de consultas.",
  origin: null,
  createdAt: "2026-09-12T12:00:00.000Z",
};

const movementLuciaExtraordinary = {
  ...movementMarinaMeeting,
  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  tutor: tutorLucia,
  category: categoryExtraordinary,
  durationMinutes: 45,
  signedDurationMinutes: 45,
  movementDate: "2026-09-11",
  note: "Acompañamiento en actividad institucional.",
  origin: {
    ...movementMarinaMeeting.origin!,
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    kind: "EXTRAORDINARY" as const,
  },
  createdAt: "2026-09-11T12:00:00.000Z",
};

export const hoursScreenData = {
  description: "Consultar saldos y registrar movimientos trazables.",
  searchPlaceholder: "Buscar tutor",
  statusFilterLabel: "Estado",
  categoryFilterLabel: "Categoría",
  currentCycle: cycle,
  balances: [
    {
      tutor: tutorMarina,
      cycle,
      signedBalanceMinutes: 150,
      state: "current" as const,
    },
    {
      tutor: tutorTomas,
      cycle,
      signedBalanceMinutes: -90,
      state: "owes" as const,
    },
    {
      tutor: tutorLucia,
      cycle,
      signedBalanceMinutes: 45,
      state: "current" as const,
    },
  ],
  eligibleTutors: [tutorMarina, tutorTomas, tutorLucia],
  categories: [categoryMeeting, categoryGuard, categoryExtraordinary, categoryRecovery],
  history: [
    movementMarinaMeeting,
    movementMarinaGuard,
    movementMarinaGuardReversal,
    movementTomasGuard,
    movementLuciaExtraordinary,
  ],
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
