import type {
  SafeTutorCatalogOptions,
  SafeTutorListItem,
} from "./tutor-service";

export type TutorsScreenState =
  | "default"
  | "loading"
  | "empty"
  | "search-empty"
  | "error"
  | "success"
  | "required-action";

export type TutorStateFixture = {
  state: Exclude<TutorsScreenState, "default" | "success">;
  title: string;
  description: string;
  actionLabel?: string;
};

export type TutorsScreenData = {
  description: string;
  searchPlaceholder: string;
  careerFilterLabel: string;
  statusFilterLabel: string;
  rows: SafeTutorListItem[];
  emptyTitle: string;
  emptyAction: string;
};

export type TutorsCatalogOptions = SafeTutorCatalogOptions;
