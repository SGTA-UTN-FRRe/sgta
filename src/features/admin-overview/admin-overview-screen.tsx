import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Clock3,
  Settings2,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  adminOverviewStateFixtures,
} from "@/mocks/admin-overview.mock";
import type {
  AdminOverviewScreenData,
  AttentionItem,
  AttentionTone,
} from "@/features/admin-overview/admin-overview-types";
import type { ScreenStateFixture } from "@/mocks/screen-state";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge, type StatusBadgeVariant } from "@/shared/components/status-badge";
import { cn } from "@/shared/utils";

export type AdminOverviewState =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "degraded"
  | "required-action";

export interface AdminOverviewScreenProps {
  data: AdminOverviewScreenData;
  state?: AdminOverviewState;
}

const dateContextFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

const attentionVariants: Record<AttentionTone, StatusBadgeVariant> = {
  danger: "danger",
  info: "info",
  warning: "warning",
};

const noticeStyles = {
  danger: {
    icon: "text-danger",
    surface: "border-danger/30 bg-danger-surface/60",
  },
  info: {
    icon: "text-info",
    surface: "border-info/30 bg-info-surface/60",
  },
  warning: {
    icon: "text-warning",
    surface: "border-warning/30 bg-warning-surface/60",
  },
} as const;

type NoticeTone = keyof typeof noticeStyles;

function getStateData(state: AdminOverviewState): ScreenStateFixture | undefined {
  if (state === "default") {
    return undefined;
  }

  return adminOverviewStateFixtures.find(
    (stateData) => stateData.state === state,
  );
}

function formatDateContext(date: string) {
  const label = dateContextFormatter.format(new Date(`${date}T00:00:00Z`));
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function formatShortDate(date: string) {
  return shortDateFormatter.format(new Date(`${date}T00:00:00Z`));
}

function CycleContext({
  data,
  isRequired,
  isLoading,
}: {
  data: AdminOverviewScreenData;
  isRequired: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <span
        aria-label="Cargando ciclo y fecha"
        className="flex flex-wrap items-center gap-2"
      >
        <span className="sr-only">Cargando ciclo y fecha</span>
        <span className="h-4 w-44 animate-pulse rounded-sm bg-surface-subtle" />
        <span className="h-4 w-32 animate-pulse rounded-sm bg-surface-subtle" />
        <span className="h-5 w-24 animate-pulse rounded-full bg-surface-subtle" />
      </span>
    );
  }

  if (isRequired) {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge label="Ciclo requerido" variant="warning" />
        <span className="text-sm text-foreground-secondary">
          No hay un ciclo abierto para operar.
        </span>
      </span>
    );
  }

  if (data.cycle === null) {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge label="Ciclo no disponible" variant="danger" />
        <span className="text-sm text-foreground-secondary">
          No se pudo consultar el ciclo administrativo vigente.
        </span>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-foreground-secondary">
      <span className="font-semibold text-foreground">{data.cycle.name}</span>
      <span aria-hidden="true" className="text-foreground-muted">
        ·
      </span>
      <span>{data.cycle.period}</span>
      <span aria-hidden="true" className="text-foreground-muted">
        ·
      </span>
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays aria-hidden="true" className="h-4 w-4" />
        <time dateTime={data.currentDate}>
          {formatDateContext(data.currentDate)}
        </time>
      </span>
      <StatusBadge
        label={data.cycle.statusLabel}
        variant={data.cycle.status === "open" ? "success" : "neutral"}
      />
    </span>
  );
}

function OverviewActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
      href={href}
    >
      {label}
      <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
    </Link>
  );
}

function OverviewNotice({
  actionHref,
  actionLabel,
  description,
  icon,
  title,
  tone,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  icon: ReactNode;
  title: string;
  tone: NoticeTone;
}) {
  const role = tone === "danger" ? "alert" : "status";
  const styles = noticeStyles[tone];

  return (
    <div
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={cn(
        "flex h-full min-h-[12rem] flex-col justify-between gap-5 rounded-md border p-5",
        styles.surface,
      )}
      role={role}
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 shrink-0", styles.icon)}>{icon}</span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-foreground-secondary">
            {description}
          </p>
        </div>
      </div>

      {actionHref && actionLabel && (
        <div>
          <OverviewActionLink href={actionHref} label={actionLabel} />
        </div>
      )}
    </div>
  );
}

