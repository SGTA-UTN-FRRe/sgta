import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import type { SafeScholarshipReference } from "@/features/tutors/tutor-service";

import { DataTable } from "@/shared/components/data-table";
import { FormField } from "@/shared/components/form-field";
import { StatusBadge } from "@/shared/components/status-badge";

import { EmptyReferenceList, ReferenceStatusAction, ReferenceStatusBadge } from "./settings-feedback";
import { type ScholarshipForm, type SubmitHandler } from "./settings-screen-utils";

export function ScholarshipSection({
  disabled,
  form,
  onCancel,
  onEdit,
  onHoursChange,
  onNotesChange,
  onStatusChange,
  onSubmit,
  onTypeChange,
  references,
}: {
  disabled: boolean;
  form: ScholarshipForm;
  onCancel: () => void;
  onEdit: (reference: SafeScholarshipReference) => void;
  onHoursChange: (hours: string) => void;
  onNotesChange: (notes: string) => void;
  onStatusChange: (reference: SafeScholarshipReference) => void;
  onSubmit: SubmitHandler;
  onTypeChange: (type: string) => void;
  references: SafeScholarshipReference[];
}) {
  const editingReference =
    form.id === null
      ? null
      : references.find((reference) => reference.id === form.id) ?? null;

  return (
    <section aria-labelledby="scholarship-settings-title" className="min-w-0">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle id="scholarship-settings-title">Referencias de beca</CardTitle>
              <CardDescription className="mt-2">
                Mantener tipos de referencia y datos conocidos. Esta información es orientativa y no certifica cumplimiento.
              </CardDescription>
            </div>
            <div className="shrink-0">
              <StatusBadge
                label={`${references.filter((reference) => reference.status === "ACTIVE").length} activas`}
                variant="info"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            aria-label={
              editingReference === null
                ? "Agregar referencia de beca"
                : `Editar referencia ${editingReference.type}`
            }
            className="border-b border-border pb-5 mb-5"
            onSubmit={onSubmit}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField id="scholarship-field-1" label="Tipo de referencia">
                <Input
                  disabled={disabled}
                  onChange={(event) => onTypeChange(event.target.value)}
                  placeholder="Beca institucional"
                  required
                  value={form.type}
                />
              </FormField>
              <FormField id="scholarship-field-2" label="Horas requeridas conocidas (informativo)">
                <Input
                  disabled={disabled}
                  min="0"
                  onChange={(event) => onHoursChange(event.target.value)}
                  placeholder="Sin dato"
                  step="1"
                  type="number"
                  value={form.knownRequiredHours}
                />
              </FormField>
              <div className="md:col-span-2"><FormField id="scholarship-field-3" label="Notas">
                <Textarea
                  disabled={disabled}
                  onChange={(event) => onNotesChange(event.target.value)}
                  placeholder="Contexto de referencia, sin resultado de cumplimiento"
                  value={form.notes}
                />
              </FormField></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={disabled} size="sm" type="submit">
                {editingReference === null ? "Agregar referencia de beca" : "Guardar cambios"}
              </Button>
              {editingReference !== null && (
                <Button
                  disabled={disabled}
                  onClick={onCancel}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>

          {references.length === 0 ? (
            <EmptyReferenceList>
              Todavía no hay referencias de beca registradas.
            </EmptyReferenceList>
          ) : (
            <DataTable
              label="Referencias de beca registradas"
              rows={references}
              getRowKey={(reference) => reference.id}
              identityColumn={{ id: "name", header: "Tipo", cell: (reference) => reference.type }}
              columns={[
                { id: "hours", header: "Horas conocidas", cell: (reference) => reference.knownRequiredHours === null ? "Sin dato" : `${reference.knownRequiredHours} horas`, numeric: true },
                { id: "notes", header: "Notas", cell: (reference) => reference.notes ?? "Sin notas" },
                { id: "status", header: "Estado", cell: (reference) => <ReferenceStatusBadge status={reference.status} /> },
              ]}
              rowActions={(reference) => <div className="flex flex-nowrap items-center gap-2">
                <Button
                  aria-label={`Editar referencia ${reference.type}`}
                  disabled={disabled}
                  onClick={() => onEdit(reference)}
                  size="sm"
                  type="button"
                  variant="ghost"
                ><Pencil aria-hidden="true" /><span className="md:max-lg:hidden">Editar</span></Button>
                <ReferenceStatusAction
                  disabled={disabled}
                  entityLabel={`referencia ${reference.type}`}
                  onClick={() => onStatusChange(reference)}
                  status={reference.status}
                />
              </div>}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
