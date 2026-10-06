import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";
import { getArgentinaBusinessDate } from "@/shared/argentina-business-time";

type OperationalCycleDates = Pick<
  SafeAdministrativeCycle,
  "endDate" | "startDate"
>;

export function resolveDefaultOperationalDate(
  cycle: OperationalCycleDates,
  now?: Date,
) {
  const today = getArgentinaBusinessDate(now);

  if (today < cycle.startDate) {
    return cycle.startDate;
  }

  return today > cycle.endDate ? cycle.endDate : today;
}
