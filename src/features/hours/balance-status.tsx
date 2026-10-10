import { StatusBadge, type StatusBadgeVariant } from "@/shared/components/status-badge";
import { formatDuration } from "@/shared/format-duration";
import { cn } from "@/shared/utils";

import type { SafeHourBalance } from "./hour-service";

type BalanceLike = Pick<SafeHourBalance, "signedBalanceMinutes" | "state">;

/** Zero balances read `0 min` and never use a status color. */
function balanceVariant({ signedBalanceMinutes, state }: BalanceLike): StatusBadgeVariant {
  if (signedBalanceMinutes === 0) return "neutral";
  return state === "current" ? "success" : "danger";
}

export function balanceStatusLabel(state: SafeHourBalance["state"]) {
  return state === "current" ? "Al día" : "Debe horas";
}

/** Balances are unsigned; the state label carries the meaning, per BalanceStatus. */
export function BalanceValue({ balance, className }: { balance: BalanceLike; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap font-semibold tabular-nums text-foreground", className)}>
      {formatDuration(balance.signedBalanceMinutes)}
    </span>
  );
}

export function BalanceStatusBadge({ balance }: { balance: BalanceLike }) {
  return <StatusBadge className="whitespace-nowrap" label={balanceStatusLabel(balance.state)} variant={balanceVariant(balance)} />;
}

/** BalanceStatus pattern: the duration and the state label always appear together. */
export function BalanceStatus({ balance }: { balance: BalanceLike }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <BalanceValue balance={balance} className="font-display text-2xl" />
      <BalanceStatusBadge balance={balance} />
    </div>
  );
}
