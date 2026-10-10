import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, EmptyState, PageHeader, StatusBadge, SystemState, type StatusBadgeVariant } from "@/shared/components";
import { adminOverviewStateCopy } from "./admin-overview-copy";
import type { AdminOverviewScreenData, AdminOverviewState, AttentionTone, OverviewFailure } from "./admin-overview-types";

export interface AdminOverviewScreenProps {
  data: AdminOverviewScreenData;
  state?: AdminOverviewState;
}

const dateContextFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric", month: "long", timeZone: "UTC", weekday: "long", year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", timeZone: "UTC",
});
const attentionVariants: Record<AttentionTone, StatusBadgeVariant> = {
  danger: "danger", info: "info", warning: "warning",
};

function OverviewActionLink({ href, label, accessibleName }: { href: string; label: string; accessibleName?: string }) {
  return <Button asChild variant="ghost">
    <Link href={href} aria-label={accessibleName}>{label}<ArrowUpRight aria-hidden="true" /></Link>
  </Button>;
}

function CycleContext({ data, state }: { data: AdminOverviewScreenData; state: AdminOverviewState }) {
  if (state === "loading") {
    return <span aria-label="Cargando ciclo y fecha" className="flex flex-wrap items-center gap-2">
      <span className="sr-only">Cargando ciclo y fecha</span>
      <span aria-hidden="true" className="h-4 w-44 animate-pulse rounded-sm bg-muted" />
      <span aria-hidden="true" className="h-4 w-32 animate-pulse rounded-sm bg-muted" />
    </span>;
  }
  if (state === "required-action" || data.cycle === null) {
    return <span className="flex flex-wrap items-center gap-2">
      <StatusBadge label={state === "required-action" ? "Ciclo requerido" : "Ciclo no disponible"} variant={state === "required-action" ? "warning" : "danger"} />
      <span>{state === "required-action" ? "No hay un ciclo abierto para operar." : "No se pudo consultar el ciclo administrativo vigente."}</span>
    </span>;
  }
  const date = dateContextFormatter.format(new Date(`${data.currentDate}T00:00:00Z`));
  return <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
    <span className="font-semibold text-foreground">{data.cycle.name}</span>
    <span>{data.cycle.period}</span>
    <span className="inline-flex items-center gap-1.5">
      <CalendarDays aria-hidden="true" className="size-4" />
      <time dateTime={data.currentDate}>{date.charAt(0).toUpperCase() + date.slice(1)}</time>
    </span>
    <StatusBadge label={data.cycle.statusLabel} variant={data.cycle.status === "open" ? "success" : "neutral"} />
  </span>;
}

function FailureState({ failure }: { failure: OverviewFailure }) {
  return <SystemState variant="error" title={failure.title} description={failure.description}
    action={<OverviewActionLink href={failure.actionHref} label={failure.actionLabel} />} />;
}