function AttentionCard({
  description,
  href,
  label,
  count,
  tone,
}: AttentionItem) {
  return (
    <Link
      className="group flex min-h-[12rem] flex-col justify-between rounded-md border border-border bg-surface p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
      href={href}
    >
      <div className="flex items-start justify-between gap-4">
        <StatusBadge label={label} variant={attentionVariants[tone]} />
        <ArrowUpRight
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-foreground-muted transition-colors group-hover:text-primary"
        />
      </div>

      <div className="mt-6">
        <p className="font-numeric text-3xl font-extrabold tabular-nums text-foreground">
          {count}
        </p>
        <p className="mt-1 max-w-sm text-sm leading-6 text-foreground-secondary">
          {description}
        </p>
      </div>

      <span className="mt-5 text-sm font-semibold text-primary transition-colors group-hover:text-primary-hover">
        Ver detalle
      </span>
    </Link>
  );
}

function AttentionSkeletons() {
  return (
    <div
      aria-label="Cargando atención"
      aria-live="polite"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      role="status"
    >
      <span className="sr-only">Cargando atención</span>
      {["one", "two", "three"].map((key) => (
        <div
          className="min-h-[12rem] rounded-md border border-border-subtle bg-surface p-5"
          data-slot="admin-overview-attention-skeleton"
          key={key}
        >
          <div className="h-6 w-36 animate-pulse rounded-full bg-surface-subtle" />
          <div className="mt-8 h-9 w-12 animate-pulse rounded-sm bg-surface-subtle" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-sm bg-surface-subtle" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded-sm bg-surface-subtle" />
        </div>
      ))}
    </div>
  );
}

function AttentionSection({
  data,
  state,
}: {
  data: AdminOverviewScreenData;
  state: AdminOverviewState;
}) {
  const stateData = getStateData(state);

  return (
    <section aria-labelledby="attention-heading">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground" id="attention-heading">
            Necesita atención
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            Lo que requiere una decisión o seguimiento administrativo.
          </p>
        </div>
      </div>

      {state === "loading" && <AttentionSkeletons />}

      {state === "empty" && (
        <EmptyState
          className="min-h-[14rem]"
          description="La operación del ciclo está al día. Las nuevas tareas aparecerán aquí cuando requieran seguimiento."
        title={data.emptyAttentionLabel}
        />
      )}

      {state === "error" && stateData && (
        <OverviewNotice
          actionHref="/admin"
          actionLabel={stateData.actionLabel}
          description={stateData.description}
          icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
          title={stateData.title}
          tone="danger"
        />
      )}

      {state === "required-action" && stateData && (
        <OverviewNotice
          actionHref="/admin/settings"
          actionLabel={stateData.actionLabel}
          description={stateData.description}
          icon={<Settings2 aria-hidden="true" className="h-5 w-5" />}
          title={stateData.title}
          tone="warning"
        />
      )}

      {(state === "default" || state === "degraded") && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.attention.map((item) => (
            <AttentionCard key={item.id} {...item} />
          ))}

          {(data.attentionFailures ?? []).map((failure) => (
            <OverviewNotice
              actionHref={failure.actionHref}
              actionLabel={failure.actionLabel}
              description={failure.description}
              icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
              key={failure.id}
              title={failure.title}
              tone="danger"
            />
          ))}

          {state === "degraded" && stateData && (
            <OverviewNotice
              actionHref="/admin/consultations"
              actionLabel={stateData.actionLabel}
              description={stateData.description}
              icon={<TriangleAlert aria-hidden="true" className="h-5 w-5" />}
              title={stateData.title}
              tone="warning"
            />
          )}

          {data.attention.length === 0 &&
            (data.attentionFailures ?? []).length === 0 &&
            state === "degraded" && (
              <EmptyState
                className="min-h-[14rem]"
                description="La operación del ciclo está al día. Las nuevas tareas aparecerán aquí cuando requieran seguimiento."
                title={data.emptyAttentionLabel}
              />
            )}
        </div>
      )}
    </section>
  );
}

