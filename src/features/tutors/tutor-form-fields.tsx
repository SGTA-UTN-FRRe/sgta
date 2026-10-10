import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FormField, StatusBadge, CareerBadge } from "@/shared/components";
import type { SafeTutorDetail, SafeTutorListItem } from "./tutor-service";
import type { TutorsCatalogOptions } from "./tutor-screen-types";
import type { TutorFormValues } from "./tutor-presentation-types";
import { stateVariants, statusLabel } from "./tutor-screen-utils";

interface TutorFormFieldsProps {
  catalogOptions: TutorsCatalogOptions;
  detailLoading: boolean;
  detailUnavailable: boolean;
  fieldErrors: Record<string, string>;
  form: TutorFormValues;
  isAdd: boolean;
  isView: boolean;
  record?: SafeTutorDetail | SafeTutorListItem;
  scholarshipOptions: TutorsCatalogOptions["scholarshipReferences"];
  subjectOptions: TutorsCatalogOptions["subjects"];
  updateForm: <K extends keyof TutorFormValues>(field: K, value: TutorFormValues[K]) => void;
  handleCareerChange: (value: string) => void;
  toggleSubject: (id: string) => void;
  setMembershipChanged: (changed: boolean) => void;
}

export function TutorFormFields({ catalogOptions, detailLoading, detailUnavailable, fieldErrors,
  form, isAdd, isView, record, scholarshipOptions, subjectOptions, updateForm,
  handleCareerChange, toggleSubject, setMembershipChanged }: TutorFormFieldsProps) {
  const selectedCareer = catalogOptions.careers.find((career) => career.id === form.primaryCareerId);
  return <>
  <section aria-labelledby="tutor-identity-heading">
    <h3 className="font-display text-xl font-semibold text-foreground" id="tutor-identity-heading">Identidad</h3>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <FormField id="tutor-first-name" label="Nombre" error={fieldErrors.firstName}>
        <Input
          disabled={isView || detailLoading || detailUnavailable}
          id="tutor-first-name"
          onChange={(event) => updateForm("firstName", event.target.value)}
          placeholder="Nombre"
          value={form.firstName}
        />
      </FormField>
      <FormField id="tutor-last-name" label="Apellido (opcional)" error={fieldErrors.lastName}>
        <Input
          disabled={isView || detailLoading || detailUnavailable}
          id="tutor-last-name"
          onChange={(event) => updateForm("lastName", event.target.value)}
          placeholder="Apellido"
          value={form.lastName}
        />
      </FormField>
      <FormField id="tutor-preferred-name" label="Nombre preferido (opcional)" error={fieldErrors.preferredDisplayName}>
        <Input
          disabled={isView || detailLoading || detailUnavailable}
          id="tutor-preferred-name"
          onChange={(event) => updateForm("preferredDisplayName", event.target.value)}
          placeholder="Cómo desea aparecer en la operación"
          value={form.preferredDisplayName}
        />
      </FormField>
      <FormField id="tutor-institutional-identifier" label="Identificador institucional (opcional)" error={fieldErrors.institutionalIdentifier}>
        <Input
          disabled={isView || detailLoading || detailUnavailable}
          id="tutor-institutional-identifier"
          onChange={(event) => updateForm("institutionalIdentifier", event.target.value)}
          placeholder="Legajo o identificador institucional"
          value={form.institutionalIdentifier}
        />
      </FormField>
    </div>
  </section>

  <section aria-labelledby="tutor-academic-heading">
    <h3 className="font-display text-xl font-semibold text-foreground" id="tutor-academic-heading">Contexto académico</h3>
    <div className="mt-4">
      <FormField id="tutor-career-sheet" label="Carrera" error={fieldErrors.primaryCareerId}>
        <NativeSelect
          disabled={isView || detailLoading || detailUnavailable}
          id="tutor-career-sheet"
          onChange={(event) => handleCareerChange(event.target.value)}
          value={form.primaryCareerId}
        >
          <NativeSelectOption value="">Seleccionar una carrera</NativeSelectOption>
          {catalogOptions.careers.map((career) => (
            <NativeSelectOption key={career.id} value={career.id}>{career.name}</NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
    </div>
    {selectedCareer && <div className="mt-3"><CareerBadge name={selectedCareer.name} color={selectedCareer.color} /></div>}
  </section>

  <section aria-labelledby="tutor-subjects-heading">
    <h3 className="font-display text-xl font-semibold text-foreground" id="tutor-subjects-heading">Materias</h3>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">
      Seleccionar las materias asociadas a la carrera del tutor.
    </p>
    {fieldErrors.subjectIds && <p id="tutor-subjects-error" role="alert" className="text-sm text-destructive">{fieldErrors.subjectIds}</p>}
    <div className="mt-4 space-y-4">
      {form.primaryCareerId === "" ? (
        <p className="text-sm text-muted-foreground">Seleccionar una carrera para ver sus materias.</p>
      ) : subjectOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay materias activas para esta carrera.</p>
      ) : (
        subjectOptions.map((subject) => {
          const checked = form.subjectIds.includes(subject.id);
          const inactive = subject.status === "INACTIVE";

          return (
            <FormField key={subject.id} id={`tutor-subject-${subject.id}`} label={subject.name} description={inactive ? "Inactiva · se conserva como antecedente" : undefined}>
              <Checkbox
                checked={checked}
              disabled={isView || detailLoading || detailUnavailable || inactive}
                onCheckedChange={() => toggleSubject(subject.id)}
                aria-describedby={fieldErrors.subjectIds ? "tutor-subjects-error" : undefined}
                aria-invalid={Boolean(fieldErrors.subjectIds)}
              />
            </FormField>
          );
        })
      )}
    </div>
    <p className="mt-2 text-xs text-muted-foreground">{form.subjectIds.length} {form.subjectIds.length === 1 ? "materia seleccionada" : "materias seleccionadas"}</p>
  </section>

  <section aria-labelledby="tutor-cycle-heading">
    <h3 className="font-display text-xl font-semibold text-foreground" id="tutor-cycle-heading">Ciclo y beca</h3>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <FormField id="tutor-cycle" label="Ciclo abierto" error={fieldErrors.cycleId}>
        <NativeSelect
          disabled={
            isView ||
            detailLoading ||
            detailUnavailable ||
            catalogOptions.currentCycle === null
          }
          id="tutor-cycle"
          onChange={(event) => {
            setMembershipChanged(true);
            updateForm("cycleId", event.target.value);
          }}
          value={form.cycleId}
        >
          <NativeSelectOption value="">Seleccionar ciclo abierto</NativeSelectOption>
          {catalogOptions.currentCycle !== null && (
            <NativeSelectOption value={catalogOptions.currentCycle.id}>{catalogOptions.currentCycle.name}</NativeSelectOption>
          )}
        </NativeSelect>
      </FormField>
      <FormField id="tutor-scholarship" label="Referencia de beca (opcional)" error={fieldErrors.scholarshipReferenceId}>
        <NativeSelect
          disabled={isView || detailLoading || detailUnavailable}
          id="tutor-scholarship"
          onChange={(event) => {
            setMembershipChanged(true);
            updateForm("scholarshipReferenceId", event.target.value);
          }}
          value={form.scholarshipReferenceId}
        >
          <NativeSelectOption value="">Sin referencia</NativeSelectOption>
          {scholarshipOptions.map((reference) => (
            <NativeSelectOption disabled={reference.status === "INACTIVE"} key={reference.id} value={reference.id}>
              {reference.type}{reference.status === "INACTIVE" ? " · inactiva" : ""}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
    </div>
  </section>

  <section aria-labelledby="tutor-account-heading">
    <h3 className="font-display text-xl font-semibold text-foreground" id="tutor-account-heading">Cuenta de acceso</h3>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">
      Vincular una cuenta de Tutor habilitada. Dejar vacío para desvincular la cuenta actual.
    </p>
    <div className="mt-4">
      <FormField id="tutor-application-email" label="Correo de la cuenta habilitada (opcional)" error={fieldErrors.applicationEmail}>
        <Input
          autoComplete="off"
          disabled={isView || detailLoading || detailUnavailable}
          id="tutor-application-email"
          onChange={(event) => updateForm("applicationEmail", event.target.value)}
          placeholder="tutor@utn.edu.ar"
          type="email"
          value={form.applicationEmail}
        />
      </FormField>
    </div>
  </section>

  <section aria-labelledby="tutor-status-heading">
    <h3 className="font-display text-xl font-semibold text-foreground" id="tutor-status-heading">Estado</h3>
    <div className="mt-4 flex items-center gap-3">
      <StatusBadge
        label={statusLabel(record?.status ?? "ACTIVE")}
        variant={stateVariants[record?.status ?? "ACTIVE"]}
      />
      <span className="text-sm text-muted-foreground">
        {isAdd ? "El tutor se crea activo." : "El estado se actualiza desde el menú de acciones."}
      </span>
    </div>
  </section>
  </>;
}