function AttentionSection({ data, state }: AdminOverviewScreenProps & { state: AdminOverviewState }) {
  const stateData = adminOverviewStateCopy.find((item) => item.state === state);
  const empty = <EmptyState title={data.emptyAttentionLabel}
    description="La operación del ciclo está al día. Las nuevas tareas aparecerán aquí cuando requieran seguimiento." />;
  return <section aria-labelledby="attention-heading" className="space-y-4">
    <div className="space-y-1">
      <h2 id="attention-heading" className="font-display text-xl font-semibold">Necesita atención</h2>
      <p className="text-sm text-muted-foreground">Lo que requiere una decisión o seguimiento administrativo.</p>
    </div>
    {state === "loading" && <div role="status" aria-label="Cargando atención" aria-busy="true" className="grid gap-3 md:grid-cols-2">
      <span className="sr-only">Cargando atención</span>
      {["one", "two"].map((id) => <Skeleton key={id} className="h-24 w-full" />)}
    </div>}
    {state === "empty" && empty}
    {(state === "error" || state === "required-action") && stateData && <SystemState
      variant={state} title={stateData.title} description={stateData.description}
      action={stateData.actionLabel && <OverviewActionLink href={state === "error" ? "/admin" : "/admin/settings"} label={stateData.actionLabel} />} />}
    {(state === "default" || state === "degraded") && <>
      {data.attention.length > 0 && <ul aria-label="Necesita atención" className="grid gap-3 md:grid-cols-2">
        {data.attention.map((item) => <li key={item.id}>
          <Link href={item.href} className="flex h-full items-center gap-4 rounded-xl border border-border bg-card p-3 text-sm transition-colors hover:bg-muted md:p-4">
            <span className="text-2xl font-bold tabular-nums">{item.count}</span>
            <span className="min-w-0 flex-1 space-y-2">
              <StatusBadge label={item.label} variant={attentionVariants[item.tone]} />
              <span className="block text-muted-foreground">{item.description}</span>
              <span className="block font-semibold text-link">Ver detalle</span>
            </span>
            <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-link" />
          </Link>
        </li>)}
      </ul>}
      {(data.attentionFailures ?? []).map((failure) => <FailureState key={failure.id} failure={failure} />)}
      {state === "degraded" && stateData && <SystemState variant="degraded" title={stateData.title}
        description={stateData.description} action={stateData.actionLabel && <OverviewActionLink href="/admin/consultations" label={stateData.actionLabel} />} />}
      {data.attention.length === 0 && (data.attentionFailures ?? []).length === 0 && empty}
    </>}
  </section>;
}

function UpcomingSection({ data, loading }: { data: AdminOverviewScreenData; loading: boolean }) {
  return <section aria-labelledby="upcoming-heading" className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="space-y-1">
        <h2 id="upcoming-heading" className="font-display text-xl font-semibold">Hoy</h2>
        <p className="text-sm text-muted-foreground">Guardias de hoy y próximamente, en orden cronológico.</p>
      </div>
      <OverviewActionLink href="/admin/schedules" label="Ver horarios" />
    </div>
    {loading ? <div role="status" aria-label="Cargando guardias" aria-busy="true" className="space-y-2">
      <span className="sr-only">Cargando guardias</span>
      {["one", "two", "three"].map((id) => <Skeleton key={id} className="h-row w-full" />)}
    </div> : <DataTable label="Guardias próximas" rows={data.upcomingDuties} getRowKey={(duty) => duty.id}
      identityColumn={{ id: "tutor", header: "Tutor", cell: (duty) => duty.tutor }}
      columns={[
        { id: "date", header: "Día", cell: (duty) => <span className="flex flex-wrap gap-x-2"><span>{duty.dayLabel}</span><time className="tabular-nums" dateTime={duty.date}>{shortDateFormatter.format(new Date(`${duty.date}T00:00:00Z`))}</time></span> },
        { id: "time", header: "Horario", cell: (duty) => <span className="whitespace-nowrap tabular-nums">{duty.time}</span> },
        { id: "modality", header: "Modalidad", cell: (duty) => duty.modality },
      ]}
      rowActions={(duty) => <OverviewActionLink href={`/admin/schedules?date=${duty.date}`} label="Ver horarios" accessibleName={`Ver horarios de ${duty.tutor}`} />}
      error={data.upcomingFailure && <FailureState failure={data.upcomingFailure} />}
      empty={<EmptyState title="Sin guardias próximas" description="No hay guardias programadas para los próximos días del ciclo." />} />}
  </section>;
}

export function AdminOverviewScreen({ data, state = "default" }: AdminOverviewScreenProps) {
  return <div data-slot="admin-overview-screen" data-state={state} className="space-y-4 md:space-y-6">
    <PageHeader title="Inicio" description={<CycleContext data={data} state={state} />} />
    <AttentionSection data={data} state={state} />
    {state !== "required-action" && <UpcomingSection data={data} loading={state === "loading"} />}
  </div>;
}
