import { Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TutorProfileLink } from "@/features/tutors/tutor-profile-link";
import { DataTable } from "@/shared/components/data-table";

import { BalanceStatusBadge, BalanceValue } from "./balance-status";
import type { SafeHourBalance } from "./hour-service";

export type OpenBalanceHistory = (balance: SafeHourBalance, trigger: HTMLElement) => void;

function BalanceIdentity({ balance }: { balance: SafeHourBalance }) {
  return (
    <div className="min-w-0">
      <TutorProfileLink className="font-semibold text-foreground" name={balance.tutor.formalName} />
      <p className="mt-1 text-xs font-normal text-muted-foreground">
        {balance.tutor.careerName} · {balance.cycle.name}
      </p>
    </div>
  );
}

export function BalanceList({
  balances,
  loading = false,
  onHistory,
}: {
  balances: SafeHourBalance[];
  loading?: boolean;
  onHistory: OpenBalanceHistory;
}) {
  return (
    <div className="mt-4 rounded-xl bg-card p-3 shadow-xs md:p-4">
      <DataTable
        columns={[
          {
            id: "balance",
            header: "Saldo",
            numeric: true,
            cell: (balance) => <BalanceValue balance={balance} className="text-lg" />,
          },
          {
            id: "status",
            header: "Estado",
            cell: (balance) => <BalanceStatusBadge balance={balance} />,
          },
        ]}
        getRowKey={(balance) => balance.tutor.id}
        identityColumn={{
          id: "tutor",
          header: "Tutor",
          cell: (balance) => <BalanceIdentity balance={balance} />,
        }}
        label="Saldos de horas"
        loading={loading}
        loadingLabel="Cargando saldos"
        rowActions={(balance) => (
          <Button
            aria-haspopup="dialog"
            aria-label={`Ver movimientos de ${balance.tutor.formalName}`}
            onClick={(event) => onHistory(balance, event.currentTarget)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Clock3 aria-hidden="true" />
            Ver movimientos
          </Button>
        )}
        rows={balances}
      />
    </div>
  );
}
