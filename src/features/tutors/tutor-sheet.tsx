import { type FormEvent, useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { SafeTutorDetail, SafeTutorListItem } from "./tutor-service";
import type { TutorsCatalogOptions } from "./tutor-screen-types";
import type { TutorFormValues, TutorFormSubmitOptions, SheetMode } from "./tutor-presentation-types";
import { TutorRequestError, getTutorErrorMessage } from "./tutor-screen-utils";
import { TutorFormFields } from "./tutor-form-fields";
import { ActionLink } from "./tutor-table";
import { movementHistoryHref } from "@/features/hours/hour-navigation";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";

function formValuesForTutor(
  tutor: SafeTutorListItem | SafeTutorDetail | undefined,
  catalogOptions: TutorsCatalogOptions,
): TutorFormValues {
  const currentCycle =
    tutor === undefined ? catalogOptions.currentCycle : tutor.currentCycle;

  return {
    firstName: tutor?.firstName ?? "",
    lastName: tutor?.lastName ?? "",
    preferredDisplayName: tutor?.preferredDisplayName ?? "",
    institutionalIdentifier: tutor?.institutionalIdentifier ?? "",
    applicationEmail:
      tutor !== undefined && "applicationAccount" in tutor
        ? tutor.applicationAccount?.email ?? ""
        : "",
    primaryCareerId: tutor?.primaryCareer.id ?? "",
    subjectIds:
      "subjects" in (tutor ?? {})
        ? (tutor as SafeTutorDetail).subjects.map((subject) => subject.id)
        : [],
    cycleId: currentCycle?.id ?? "",
    scholarshipReferenceId: tutor?.scholarshipReference?.id ?? "",
  };
}

function formsEqual(left: TutorFormValues, right: TutorFormValues) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function TutorSheet({
  catalogOptions,
  detail,
  detailError,
  detailLoading,
  fieldErrors,
  mode,
  onClose,
  onRetryDetail,
  onSubmit,
  open,
  saving,
  sheetError,
  tutor,
}: {
  catalogOptions: TutorsCatalogOptions;
  detail: SafeTutorDetail | null;
  detailError: TutorRequestError | null;
  detailLoading: boolean;
  fieldErrors: Record<string, string>;
  mode: SheetMode | null;
  onClose: () => void;
  onRetryDetail: () => void;
  onSubmit: (values: TutorFormValues, options: TutorFormSubmitOptions) => void;
  open: boolean;
  saving: boolean;
  sheetError: TutorRequestError | null;
  tutor?: SafeTutorListItem;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [baseline, setBaseline] = useState<TutorFormValues>(() =>
    formValuesForTutor(mode === "add" ? undefined : detail ?? tutor, catalogOptions),
  );
  const formKey = open
    ? `${mode}:${tutor?.id ?? "new"}:${detail?.id ?? "pending"}`
    : "closed";
  const [form, setForm] = useState<TutorFormValues>(() =>
    formValuesForTutor(mode === "add" ? undefined : detail ?? tutor, catalogOptions),
  );
  const [subjectsChanged, setSubjectsChanged] = useState(false);
  const [membershipChanged, setMembershipChanged] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!open || mode === null) {
      return;
    }

    const nextForm = formValuesForTutor(
      mode === "add" ? undefined : detail ?? tutor,
      catalogOptions,
    );
    // The form is reset when the selected tutor/detail changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(nextForm);
    setBaseline(nextForm);
    setSubjectsChanged(false);
    setMembershipChanged(false);
    setConfirmDiscard(false);
  }, [catalogOptions, detail, formKey, mode, open, tutor]);

  const isDirty = open && !formsEqual(form, baseline);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    // Reloading or leaving the site asks for the browser's confirmation.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  if (!open || mode === null) {
    return null;
  }

  const isView = mode === "view";
  const isAdd = mode === "add";
  const detailUnavailable = !isAdd && detail === null && detailError !== null;
  const record = detail ?? tutor;
  const title = isAdd
    ? "Agregar tutor"
    : `${mode === "edit" ? "Editar" : "Detalle de"} ${record?.formalName ?? "tutor"}`;
  const currentScholarship = detail?.scholarshipReference;
  const scholarshipOptions = [
    ...catalogOptions.scholarshipReferences,
    ...(currentScholarship !== null && currentScholarship !== undefined &&
    !catalogOptions.scholarshipReferences.some((option) => option.id === currentScholarship.id)
      ? [currentScholarship]
      : []),
  ];
  const subjectOptions = [
    ...catalogOptions.subjects.filter((subject) => subject.careerId === form.primaryCareerId),
    ...(detail?.subjects.filter(
      (subject) =>
        subject.careerId === form.primaryCareerId &&
        !catalogOptions.subjects.some((option) => option.id === subject.id),
    ) ?? []),
  ];
  function attemptClose() {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }

    onClose();
  }

  function updateForm<K extends keyof TutorFormValues>(field: K, value: TutorFormValues[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function handleCareerChange(value: string) {
    setForm((previous) => ({ ...previous, primaryCareerId: value, subjectIds: [] }));
    setSubjectsChanged(true);
  }

  function toggleSubject(subjectId: string) {
    setForm((previous) => ({
      ...previous,
      subjectIds: previous.subjectIds.includes(subjectId)
        ? previous.subjectIds.filter((id) => id !== subjectId)
        : [...previous.subjectIds, subjectId],
    }));
    setSubjectsChanged(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isView || detailLoading || detailUnavailable || (!isAdd && !isDirty)) {
      return;
    }

    const changedFields = [
      ...(form.firstName !== baseline.firstName ? ["firstName"] : []),
      ...(form.lastName !== baseline.lastName ? ["lastName"] : []),
      ...(form.preferredDisplayName !== baseline.preferredDisplayName
        ? ["preferredDisplayName"]
        : []),
      ...(form.institutionalIdentifier !== baseline.institutionalIdentifier
        ? ["institutionalIdentifier"]
        : []),
      ...(form.applicationEmail !== baseline.applicationEmail ? ["applicationEmail"] : []),
      ...(form.primaryCareerId !== baseline.primaryCareerId ? ["primaryCareerId"] : []),
    ];

    onSubmit(form, {
      changedFields,
      membershipChanged:
        membershipChanged ||
        form.cycleId !== baseline.cycleId ||
        form.scholarshipReferenceId !== baseline.scholarshipReferenceId,
      subjectsChanged: subjectsChanged || form.subjectIds.join(",") !== baseline.subjectIds.join(","),
    });
  }

  return (
    <>
    <Sheet open={open} onOpenChange={(next) => { if (!next) attemptClose(); }}>
      <SheetContent aria-modal="true" showCloseButton={false} onOpenAutoFocus={(event) => {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }} onCloseAutoFocus={(event) => event.preventDefault()}>
        <SheetHeader className="relative border-b border-border pr-16">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{isAdd
            ? "Completar los datos para guardar el registro del tutor."
            : "Consultar o actualizar el contexto académico y la información vigente del tutor."}</SheetDescription>
          <Button aria-label="Cerrar panel de tutor" className="absolute right-4 top-4" onClick={attemptClose} ref={closeButtonRef} size="icon" type="button" variant="ghost">
            <X aria-hidden="true" />
          </Button>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
            {sheetError && (
              <div aria-live="assertive" className="rounded-md border border-destructive/30 bg-muted/60 p-4 text-sm text-destructive" role="alert">
                {getTutorErrorMessage(sheetError)}
              </div>
            )}
            {detailError && (
              <div aria-live="assertive" className="rounded-md border border-destructive/30 bg-muted/60 p-4 text-sm text-destructive" role="alert">
                <p>{getTutorErrorMessage(detailError, "No se pudo cargar el detalle del tutor.")}</p>
                <Button className="mt-3" onClick={onRetryDetail} size="sm" type="button" variant="outline">
                  Reintentar
                </Button>
              </div>
            )}
            {detailLoading && (
              <div aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                Cargando el detalle del tutor…
              </div>
            )}

            <TutorFormFields {...{ catalogOptions, detailLoading, detailUnavailable, fieldErrors, form,
              isAdd, isView, record, scholarshipOptions, subjectOptions, updateForm,
              handleCareerChange, toggleSubject, setMembershipChanged }} />
          </div>

          <div className="border-t border-border bg-card px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={attemptClose} type="button" variant="outline">Cerrar</Button>
              {isView && record?.currentCycle && (
                <ActionLink href={movementHistoryHref(record.currentCycle.id, record.id)} label="Ver movimientos" accessibleLabel={`Ver movimientos de ${record.formalName}`} />
              )}
              {!isView && (
                <Button
                  disabled={
                    saving ||
                    detailLoading ||
                    detailUnavailable ||
                    (!isAdd && !isDirty)
                  }
                  type="submit"
                >
                  {saving ? "Guardando…" : isAdd ? "Agregar tutor" : "Guardar cambios"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
    <ConfirmationDialog
      open={confirmDiscard}
      onOpenChange={setConfirmDiscard}
      title="¿Cerrar la ficha?"
      description="Hay cambios sin guardar."
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }}
      confirmLabel="Cerrar"
      destructive
      onConfirm={() => {
        setConfirmDiscard(false);
        onClose();
      }}
    />
    </>
  );
}
