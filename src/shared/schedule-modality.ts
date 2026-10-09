export const SCHEDULE_MODALITIES = ["IN_PERSON", "VIRTUAL"] as const;

export type ScheduleModality = (typeof SCHEDULE_MODALITIES)[number];

export const SCHEDULE_MODALITY_LABELS: Record<ScheduleModality, string> = {
  IN_PERSON: "Presencial",
  VIRTUAL: "Virtual",
};

const VIRTUAL_MODALITY_PATTERN = /virtual|remot|online|en l[ií]nea|zoom|meet|distancia/i;

/** Maps legacy free-text modality to the enum: recognizable virtual values, otherwise in person. */
export function normalizeScheduleModality(value: string | null | undefined): ScheduleModality {
  return value && VIRTUAL_MODALITY_PATTERN.test(value) ? "VIRTUAL" : "IN_PERSON";
}
