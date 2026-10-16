import { type FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { FormField } from "@/shared/components/form-field";
import { SystemState } from "@/shared/components/system-state";
import { StatusBadge } from "@/shared/components/status-badge";
import type { SafeCareer } from "@/features/tutors/tutor-service";
import type { ConsultationReviewDetail } from "./consultation-validation";
import { ConsultationCareer } from "./consultation-list";
import {
  fullName,
  formatDate,
  validDate,
  statusLabels,
  statusVariant,
  anomalyFieldResolution,
  anomalyLabel,
  type DuplicateChoice,
  type ReviewForm,
  type Classification,
} from "./consultations-screen-utils";

export function ReviewSheet({
  careers,
  returnFocus,
  detail,
  duplicateChoices,
  form,
  loading,
  saving,
  error,
  success,
  dirty,
  onClose,
  onLoadMore,
  onRetry,
  onSave,
  onFormChange,
  onDuplicateChoice,
}: {
  careers: SafeCareer[];
  returnFocus: () => void;
  detail: ConsultationReviewDetail | null;
  duplicateChoices: Record<string, DuplicateChoice>;
  form: ReviewForm | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  dirty: boolean;
  onClose: () => void;
  onLoadMore: (offset: number) => void;
  onRetry: () => void;
  onSave: (form: ReviewForm, choices: Record<string, DuplicateChoice>) => void;
  onFormChange: (form: ReviewForm | null) => void;
  onDuplicateChoice: (candidateId: string, choice: DuplicateChoice) => void;
}) {
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const readOnly = detail !== null && ["CONSOLIDATED", "DUPLICATE"].includes(detail.status);
  const subjects = detail?.references.subjects.filter(
    (subject) => subject.careerId === form?.careerId,
  ) ?? [];
  const candidatePageEnd = detail
    ? detail.duplicateCandidatesOffset + detail.duplicateCandidates.length
    : 0;
  const pendingVisibleCandidates = detail?.duplicateCandidates.filter(
    (candidate) => candidate.decision === "PENDING" && !duplicateChoices[candidate.candidateId],
  ).length ?? 0;

  useEffect(() => {
    if (!dirty) return;

    // Reloading or leaving the site asks for the browser's confirmation.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function attemptClose() {
    if (saving) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  function updateForm<K extends keyof ReviewForm>(key: K, value: ReviewForm[K]) {
    if (form === null) return;
    onFormChange({ ...form, [key]: value });
    setFieldError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form === null || detail === null) return;
    if (!form.careerId || !form.tutorId || !validDate(form.consultationDate)) {
      setFieldError("La carrera, el tutor y una fecha válida son obligatorios.");
      return;
    }
    if (form.classification === "SUBJECT" && !form.subjectId) {
      setFieldError("La materia es obligatoria para esta clasificación.");
      return;
    }
    const unacknowledged = detail.anomalyFlags.filter(
      (anomaly) => !form.acknowledgedAnomalies.includes(anomaly),
    );
    if (unacknowledged.length > 0) {
      setFieldError("Confirmar cada observación antes de guardar.");
      return;
    }
    if (pendingVisibleCandidates > 0) {
      setFieldError("Indicar si cada posible duplicado mostrado es duplicado o no.");
      return;
    }
    setFieldError(null);
    onSave(form, duplicateChoices);
  }

  const rawAndNormalized: { label: string; raw: string | null | undefined; normalized: string | null | undefined }[] = detail
    ? [
        { label: "Carrera", raw: detail.sourceRow.career, normalized: detail.normalized.career },
        { label: "Estudiante", raw: [detail.sourceRow.studentFirstName, detail.sourceRow.studentLastName].filter(Boolean).join(" "), normalized: [detail.normalized.studentFirstName, detail.normalized.studentLastName].filter(Boolean).join(" ") },
        { label: "Fecha", raw: detail.sourceRow.consultationDate, normalized: detail.normalized.consultationDate },
        { label: "Tutor", raw: detail.sourceRow.tutor, normalized: detail.normalized.tutor },
        { label: "Tramo académico", raw: detail.sourceRow.academicStage, normalized: detail.normalized.academicStage },
        { label: "Modalidad", raw: detail.sourceRow.modality, normalized: detail.normalized.modality },
        { label: "Tema", raw: detail.sourceRow.topic, normalized: detail.normalized.topic },
        { label: "Contacto", raw: detail.sourceRow.contact, normalized: detail.normalized.contact },
      ]
    : [];

  return (
    <>
    <Sheet open onOpenChange={(open) => { if (!open) attemptClose(); }}>
      <SheetContent size="wide" showCloseButton={false} className="gap-0 overflow-hidden max-md:rounded-none" onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus(); }} onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }} onPointerDownOutside={(event) => { if (saving) event.preventDefault(); }}>
        <header className="flex items-start justify-between gap-4 border-b border-border bg-card px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <SheetTitle>
              {detail ? `Detalle de ${fullName(detail.normalized.studentFirstName ?? detail.sourceRow.studentFirstName, detail.normalized.studentLastName ?? detail.sourceRow.studentLastName)}` : "Revisión de consulta"}
            </SheetTitle>
            <SheetDescription>Comparar la fila original con los valores normalizados.</SheetDescription>
          </div>
          <Button disabled={saving} aria-label="Cerrar detalle" data-review-close onClick={attemptClose} ref={closeButtonRef} size="icon" type="button" variant="ghost">
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {loading && (
            <div aria-live="polite" className="flex items-center gap-2 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground" role="status">
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />Cargando detalle de la consulta…
            </div>
          )}
          {error && (
            <SystemState variant="error" title={error}
              action={<Button onClick={onRetry} size="sm" type="button" variant="outline">Reintentar</Button>} />
          )}
          {success && <p className="mb-4 rounded-md border border-success/30 bg-muted/60 p-3 text-sm" role="status">{success}</p>}
          {detail && (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={statusLabels[detail.status] ?? detail.status} variant={statusVariant(detail.status)} />
                <span className="text-sm text-muted-foreground">Revisión {detail.reviewVersion}</span>
              </div>

              <section aria-labelledby="source-comparison-heading">
                <h3 className="mb-2 font-semibold text-foreground" id="source-comparison-heading">Valores originales y normalizados</h3>
                <div className="overflow-hidden rounded-md border border-border bg-card">
                  <div className="grid grid-cols-[minmax(5rem,0.55fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground sm:px-4">
                    <span>Campo</span><span>Valor original</span><span>Candidato normalizado</span>
                  </div>
                  {rawAndNormalized.map((field) => (
                    <div className="grid grid-cols-[minmax(5rem,0.55fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border/70 px-3 py-3 text-sm last:border-b-0 sm:px-4" key={field.label}>
                      <strong className="text-foreground">{field.label}</strong>
                      <span className="break-words text-muted-foreground">{field.raw?.trim() || "Sin dato"}</span>
                      <span className="min-w-0 break-words text-foreground">{field.label === "Carrera" && field.normalized ? <ConsultationCareer careers={careers} name={field.normalized} /> : field.normalized?.trim() || "Sin dato"}</span>
                    </div>
                  ))}
                </div>
                {detail.normalized.contact && <p aria-label="Contacto de la persona estudiante" className="mt-2 break-all text-sm text-muted-foreground">Contacto: {detail.normalized.contact}</p>}
              </section>

              <section aria-labelledby="anomalies-heading">
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground" id="anomalies-heading">
                  <AlertTriangle aria-hidden="true" className="h-4 w-4 text-warning" />Observaciones que requieren revisión
                </h3>
                {detail.anomalyFlags.length === 0 ? (
                  <p className="rounded-md border border-success/30 bg-muted/40 p-3 text-sm">No se detectaron observaciones.</p>
                ) : (
                  <ul className="grid gap-2">
                    {detail.anomalyFlags.map((anomaly) => {
                      const resolvedByField = anomalyFieldResolution[anomaly];
                      const checked = form?.acknowledgedAnomalies.includes(anomaly) ?? false;
                      return (
                        <li className="rounded-md border border-warning/30 bg-muted/20 p-3" key={anomaly}>
                          <p className="text-sm text-foreground">{anomalyLabel(anomaly)}</p>
                          {resolvedByField && (
                            <p className="mt-1 text-xs text-muted-foreground">Se resuelve al confirmar el campo correspondiente.</p>
                          )}
                          <div className="mt-3"><FormField inline id={`anomaly-${anomaly}`} label="Confirmo que revisé esta observación">
                            <Checkbox
                              checked={checked}
                              disabled={readOnly || form === null}
                              onCheckedChange={(checked) => {
                                if (!form) return;
                                const next = checked === true
                                  ? [...form.acknowledgedAnomalies, anomaly]
                                  : form.acknowledgedAnomalies.filter((value) => value !== anomaly);
                                updateForm("acknowledgedAnomalies", next);
                              }}
                            />
                          </FormField></div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section aria-labelledby="review-fields-heading">
                <h3 className="mb-3 font-semibold text-foreground" id="review-fields-heading">Decisión de revisión</h3>
                {readOnly ? (
                  <p className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">Este registro ya tiene un estado final. El detalle se muestra en modo de consulta.</p>
                ) : form ? (
                  <form className="grid gap-3" onSubmit={submit}><fieldset disabled={saving} className="grid min-w-0 gap-3">
                    <FormField id="consultation-review-career" label="Carrera"><NativeSelect onChange={(event) => {
                        updateForm("careerId", event.target.value);
                        if (form.subjectId && !detail.references.subjects.some((subject) => subject.id === form.subjectId && subject.careerId === event.target.value)) {
                          onFormChange({ ...form, careerId: event.target.value, subjectId: "" });
                        }
                      }} value={form.careerId}>
                        <NativeSelectOption value="">Seleccionar carrera</NativeSelectOption>
                        {detail.references.careers.map((career) => <NativeSelectOption key={career.id} value={career.id}>{career.name}{career.status === "INACTIVE" ? " · Inactiva" : ""}</NativeSelectOption>)}
                      </NativeSelect>
                    </FormField>
                    <FormField id="consultation-review-tutor" label="Tutor"><NativeSelect onChange={(event) => updateForm("tutorId", event.target.value)} value={form.tutorId}>
                        <NativeSelectOption value="">Seleccionar tutor</NativeSelectOption>
                        {detail.references.tutors.map((tutor) => <NativeSelectOption key={tutor.id} value={tutor.id}>{tutor.name}{tutor.status === "INACTIVE" ? " · Inactivo" : ""}</NativeSelectOption>)}
                      </NativeSelect>
                    </FormField>
                    <FormField id="consultation-review-date" label="Fecha de consulta"><Input onChange={(event) => updateForm("consultationDate", event.target.value)} type="date" value={form.consultationDate} />
                    </FormField>
                    <FormField id="consultation-review-classification" label="Clasificación"><NativeSelect onChange={(event) => updateForm("classification", event.target.value as Classification)} value={form.classification}>
                        <NativeSelectOption value="PENDING_CLASSIFICATION">Pendiente de clasificación</NativeSelectOption>
                        <NativeSelectOption value="SUBJECT">Materia</NativeSelectOption>
                        <NativeSelectOption value="GENERAL">General / Varias</NativeSelectOption>
                      </NativeSelect>
                    </FormField>
                    {form.classification === "SUBJECT" && (
                      <FormField id="consultation-review-subject" label="Materia"><NativeSelect onChange={(event) => updateForm("subjectId", event.target.value)} value={form.subjectId}>
                          <NativeSelectOption value="">Seleccionar materia</NativeSelectOption>
                          {subjects.map((subject) => <NativeSelectOption key={subject.id} value={subject.id}>{subject.name}{subject.status === "INACTIVE" ? " · Inactiva" : ""}</NativeSelectOption>)}
                        </NativeSelect>
                      </FormField>
                    )}
                    {fieldError && <p className="text-sm text-destructive" role="alert">{fieldError}</p>}
                    <Button className="mt-1 w-full sm:w-fit" disabled={saving} type="submit">
                      {saving ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <CheckCircle2 aria-hidden="true" />}
                      {saving ? "Guardando revisión…" : "Guardar revisión"}
                    </Button>
                  </fieldset></form>
                ) : null}
              </section>

              <section aria-labelledby="duplicate-candidates-heading">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-foreground" id="duplicate-candidates-heading">Posibles duplicados ({detail.duplicateCandidateCount})</h3>
                  {detail.duplicateCandidateCount > detail.duplicateCandidatesLimit && (
                    <span className="text-xs text-muted-foreground">Mostrando {detail.duplicateCandidatesOffset + 1}–{candidatePageEnd}</span>
                  )}
                </div>
                {detail.duplicateCandidates.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">No hay posibles duplicados asociados a esta fila.</p>
                ) : (
                  <ul className="grid gap-2">
                    {detail.duplicateCandidates.map((candidate) => {
                      const name = fullName(candidate.peer.studentFirstName, candidate.peer.studentLastName);
                      const choice = duplicateChoices[candidate.candidateId] ?? "";
                      return (
                        <li className="rounded-md border border-border bg-card p-3" key={candidate.candidateId}>
                          <p className="font-medium text-foreground">{name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{formatDate(candidate.peer.consultationDate)} · <ConsultationCareer careers={careers} name={candidate.peer.career} /> · {candidate.peer.tutor ?? "Tutor sin resolver"}</p>
                          {candidate.peer.hasCanonical && <p className="mt-1 text-xs text-muted-foreground">El registro relacionado ya está consolidado.</p>}
                          <FormField id={`duplicate-${candidate.candidateId}`} label={`Decisión para el posible duplicado de ${name}`}>
                            <NativeSelect
                              disabled={readOnly || candidate.decision === "DUPLICATE" && !candidate.isCurrentDuplicate}
                              onChange={(event) => onDuplicateChoice(candidate.candidateId, event.target.value as DuplicateChoice)}
                              value={choice}
                            >
                              <NativeSelectOption value="">Sin decidir</NativeSelectOption>
                              <NativeSelectOption value="DUPLICATE">Confirmar duplicado</NativeSelectOption>
                              <NativeSelectOption value="NOT_DUPLICATE">No es duplicado</NativeSelectOption>
                              {choice === "PEER_DUPLICATE" && <NativeSelectOption value="PEER_DUPLICATE">El otro registro es el duplicado</NativeSelectOption>}
                            </NativeSelect>
                          </FormField>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {detail.duplicateCandidateCount > detail.duplicateCandidatesLimit && (
                  <div className="mt-3 flex justify-between gap-3">
                    <Button disabled={detail.duplicateCandidatesOffset === 0 || loading} onClick={() => onLoadMore(Math.max(0, detail.duplicateCandidatesOffset - detail.duplicateCandidatesLimit))} size="sm" type="button" variant="outline">Anterior</Button>
                    <Button disabled={candidatePageEnd >= detail.duplicateCandidateCount || loading} onClick={() => onLoadMore(candidatePageEnd)} size="sm" type="button" variant="outline">Siguientes duplicados</Button>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
        <footer className="flex justify-end border-t border-border bg-card px-4 py-3 sm:px-6">
          <Button disabled={saving} onClick={attemptClose} type="button" variant="outline">Cerrar</Button>
        </footer>
      </SheetContent>
    </Sheet>
    <ConfirmationDialog
      open={confirmDiscard}
      onOpenChange={setConfirmDiscard}
      title="¿Cerrar el detalle?"
      description="Hay cambios sin guardar en la revisión."
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (closeButtonRef.current?.isConnected) closeButtonRef.current.focus();
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
