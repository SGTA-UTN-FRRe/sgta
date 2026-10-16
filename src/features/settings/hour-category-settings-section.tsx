import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

import type { SafeHourCategory } from "@/features/hours/hour-service";

import { DataTable } from "@/shared/components/data-table";
import { FormField } from "@/shared/components/form-field";
import { StatusBadge } from "@/shared/components/status-badge";

import { EmptyReferenceList, ReferenceStatusAction, ReferenceStatusBadge } from "./settings-feedback";
import {
  hourActivityKindLabels,
  hourActivityKinds,
  type HourCategoryForm,
  type SubmitHandler,
} from "./settings-screen-utils";

function hourActivityKindLabel(activityKind: SafeHourCategory["activityKind"]) {
  return activityKind === null
    ? "Sin origen de actividad"
    : hourActivityKindLabels[activityKind];
}

export function HourCategorySection({
  categories,
  disabled,
  form,
  onActivityKindChange,
  onCancel,
  onEdit,
  onNameChange,
  onStatusChange,
  onSubmit,
}: {
  categories: SafeHourCategory[];
  disabled: boolean;
  form: HourCategoryForm;
  onActivityKindChange: (activityKind: string) => void;
  onCancel: () => void;
  onEdit: (category: SafeHourCategory) => void;
  onNameChange: (name: string) => void;
  onStatusChange: (category: SafeHourCategory) => void;
  onSubmit: SubmitHandler;
}) {
  const editingCategory =
    form.id === null
      ? null
      : categories.find((category) => category.id === form.id) ?? null;

  return (
    <section aria-labelledby="hour-category-settings-title" className="min-w-0">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle id="hour-category-settings-title">
                Categorías de horas
              </CardTitle>
              <CardDescription className="mt-2">
                Configurar las categorías disponibles para registrar movimientos de horas.
                Las categorías inactivas se conservan para consultar el historial.
              </CardDescription>
            </div>
            <StatusBadge
              label={`${categories.filter((category) => category.status === "ACTIVE").length} activas`}
              variant="info"
            />
          </div>
        </CardHeader>
        <CardContent>
          <form
            aria-label={
              editingCategory === null
                ? "Agregar categoría de horas"
                : `Editar categoría ${editingCategory.name}`
            }
            className="border-b border-border pb-5 mb-5"
            onSubmit={onSubmit}
          >
            <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
              <FormField id="hour-category-name" label="Nombre de categoría">
                <Input
                  disabled={disabled}
                  id="hour-category-name"
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder="Tutoría individual"
                  required
                  value={form.name}
                />
              </FormField>
              <FormField id="hour-category-field-2" label="Origen de actividad (opcional)">
                <NativeSelect
                  disabled={disabled}
                  onChange={(event) => onActivityKindChange(event.target.value)}
                  value={form.activityKind}
                >
                  <option value="">Sin origen de actividad</option>
                  {hourActivityKinds.map((activityKind) => (
                    <option key={activityKind} value={activityKind}>
                      {hourActivityKindLabels[activityKind]}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <div className="flex flex-wrap gap-2">
                <Button disabled={disabled} size="sm" type="submit">
                  {editingCategory === null ? "Agregar categoría" : "Guardar cambios"}
                </Button>
                {editingCategory !== null && (
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

          {categories.length === 0 ? (
            <EmptyReferenceList>Todavía no hay categorías de horas registradas.</EmptyReferenceList>
          ) : (
            <DataTable
              label="Categorías de horas registradas"
              rows={categories}
              getRowKey={(category) => category.id}
              identityColumn={{ id: "name", header: "Categoría", cell: (category) => category.name }}
              columns={[
                { id: "origin", header: "Origen de actividad", cell: (category) => hourActivityKindLabel(category.activityKind) },
                { id: "status", header: "Estado", cell: (category) => <ReferenceStatusBadge status={category.status} /> },
              ]}
              rowActions={(category) => <>
                <Button
                  aria-label={`Editar categoría ${category.name}`}
                  disabled={disabled}
                  onClick={() => onEdit(category)}
                  size="sm"
                  type="button"
                  variant="ghost"
                ><Pencil aria-hidden="true" />Editar</Button>
                <ReferenceStatusAction
                  disabled={disabled}
                  entityLabel={`categoría ${category.name}`}
                  onClick={() => onStatusChange(category)}
                  status={category.status}
                />
              </>}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
