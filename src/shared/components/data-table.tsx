import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SystemState } from "./system-state";
import { cn } from "@/shared/utils";

export interface DataColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  numeric?: boolean;
  /** Responsive visibility for secondary comparison columns. */
  className?: string;
  compactClassName?: string;
}
export interface DataTableProps<T> {
  label: string;
  rows: readonly T[];
  identityColumn: DataColumn<T>;
  columns: readonly DataColumn<T>[];
  getRowKey: (row: T) => string;
  rowActions?: (row: T) => ReactNode;
  stickyHeader?: boolean;
  loading?: boolean;
  /** Announced name of the loading skeleton. */
  loadingLabel?: string;
  empty?: ReactNode;
  error?: ReactNode;
}

/** One row model drives both the comparison table and the Compact priority list. */
export function DataTable<T>({
  label, rows, identityColumn, columns, getRowKey, rowActions,
  stickyHeader = false, loading = false, loadingLabel = "Cargando registros", empty, error,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div role="status" aria-label={loadingLabel} aria-busy="true" className="space-y-2 py-2">
        <span className="sr-only">{loadingLabel}</span>
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-row w-full" />)}
      </div>
    );
  }
  if (error) return <>{error}</>;
  if (!rows.length) return <>{empty ?? <SystemState variant="empty" title="Sin resultados" description="No hay registros para mostrar." />}</>;
  const allColumns = [identityColumn, ...columns];
  return (
    <div data-slot="data-table">
      <div className={cn("hidden md:block", stickyHeader && "[&_[data-slot=table-container]]:max-h-96 [&_[data-slot=table-container]]:overflow-y-auto")}>
        <Table>
          <TableCaption className="sr-only">{label}</TableCaption>
          <TableHeader className={stickyHeader ? "sticky top-0 z-sticky bg-card" : undefined}>
            <TableRow className="hover:bg-transparent">
              {allColumns.map((column) => (
                <TableHead key={column.id} scope="col" className={cn("text-muted-foreground", column.numeric && "text-right tabular-nums", column.className)}>
                  {column.header}
                </TableHead>
              ))}
              {rowActions && <TableHead scope="col" className="text-right text-muted-foreground">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={getRowKey(row)} className="h-row hover:bg-transparent">
                <TableHead scope="row" className="whitespace-normal font-semibold">{identityColumn.cell(row)}</TableHead>
                {columns.map((column) => (
                  <TableCell key={column.id} className={cn("py-0 whitespace-normal", column.numeric && "text-right tabular-nums", column.className)}>
                    {column.cell(row)}
                  </TableCell>
                ))}
                {rowActions && (
                  <TableCell className="py-0">
                    <div className="flex flex-wrap items-center justify-end gap-2">{rowActions(row)}</div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul aria-label={label} className="divide-y divide-border md:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)} className="space-y-3 py-3">
            <div className="text-sm font-semibold">{identityColumn.cell(row)}</div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {columns.map((column) => (
                <div key={column.id} className={cn("min-w-0 space-y-1", column.compactClassName)}>
                  <dt className="text-xs text-muted-foreground">{column.header}</dt>
                  <dd className={cn(column.numeric && "tabular-nums")}>{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
            {rowActions && <div className="flex flex-wrap gap-2">{rowActions(row)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
