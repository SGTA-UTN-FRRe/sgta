import type { SafeTutorListItem } from "./tutor-service";

export type FilterStatus = "all" | "active" | "inactive";
export type SheetMode = "add" | "edit" | "view";
export type SheetState = {
  mode: SheetMode;
  tutor?: SafeTutorListItem;
} | null;
export type StatusRequest = {
  tutor: SafeTutorListItem;
  trigger: HTMLElement;
} | null;

export type TutorFormValues = {
  firstName: string;
  lastName: string;
  preferredDisplayName: string;
  institutionalIdentifier: string;
  applicationEmail: string;
  primaryCareerId: string;
  subjectIds: string[];
  cycleId: string;
  scholarshipReferenceId: string;
};

export type TutorFormSubmitOptions = {
  changedFields: string[];
  subjectsChanged: boolean;
  membershipChanged: boolean;
};
