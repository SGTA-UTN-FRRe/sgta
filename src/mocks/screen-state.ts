export type ScreenState =
  | "loading"
  | "empty"
  | "search-empty"
  | "error"
  | "required-action"
  | "degraded"
  | "conflict"
  | "permission-denied";

export interface ScreenStateFixture {
  state: ScreenState;
  title: string;
  description: string;
  actionLabel?: string;
}
