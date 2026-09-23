import type {
  ConsultationFilters,
  ConsultationListItem,
  ConsultationWorkspace,
} from "./consultation-validation";
import type { SafeCareer } from "@/features/tutors/tutor-service";

export const consultationCareerId = "11111111-1111-4111-8111-111111111111";
export const consultationTutorId = "22222222-2222-4222-8222-222222222222";
export const consultationId = "33333333-3333-4333-8333-333333333333";
export const consultationStagingId = "44444444-4444-4444-8444-444444444444";

export const consultationFilters: ConsultationFilters = {
  status: "ALL",
  limit: 50,
  offset: 0,
};

export const consultationCareers: SafeCareer[] = [
  {
    id: consultationCareerId,
    name: "Ingeniería en Sistemas de Información",
    status: "ACTIVE",
  },
];

export const consultationTutors = [
  {
    id: consultationTutorId,
    name: "Marina Benítez",
    status: "ACTIVE" as const,
  },
];

export const canonicalConsultation: ConsultationListItem = {
  id: consultationId,
  stagingId: consultationStagingId,
  status: "CONSOLIDATED",
  reviewVersion: 2,
  consultationDate: "2026-09-18",
  studentFirstName: "Lucía",
  studentLastName: "Pérez",
  studentContact: "lucia@example.test",
  career: "Ingeniería en Sistemas de Información",
  tutor: "Marina Benítez",
  academicStage: "Segundo año",
  modality: "Remota",
  rawTopic: "Álgebra lineal",
  classification: "SUBJECT",
  subject: "Álgebra",
};

export function createConsultationWorkspace(
  overrides: Partial<ConsultationWorkspace> = {},
): ConsultationWorkspace {
  return {
    rows: [canonicalConsultation],
    reviewQueue: [],
    pendingReviewCount: 0,
    totalRows: 1,
    import: {
      runId: "55555555-5555-4555-8555-555555555555",
      status: "SUCCEEDED",
      startedAt: "2026-09-20T11:00:00.000Z",
      completedAt: "2026-09-20T11:00:04.000Z",
      lastSuccessfulAt: "2026-09-20T11:00:04.000Z",
      newRows: 2,
      alreadyProcessedRows: 8,
      reviewRows: 1,
      duplicateCandidates: 0,
      errorRows: 0,
      errorCode: null,
    },
    pagination: { limit: 50, offset: 0 },
    ...overrides,
  };
}
