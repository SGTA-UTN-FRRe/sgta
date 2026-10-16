import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CareerBadge } from "@/shared/components/career-badge";
import { DataTable } from "@/shared/components/data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import type { SafeCareer } from "@/features/tutors/tutor-service";
import type { ConsultationListItem } from "./consultation-validation";
import {
  fullName,
  formatDate,
  statusLabels,
  statusVariant,
  anomalyLabel,
  classificationLabel,
  type ReviewQueueItem,
} from "./consultations-screen-utils";

export function ConsultationCareer({ name, careers }: { name: string | null | undefined; careers: SafeCareer[] }) {
  const career = careers.find((candidate) => candidate.name === name);
  return career ? <CareerBadge name={career.name} color={career.color} size="sm" /> : <>{name ?? "Carrera sin resolver"}</>;
}

export function LoadingWorkspace() {
  return (
    <div aria-label="Cargando consultas" className="mt-5 grid gap-3" role="status">
      <span className="sr-only">Cargando consultas…</span>
      {[0, 1, 2].map((item) => (
        <div aria-hidden="true" className="h-20 animate-pulse rounded-md border border-border bg-muted" key={item} />
      ))}
    </div>
  );
}

export function ReviewQueueCard({
  careers,
  item,
  onOpen,
  onToggleSelection,
  selected,
}: {
  careers: SafeCareer[];
  item: ReviewQueueItem;
  onOpen: (id: string, trigger: HTMLElement) => void;
  onToggleSelection: (id: string) => void;
  selected: boolean;
}) {
  const name = fullName(item.studentFirstName, item.studentLastName);
  const unresolved = item.anomalyFlags.filter((flag) => !item.acknowledgedAnomalies.includes(flag));

  return (
    <article className="grid gap-4 border-b border-border py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Checkbox
            aria-label={`Seleccionar consulta de ${name}`}
            checked={selected}
            onCheckedChange={() => onToggleSelection(item.stagingId)}
          />
          <h3 className="font-semibold text-foreground">{name}</h3>
          <StatusBadge label={statusLabels[item.status] ?? "Pendiente"} variant="warning" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(item.consultationDate)} · <ConsultationCareer careers={careers} name={item.career} /> · {item.tutor ?? "Tutor sin resolver"}
        </p>
        {unresolved.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-foreground">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>{unresolved.map(anomalyLabel).join(" ")}</span>
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">Clasificación: {classificationLabel(item.classification)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.suggestedSubject
            ? `Materia sugerida: ${item.suggestedSubject}`
            : "Sin sugerencia de materia"}
        </p>
      </div>
      <Button
        className="w-full sm:w-auto"
        onClick={(event) => onOpen(item.stagingId, event.currentTarget)}
        type="button"
        variant="outline"
      >
        Revisar a {name}
      </Button>
    </article>
  );
}

export function ConsultationList({ rows, careers, onOpen }: { rows: ConsultationListItem[]; careers: SafeCareer[]; onOpen: (id: string, trigger: HTMLElement) => void }) {
  return <DataTable label="Consultas registradas" rows={rows} getRowKey={(row) => row.id}
    identityColumn={{ id: "student", header: "Estudiante", cell: (row) => <div className="min-w-0"><strong>{fullName(row.studentFirstName, row.studentLastName)}</strong>{row.studentContact && <a aria-label={`Contacto de ${fullName(row.studentFirstName, row.studentLastName)}`} className="hidden break-all text-xs font-normal text-link underline-offset-4 hover:underline md:block" href={`mailto:${encodeURIComponent(row.studentContact)}`}>{row.studentContact}</a>}</div> }}
    columns={[
      { id: "date", header: "Fecha", cell: (row) => <span className="tabular-nums">{formatDate(row.consultationDate)}</span> },
      { id: "tutor", header: "Tutor", cell: (row) => row.tutor },
      { id: "career", header: "Carrera", className: "hidden xl:table-cell", compactClassName: "hidden", cell: (row) => <ConsultationCareer careers={careers} name={row.career} /> },
      { id: "topic", header: "Tema", className: "hidden xl:table-cell", compactClassName: "hidden", cell: (row) => row.rawTopic ?? "Sin tema" },
      { id: "classification", header: "Clasificación", cell: (row) => <>{classificationLabel(row.classification)}{row.subject && <span className="block text-xs text-muted-foreground">{row.subject}</span>}</> },
      { id: "status", header: "Estado", cell: (row) => <StatusBadge label={statusLabels[row.status] ?? row.status} variant={statusVariant(row.status)} /> },
    ]}
    rowActions={(row) => <Button aria-label={`Ver detalle de ${fullName(row.studentFirstName, row.studentLastName)}`} onClick={(event) => onOpen(row.stagingId, event.currentTarget)} size="sm" type="button" variant="outline">Ver detalle</Button>}
  />;
}
