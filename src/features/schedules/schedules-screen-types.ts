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
