export type AttentionTone = "warning" | "danger" | "info";

export type AdminOverviewState =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "degraded"
  | "required-action";

export interface AdminOverviewStateCopy {
  state: Exclude<AdminOverviewState, "default">;
  title: string;
  description: string;
  actionLabel?: string;
}

export interface CycleSummary {
  name: string;
  period: string;
  status: "open" | "closed";
  statusLabel: string;
}

export interface AttentionItem {
  id: string;
  label: string;
  count: number;
  description: string;
  href: string;
  tone: AttentionTone;
}

export interface DutyView {
  id: string;
  date: string;
  dayLabel: string;
  time: string;
  tutor: string;
  modality: string;
}

export interface OverviewFailure {
  id: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}

export interface AdminOverviewScreenData {
  cycle: CycleSummary | null;
  currentDate: string;
  attention: AttentionItem[];
  attentionFailures?: OverviewFailure[];
  upcomingFailure?: OverviewFailure | null;
  upcomingDuties: DutyView[];
  emptyAttentionLabel: string;
  requiredCycleAction: string;
}
