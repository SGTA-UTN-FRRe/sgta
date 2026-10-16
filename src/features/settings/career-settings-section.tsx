import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { SafeCareer } from "@/features/tutors/tutor-service";
import { CAREER_COLOR_LABELS, type CareerColor } from "@/shared/career-color";
import { CareerBadge } from "@/shared/components/career-badge";
import { DataTable } from "@/shared/components/data-table";
import { FormField } from "@/shared/components/form-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { CareerColorField } from "./career-color-field";
import { EmptyReferenceList, ReferenceStatusAction, ReferenceStatusBadge } from "./settings-feedback";
import { type CareerForm, type SubmitHandler } from "./settings-screen-utils";

export function CareerSection({
  careers,
  disabled,
  form,
  onCancel,
  onEdit,
  onNameChange,
  onColorChange,
  onStatusChange,
  onSubmit,
}: {
  careers: SafeCareer[];
  disabled: boolean;
  form: CareerForm;
  onCancel: () => void;
  onEdit: (career: SafeCareer) => void;
  onNameChange: (name: string) => void;
  onColorChange: (color: CareerColor) => void;
  onStatusChange: (career: SafeCareer) => void;
  onSubmit: SubmitHandler;
}) {
  const editingCareer =
    form.id === null
      ? null
      : careers.find((career) => career.id === form.id) ?? null;

  return (
    <section aria-labelledby="career-settings-title" className="min-w-0">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle id="career-settings-title">Carreras</CardTitle>
              <CardDescription className="mt-2">
                Mantener las carreras disponibles para el contexto académico de los tutores.
              </CardDescription>
            </div>
            <StatusBadge
              label={`${careers.filter((career) => career.status === "ACTIVE").length} activas`}
              variant="info"
            />
          </div>
        </CardHeader>
        <CardContent>
          <form
            aria-label={
              editingCareer === null
                ? "Agregar carrera"
                : `Editar carrera ${editingCareer.name}`
            }
            className="border-b border-border pb-5 mb-5"
            onSubmit={onSubmit}
          >
            <div className="grid gap-4">
              <FormField id="career-field-1" label="Nombre de la carrera">
                <Input
                  disabled={disabled}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder="Ingeniería en Sistemas"
                  required
                  value={form.name}
                />
              </FormField>
              <CareerColorField
                disabled={disabled}
                mode={editingCareer === null ? "create" : "edit"}
                name={form.name}
                value={form.color}
                onChange={onColorChange}
              />
              <div className="flex flex-wrap gap-2">
                <Button disabled={disabled} size="sm" type="submit">
                  {editingCareer === null ? "Agregar carrera" : "Guardar cambios"}
                </Button>
                {editingCareer !== null && (
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
            </div>
          </form>

          {careers.length === 0 ? (
            <EmptyReferenceList>Todavía no hay carreras registradas.</EmptyReferenceList>
          ) : (
            <DataTable
              label="Carreras registradas"
              rows={careers}
              getRowKey={(career) => career.id}
              identityColumn={{ id: "name", header: "Carrera", cell: (career) => career.name }}
              columns={[
                {
                  id: "color", header: "Color", cell: (career) => <div className="flex items-center gap-2">
                    <CareerBadge name={career.name} color={career.color} size="sm" />
                    <span>{CAREER_COLOR_LABELS[career.color]}</span>
                  </div>
                },
                { id: "status", header: "Estado", cell: (career) => <ReferenceStatusBadge status={career.status} /> },
              ]}
              rowActions={(career) => <>
                <Button
                  aria-label={`Editar carrera ${career.name}`}
                  disabled={disabled}
                  onClick={() => onEdit(career)}
                  size="sm"
                  type="button"
                  variant="ghost"
                ><Pencil aria-hidden="true" />Editar</Button>
                <ReferenceStatusAction
                  disabled={disabled}
                  entityLabel={`carrera ${career.name}`}
                  onClick={() => onStatusChange(career)}
                  status={career.status}
                />
              </>}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
