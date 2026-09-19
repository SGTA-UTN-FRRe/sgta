import type {
  SafeHourBalance,
  SafeHourCategory,
  SafeHourCycle,
  SafeHourMovement,
  SafeHourTutor,
} from "@/features/hours/hour-service";

export type HourMovementOperation = "MOVEMENT" | "RECOVERY";

export type HoursStateDetail = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export interface HoursScreenData {
  description: string;
  searchPlaceholder: string;
  statusFilterLabel: string;
  categoryFilterLabel: string;
  currentCycle: SafeHourCycle | null;
  balances: SafeHourBalance[];
  eligibleTutors: SafeHourTutor[];
  categories: SafeHourCategory[];
  history: SafeHourMovement[];
}
