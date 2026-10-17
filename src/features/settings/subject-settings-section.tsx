import { useMemo } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

import type { SafeCareer, SafeSubject } from "@/features/tutors/tutor-service";

import { CareerBadge } from "@/shared/components/career-badge";
import { DataTable } from "@/shared/components/data-table";
import { FormField } from "@/shared/components/form-field";
import { StatusBadge } from "@/shared/components/status-badge";

import { EmptyReferenceList, ReferenceStatusAction, ReferenceStatusBadge } from "./settings-feedback";
import { type SubjectForm, type SubmitHandler } from "./settings-screen-utils";

export function SubjectSection({
  careers,
  disabled,
  form,
  onCancel,
  onCareerChange,
  onEdit,
  onNameChange,
  onStatusChange,
  onSubmit,
  subjects,
}: {
  careers: SafeCareer[];
  disabled: boolean;
  form: SubjectForm;
  onCancel: () => void;
  onCareerChange: (careerId: string) => void;
  onEdit: (subject: SafeSubject) => void;
  onNameChange: (name: string) => void;
  onStatusChange: (subject: SafeSubject) => void;
  onSubmit: SubmitHandler;
  subjects: SafeSubject[];
}) {
  const editingSubject =
    form.id === null
      ? null
      : subjects.find((subject) => subject.id === form.id) ?? null;
  const activeCareers = careers.filter((career) => career.status === "ACTIVE");
  const selectedCareer = careers.find((career) => career.id === form.careerId);
  const careerOptions = useMemo(() => {
    if (selectedCareer !== undefined && selectedCareer.status === "INACTIVE") {
      return [
        selectedCareer,
        ...activeCareers.filter((career) => career.id !== selectedCareer.id),
      ];
    }

    return activeCareers;
  }, [activeCareers, selectedCareer]);

  return (
    <section aria-labelledby="subject-settings-title" className="min-w-0">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle id="subject-settings-title">Materias</CardTitle>
              <CardDescription className="mt-2">
                Administrar materias dentro de una carrera activa. Las relaciones históricas se conservan.
              </CardDescription>
            </div>
            <div className="shrink-0">
              <StatusBadge
                label={`${subjects.filter((subject) => subject.status === "ACTIVE").length} activas`}
                variant="info"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            aria-label={
              editingSubject === null
                ? "Agregar materia"
                : `Editar materia ${editingSubject.name}`
            }
            className="border-b border-border pb-5 mb-5"
            onSubmit={onSubmit}
          >
            <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
              <FormField id="subject-field-1" label="Nombre de la materia">
                <Input
                  disabled={disabled}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder="Álgebra"
                  required
                  value={form.name}
                />
              </FormField>
              <FormField id="subject-field-2" label="Carrera">
                <NativeSelect
                  disabled={disabled || activeCareers.length === 0}
                  onChange={(event) => onCareerChange(event.target.value)}
                  required
                  value={form.careerId}
                >
                  <option value="">Seleccionar una carrera activa</option>
                  {careerOptions.map((career) => (
                    <option
                      disabled={career.status === "INACTIVE"}
                      key={career.id}
                      value={career.id}
                    >
                      {career.name}{career.status === "INACTIVE" ? " · inactiva" : ""}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={disabled || activeCareers.length === 0}
                  size="sm"
                  type="submit"
                >
                  {editingSubject === null ? "Agregar materia" : "Guardar cambios"}
                </Button>
                {editingSubject !== null && (
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
            {activeCareers.length === 0 && (
              <p className="mt-3 text-sm text-warning">
                Crear o activar una carrera antes de agregar materias.
              </p>
            )}
          </form>

          {subjects.length === 0 ? (
            <EmptyReferenceList>Todavía no hay materias registradas.</EmptyReferenceList>
          ) : (
            <DataTable
              label="Materias registradas"
              rows={subjects}
              getRowKey={(subject) => subject.id}
              identityColumn={{ id: "name", header: "Materia", cell: (subject) => subject.name }}
              columns={[
                {
                  id: "career", header: "Carrera", cell: (subject) => {
                    const career = careers.find((item) => item.id === subject.careerId);
                    return <div className="flex flex-wrap items-center gap-2">{career && <CareerBadge name={career.name} color={career.color} size="sm" />}<span className="md:max-lg:hidden">{subject.careerName}</span>
                    </div>;
                  }
                },
                { id: "status", header: "Estado", cell: (subject) => <ReferenceStatusBadge status={subject.status} /> },
              ]}
              rowActions={(subject) => <div className="flex flex-nowrap items-center gap-2">
                <Button
                  aria-label={`Editar materia ${subject.name}`}
                  disabled={disabled}
                  onClick={() => onEdit(subject)}
                  size="sm"
                  type="button"
                  variant="ghost"
                ><Pencil aria-hidden="true" /><span className="md:max-lg:hidden">Editar</span></Button>
                <ReferenceStatusAction
                  disabled={disabled}
                  entityLabel={`materia ${subject.name}`}
                  onClick={() => onStatusChange(subject)}
                  status={subject.status}
                />
              </div>}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
