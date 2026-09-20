import type {
  TutorSelfServiceHours,
  TutorSelfServiceSchedule,
  TutorSelfServiceSummary,
} from "./tutor-self-service-service";

export const tutorSelfServiceCycle = {
  endDate: "2026-11-27",
  id: "11111111-1111-4111-8111-111111111111",
  name: "Segundo cuatrimestre 2026",
  startDate: "2026-08-03",
  status: "OPEN",
} as const;

const tutorSelfServicePlan = {
  id: "22222222-2222-4222-8222-222222222222",
  kind: "REGULAR",
  name: "Regular · Segundo cuatrimestre",
  status: "ACTIVE",
  validFrom: tutorSelfServiceCycle.startDate,
  validTo: tutorSelfServiceCycle.endDate,
} as const;

const tutorSelfServiceAssignment = {
  assignmentDate: "2026-09-21",
  date: "2026-09-21",
  endMinutes: 1080,
  id: "33333333-3333-4333-8333-333333333333",
  kind: "DUTY",
  modality: "Presencial · Aula 204",
  pattern: "DATE",
  planId: tutorSelfServicePlan.id,
  startMinutes: 960,
  weekday: null,
} as const;

export const tutorSelfServiceSummaryReady: Extract<
  TutorSelfServiceSummary,
  { state: "ready" }
> = {
  balance: {
    signedBalanceMinutes: -75,
    state: "owes",
  },
  cycle: tutorSelfServiceCycle,
  membership: {
    cycleId: tutorSelfServiceCycle.id,
    scholarshipReference: {
      id: "44444444-4444-4444-8444-444444444444",
      knownRequiredHours: 120,
      notes: null,
      status: "ACTIVE",
      type: "Beca de acompañamiento",
    },
  },
  nextDuty: tutorSelfServiceAssignment,
  state: "ready",
  tutor: {
    career: {
      id: "55555555-5555-4555-8555-555555555555",
      name: "Ingeniería en Sistemas de Información",
      status: "ACTIVE",
    },
    displayName: "Marina Benítez",
    status: "ACTIVE",
    subjects: [
      {
        id: "66666666-6666-4666-8666-666666666666",
        name: "Arquitectura de Computadoras",
        status: "ACTIVE",
      },
    ],
  },
};

export const tutorSelfServiceSummaryEmpty: Extract<
  TutorSelfServiceSummary,
  { state: "ready" }
> = {
  ...tutorSelfServiceSummaryReady,
  nextDuty: null,
  tutor: {
    ...tutorSelfServiceSummaryReady.tutor,
    subjects: [],
  },
};

export const tutorSelfServiceRequiredAction = {
  reason: "CYCLE_MEMBERSHIP_REQUIRED",
  state: "required-action",
} as const;

export const tutorSelfServiceScheduleReady: Extract<
  TutorSelfServiceSchedule,
  { state: "ready" }
> = {
  cycle: tutorSelfServiceCycle,
  days: [
    {
      assignments: [tutorSelfServiceAssignment],
      date: "2026-09-21",
      plan: tutorSelfServicePlan,
      weekday: 1,
    },
    ...[
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ].map((date, index) => ({
      assignments: [],
      date,
      plan: tutorSelfServicePlan,
      weekday: index + 2,
    })),
  ],
  effectivePlan: tutorSelfServicePlan,
  nextDuty: tutorSelfServiceAssignment,
  state: "ready",
  window: {
    anchorDate: "2026-09-21",
    endDate: "2026-09-27",
    mode: "current",
    startDate: "2026-09-21",
  },
};

export const tutorSelfServiceScheduleEmpty: Extract<
  TutorSelfServiceSchedule,
  { state: "ready" }
> = {
  ...tutorSelfServiceScheduleReady,
  days: tutorSelfServiceScheduleReady.days.map((day) => ({
    ...day,
    assignments: [],
  })),
  nextDuty: null,
};

export const tutorSelfServiceHoursReady: Extract<
  TutorSelfServiceHours,
  { state: "ready" }
> = {
  balance: {
    signedBalanceMinutes: 60,
    state: "current",
  },
  cycle: tutorSelfServiceCycle,
  historyComplete: true,
  movements: [
    {
      category: {
        activityKind: "MEETING",
        id: "77777777-7777-4777-8777-777777777777",
        name: "Reunión de equipo",
        status: "ACTIVE",
      },
      createdAt: "2026-09-22T12:00:00.000Z",
      direction: "CREDIT",
      durationMinutes: 60,
      id: "88888888-8888-4888-8888-888888888888",
      movementDate: "2026-09-22",
      note: "Reunión de coordinación semanal.",
      reversalMovementId: null,
      reversalOfMovementId: null,
      reversalState: "CONFIRMED",
      signedDurationMinutes: 60,
    },
  ],
  state: "ready",
};

export const tutorSelfServiceHoursEmpty: Extract<
  TutorSelfServiceHours,
  { state: "ready" }
> = {
  ...tutorSelfServiceHoursReady,
  movements: [],
};
