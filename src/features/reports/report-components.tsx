import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/shared/components/data-table";
import { SystemState } from "@/shared/components/system-state";
import { formatNumber } from "./report-presentation";

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function ReportTable({
  caption,
  headers,
  rows,
  emptyLabel,
}: {
  caption: string;
  headers: string[];
  rows: Array<{ key: string; cells: ReactNode[] }>;
  emptyLabel?: string;
}) {
  const columns = headers.map((header, index) => ({
    id: String(index),
    header,
    numeric: index > 0 && ["Consultas", "Ocurrencias", "Duración", "Movimientos", "Minutos"].includes(header),
    cell: (row: { key: string; cells: ReactNode[] }) => row.cells[index],
  }));
  return (
    <div aria-label={caption} role="region" tabIndex={0}
      className="min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <DataTable label={caption} rows={rows} identityColumn={columns[0]}
        columns={columns.slice(1)} getRowKey={(row) => row.key}
        empty={<SystemState variant="empty" title={emptyLabel ?? "No hay datos para los filtros seleccionados."} />}
      />
    </div>
  );
}

export function ReportCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">{children}</CardContent>
    </Card>
  );
}

export function SectionState({
  title,
  description,
  retryHref,
}: {
  title: string;
  description: string;
  retryHref: string;
}) {
  return (
    <SystemState variant="error" title={title} description={description}
      action={<Link className={buttonVariants({ variant: "outline", size: "sm" })} href={retryHref}>Reintentar</Link>}
    />
  );
}

export function CycleRequiredState({ title }: { title: string }) {
  return <SystemState variant="required-action" title={title}
    action={<Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/admin/settings">Configuración</Link>} />;
}

export function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="font-display text-xl font-bold text-foreground" id={id}>
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function InlineMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {formatNumber(value)}
      </dd>
    </div>
  );
}
