import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";
import { getServerNow } from "@/config/clock";
import { getArgentinaBusinessDate } from "@/shared/argentina-business-time";

type OperationalCycleDates = Pick<
  SafeAdministrativeCycle,
  "endDate" | "startDate"
>;

export function resolveDefaultOperationalDate(
  cycle: OperationalCycleDates,
  now = getServerNow(),
) {
  const today = getArgentinaBusinessDate(now);

  if (today < cycle.startDate) {
    return cycle.startDate;
  }

  return today > cycle.endDate ? cycle.endDate : today;
}
