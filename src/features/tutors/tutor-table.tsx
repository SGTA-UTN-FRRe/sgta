import Link from "next/link";
import { useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { CareerBadge, DataTable, StatusBadge } from "@/shared/components";
import type { SafeTutorListItem } from "./tutor-service";
import type { SheetMode } from "./tutor-presentation-types";
import { cycleLabel, scholarshipLabel, stateVariants, statusLabel } from "./tutor-screen-utils";

type OpenTutorSheet = (mode: Exclude<SheetMode, "add">, tutor: SafeTutorListItem, trigger: HTMLElement) => void;
type RequestTutorStatus = (tutor: SafeTutorListItem, trigger: HTMLElement) => void;

export function ActionLink({ href, label, accessibleLabel }: { href: string; label: string; accessibleLabel?: string }) {
  return <Button asChild variant="outline"><Link href={href} aria-label={accessibleLabel}>{label}</Link></Button>;
}

function TutorIdentity({ tutor, onOpenSheet }: { tutor: SafeTutorListItem; onOpenSheet: OpenTutorSheet }) {
  return <div className="min-w-0">
    <Button type="button" variant="surface" size="content" aria-haspopup="dialog"
      onClick={(event) => onOpenSheet("view", tutor, event.currentTarget)}>
      <span className="font-semibold">{tutor.formalName}</span>
    </Button>
    {(tutor.lastName === null || tutor.institutionalIdentifier === null) &&
      <div className="mt-1"><StatusBadge label="Datos incompletos" variant="warning" /></div>}
    <p className="mt-1 text-xs font-normal text-muted-foreground">{cycleLabel(tutor)}</p>
  </div>;
}

function TutorActions({ tutor, onOpenSheet, onRequestStatusChange }: {
  tutor: SafeTutorListItem;
  onOpenSheet: OpenTutorSheet;
  onRequestStatusChange: RequestTutorStatus;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const openingOverlay = useRef(false);
  const action = tutor.status === "ACTIVE" ? "Desactivar tutor" : "Reactivar";
  const openSheet = (mode: "view" | "edit") => {
    if (trigger.current) {
      openingOverlay.current = true;
      onOpenSheet(mode, tutor, trigger.current);
    }
  };
  return <>
    <div className="hidden flex-wrap justify-end gap-2 md:flex">
      <Button size="sm" type="button" variant="outline" aria-label={`Editar ${tutor.formalName}`}
        onClick={(event) => onOpenSheet("edit", tutor, event.currentTarget)}>Editar</Button>
      <Button size="sm" type="button" variant="ghost" aria-label={`Ver materias de ${tutor.formalName}`}
        onClick={(event) => onOpenSheet("view", tutor, event.currentTarget)}>Ver materias</Button>
      <Button size="sm" type="button" variant="ghost" aria-label={`${action} ${tutor.formalName}`}
        onClick={(event) => onRequestStatusChange(tutor, event.currentTarget)}>{action}</Button>
    </div>
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={trigger} size="icon" type="button" variant="ghost" aria-label={`Acciones para ${tutor.formalName}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent loop aria-label={`Acciones para ${tutor.formalName}`} align="end" onCloseAutoFocus={(event) => {
          if (openingOverlay.current) event.preventDefault();
          openingOverlay.current = false;
        }}>
          <DropdownMenuItem onSelect={() => openSheet("view")}>Ver detalle</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openSheet("edit")}>Editar</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => {
            if (trigger.current) {
              openingOverlay.current = true;
              onRequestStatusChange(tutor, trigger.current);
            }
          }}>{action}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </>;
}

export function TutorList({ rows, onOpenSheet, onRequestStatusChange, loading = false }: {
  rows: SafeTutorListItem[];
  onOpenSheet: OpenTutorSheet;
  onRequestStatusChange: RequestTutorStatus;
  loading?: boolean;
}) {
  return <div className="mt-4 rounded-xl bg-card p-3 shadow-xs md:p-4">
    <DataTable label="Lista de tutores" rows={rows} loading={loading} getRowKey={(tutor) => tutor.id}
      identityColumn={{ id: "tutor", header: "Tutor", cell: (tutor) => <TutorIdentity tutor={tutor} onOpenSheet={onOpenSheet} /> }}
      columns={[
        { id: "career", header: "Carrera", cell: (tutor) => <CareerBadge name={tutor.primaryCareer.name} color={tutor.primaryCareer.color} /> },
        { id: "scholarship", header: "Beca", className: "hidden lg:table-cell", compactClassName: "hidden", cell: scholarshipLabel },
        { id: "subjects", header: "Materias", numeric: true, cell: (tutor) => <span>{tutor.subjectCount}</span> },
        { id: "status", header: "Estado", cell: (tutor) => <StatusBadge label={statusLabel(tutor.status)} variant={stateVariants[tutor.status]} /> },
      ]}
      rowActions={(tutor) => <TutorActions {...{ tutor, onOpenSheet, onRequestStatusChange }} />}
    />
  </div>;
}