function DutyRow({
  date,
  dayLabel,
  modality,
  time,
  tutor,
}: AdminOverviewScreenData["upcomingDuties"][number]) {
  return (
    <li>
      <Link
        className="group grid grid-cols-[4.75rem_minmax(0,1fr)] gap-4 px-4 py-4 transition-colors hover:bg-surface-subtle focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-5"
        href={`/admin/schedules?date=${date}`}
      >
        <div>
          <p className="text-sm font-bold text-foreground">{dayLabel}</p>
          <time
            className="mt-1 block text-xs tabular-nums text-foreground-muted"
            dateTime={date}
          >
            {formatShortDate(date)}
          </time>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{tutor}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground-secondary">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span>{time}</span>
          </p>
          <p className="mt-1 truncate text-xs text-foreground-muted">
            Modalidad: {modality}
          </p>
        </div>

        <ArrowUpRight
          aria-hidden="true"
          className="hidden h-5 w-5 text-foreground-muted transition-colors group-hover:text-primary sm:block"
        />
      </Link>
    </li>
  );
}

function DutySkeletons() {
  return (
    <div
      aria-label="Cargando guardias"
      aria-live="polite"
      className="overflow-hidden rounded-md border border-border bg-surface"
      role="status"
    >
      <span className="sr-only">Cargando guardias</span>
      {["one", "two", "three"].map((key) => (
        <div
          className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-4 border-b border-border-subtle px-4 py-4 last:border-b-0 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:px-5"
          data-slot="admin-overview-duty-skeleton"
          key={key}
        >
          <div>
            <div className="h-4 w-12 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="mt-2 h-3 w-10 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
          <div>
            <div className="h-4 w-40 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        </div>
      ))}
    </div>
  );
}

function UpcomingSection({
  data,
  isLoading,
}: {
  data: AdminOverviewScreenData;
  isLoading: boolean;
}) {
  return (
    <section aria-labelledby="upcoming-heading">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground" id="upcoming-heading">
            Hoy
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            Guardias de hoy y próximamente, en orden cronológico.
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary underline-offset-4 hover:text-primary-hover hover:underline sm:self-auto"
          href="/admin/schedules"
        >
          Ver horarios
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>

      {isLoading ? (
        <DutySkeletons />
      ) : data.upcomingFailure !== undefined &&
        data.upcomingFailure !== null ? (
        <OverviewNotice
          actionHref={data.upcomingFailure.actionHref}
          actionLabel={data.upcomingFailure.actionLabel}
          description={data.upcomingFailure.description}
          icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
          title={data.upcomingFailure.title}
          tone="danger"
        />
      ) : data.upcomingDuties.length === 0 ? (
        <EmptyState
          className="min-h-[10rem]"
          description="No hay guardias programadas para los próximos días del ciclo."
          title="Sin guardias próximas"
        />
      ) : (
        <ol className="overflow-hidden rounded-md border border-border bg-surface">
          {data.upcomingDuties.map((duty) => (
            <DutyRow key={duty.id} {...duty} />
          ))}
        </ol>
      )}
    </section>
  );
}

export function AdminOverviewScreen({
  data,
  state = "default",
}: AdminOverviewScreenProps) {
  const isLoading = state === "loading";
  const isRequired = state === "required-action";

  return (
    <div data-slot="admin-overview-screen" data-state={state}>
      <PageHeader
        description={
          <CycleContext
            data={data}
            isLoading={isLoading}
            isRequired={isRequired}
          />
        }
        title="Inicio"
      />

      <div className="space-y-10 pt-8">
        <AttentionSection data={data} state={state} />
        {!isRequired && (
          <UpcomingSection data={data} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}
