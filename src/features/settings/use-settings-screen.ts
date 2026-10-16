import type { FormEvent } from "react";
import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";
import type { SafeHourCategory } from "@/features/hours/hour-service";
import type { SafeCareer, SafeScholarshipReference, SafeSubject } from "@/features/tutors/tutor-service";

import { useRef, useState } from "react";
import {
  type SettingsScreenProps,
  SettingsState,
  Feedback,
  CycleForm,
  CareerForm,
  SubjectForm,
  ScholarshipForm,
  HourCategoryForm,
  EMPTY_CYCLE_FORM,
  EMPTY_CAREER_FORM,
  EMPTY_SUBJECT_FORM,
  EMPTY_SCHOLARSHIP_FORM,
  EMPTY_HOUR_CATEGORY_FORM,
  SettingsRequestError,
  requestJson,
  getFeedbackMessage,
  loadSettings,
  sortByName,
  sortSubjects,
  sortScholarshipReferences,
  upsertById,
} from "./settings-screen-utils";

export function useSettingsScreen({
  careers: initialCareers = [],
  currentCycle: initialCurrentCycle,
  cycles: initialCycles,
  initialErrorMessage,
  initialState,
  hourCategories: initialHourCategories = [],
  scholarshipReferences: initialScholarshipReferences = [],
  subjects: initialSubjects = [],
}: SettingsScreenProps) {
  const [currentCycle, setCurrentCycle] = useState(initialCurrentCycle);
  const [cycles, setCycles] = useState(initialCycles);
  const [careers, setCareers] = useState(sortByName(initialCareers));
  const [subjects, setSubjects] = useState(sortSubjects(initialSubjects));
  const [scholarshipReferences, setScholarshipReferences] = useState(
    sortScholarshipReferences(initialScholarshipReferences),
  );
  const [hourCategories, setHourCategories] = useState(
    sortByName(initialHourCategories),
  );
  const [cycleForm, setCycleForm] = useState<CycleForm>(EMPTY_CYCLE_FORM);
  const [careerForm, setCareerForm] = useState<CareerForm>(EMPTY_CAREER_FORM);
  const [subjectForm, setSubjectForm] = useState<SubjectForm>(EMPTY_SUBJECT_FORM);
  const [scholarshipForm, setScholarshipForm] = useState<ScholarshipForm>(
    EMPTY_SCHOLARSHIP_FORM,
  );
  const [hourCategoryForm, setHourCategoryForm] = useState<HourCategoryForm>(
    EMPTY_HOUR_CATEGORY_FORM,
  );
  const [state, setState] = useState<SettingsState>(initialState ?? "default");
  const [feedback, setFeedback] = useState<Feedback | null>(
    initialErrorMessage === undefined
      ? null
      : { kind: "error", message: initialErrorMessage },
  );
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);
  const closeCycleTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeCycleHistoryRef = useRef<HTMLElement | null>(null);

  const isLoading = state === "loading";
  const screenState =
    currentCycle === null && state === "default" ? "required-action" : state;

  const updateStateForEditing = () => {
    setState("default");
    setFeedback(null);
  };

  const runSettingsAction = async <T,>(
    action: () => Promise<T>,
    successMessage: string,
    onSuccess: (value: T) => void,
  ): Promise<boolean> => {
    setState("loading");
    setFeedback(null);

    try {
      const value = await action();
      onSuccess(value);
      setState("success");
      setFeedback({ kind: "success", message: successMessage });
      return true;
    } catch (error) {
      setState("error");
      setFeedback({ kind: "error", message: getFeedbackMessage(error) });
      return false;
    }
  };

  const refreshSettings = async () => {
    setState("loading");
    setFeedback(null);

    try {
      const next = await loadSettings();
      setCurrentCycle(next.currentCycle);
      setCycles(next.cycles);
      setCareers(sortByName(next.careers));
      setSubjects(sortSubjects(next.subjects));
      setScholarshipReferences(sortScholarshipReferences(next.scholarshipReferences));
      setHourCategories(sortByName(next.hourCategories));
      setState("default");
    } catch (error) {
      setState("error");
      setFeedback({ kind: "error", message: getFeedbackMessage(error) });
    }
  };

  const handleCreateCycle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runSettingsAction(
      async () => {
        const response = await requestJson<{ cycle?: SafeAdministrativeCycle; }>(
          "/api/admin/cycles",
          { method: "POST", body: JSON.stringify(cycleForm) },
        );

        if (response.cycle === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.cycle;
      },
      "El ciclo se creó correctamente.",
      (cycle) => {
        setCurrentCycle(cycle);
        setCycles((previous) => [
          cycle,
          ...previous.filter((previousCycle) => previousCycle.id !== cycle.id),
        ]);
        setCycleForm(EMPTY_CYCLE_FORM);
      },
    );
  };

  const handleCloseCycle = async () => {
    if (currentCycle === null) {
      return;
    }

    await runSettingsAction(
      async () => {
        const response = await requestJson<{ cycle?: SafeAdministrativeCycle; }>(
          `/api/admin/cycles/${encodeURIComponent(currentCycle.id)}/close`,
          { method: "POST" },
        );

        if (response.cycle === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.cycle;
      },
      "El ciclo se cerró correctamente. El historial se conserva.",
      (cycle) => {
        setCurrentCycle(null);
        setCycles((previous) =>
          previous.map((previousCycle) =>
            previousCycle.id === cycle.id ? cycle : previousCycle,
          ),
        );
        setCloseConfirmationOpen(false);
      },
    );
  };

  const handleCareerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const careerId = careerForm.id;
    const endpoint =
      careerId === null
        ? "/api/admin/settings/careers"
        : `/api/admin/settings/careers/${encodeURIComponent(careerId)}`;

    await runSettingsAction(
      async () => {
        const response = await requestJson<{ career?: SafeCareer; }>(endpoint, {
          body: JSON.stringify({ name: careerForm.name, color: careerForm.color }),
          method: careerId === null ? "POST" : "PATCH",
        });

        if (response.career === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.career;
      },
      careerId === null
        ? "La carrera se creó correctamente."
        : "La carrera se actualizó correctamente.",
      (career) => {
        setCareers((previous) => sortByName(upsertById(previous, career)));
        setCareerForm(EMPTY_CAREER_FORM);
      },
    );
  };

  const handleCareerStatusChange = async (career: SafeCareer) => {
    await runSettingsAction(
      async () => {
        const response = await requestJson<{ career?: SafeCareer; }>(
          `/api/admin/settings/careers/${encodeURIComponent(career.id)}/status`,
          {
            body: JSON.stringify({
              status: career.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            }),
            method: "PATCH",
          },
        );

        if (response.career === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.career;
      },
      career.status === "ACTIVE"
        ? "La carrera se inactivó y se conservaron sus relaciones."
        : "La carrera se activó correctamente.",
      (nextCareer) => {
        setCareers((previous) => sortByName(upsertById(previous, nextCareer)));
      },
    );
  };

  const handleSubjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subjectId = subjectForm.id;
    const existingSubject =
      subjectId === null
        ? undefined
        : subjects.find((subject) => subject.id === subjectId);
    const endpoint =
      subjectId === null
        ? "/api/admin/settings/subjects"
        : `/api/admin/settings/subjects/${encodeURIComponent(subjectId)}`;
    const body =
      subjectId !== null &&
        existingSubject !== undefined &&
        existingSubject.careerId === subjectForm.careerId
        ? { name: subjectForm.name }
        : { careerId: subjectForm.careerId, name: subjectForm.name };

    await runSettingsAction(
      async () => {
        const response = await requestJson<{ subject?: SafeSubject; }>(endpoint, {
          body: JSON.stringify(body),
          method: subjectId === null ? "POST" : "PATCH",
        });

        if (response.subject === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.subject;
      },
      subjectId === null
        ? "La materia se creó correctamente."
        : "La materia se actualizó correctamente.",
      (subject) => {
        setSubjects((previous) => sortSubjects(upsertById(previous, subject)));
        setSubjectForm(EMPTY_SUBJECT_FORM);
      },
    );
  };

  const handleSubjectStatusChange = async (subject: SafeSubject) => {
    await runSettingsAction(
      async () => {
        const response = await requestJson<{ subject?: SafeSubject; }>(
          `/api/admin/settings/subjects/${encodeURIComponent(subject.id)}/status`,
          {
            body: JSON.stringify({
              status: subject.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            }),
            method: "PATCH",
          },
        );

        if (response.subject === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.subject;
      },
      subject.status === "ACTIVE"
        ? "La materia se inactivó y se conservaron sus relaciones."
        : "La materia se activó correctamente.",
      (nextSubject) => {
        setSubjects((previous) => sortSubjects(upsertById(previous, nextSubject)));
      },
    );
  };

  const handleScholarshipSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hoursValue = scholarshipForm.knownRequiredHours.trim();

    if (
      hoursValue !== "" &&
      (!Number.isInteger(Number(hoursValue)) || Number(hoursValue) < 0)
    ) {
      setState("error");
      setFeedback({
        kind: "error",
        message: "Las horas requeridas deben ser un número entero no negativo.",
      });
      return;
    }

    const referenceId = scholarshipForm.id;
    const endpoint =
      referenceId === null
        ? "/api/admin/settings/scholarship-references"
        : `/api/admin/settings/scholarship-references/${encodeURIComponent(referenceId)}`;
    const body = {
      knownRequiredHours: hoursValue === "" ? null : Number(hoursValue),
      notes: scholarshipForm.notes.trim() === "" ? null : scholarshipForm.notes,
      type: scholarshipForm.type,
    };

    await runSettingsAction(
      async () => {
        const response = await requestJson<{
          scholarshipReference?: SafeScholarshipReference;
        }>(endpoint, {
          body: JSON.stringify(body),
          method: referenceId === null ? "POST" : "PATCH",
        });

        if (response.scholarshipReference === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.scholarshipReference;
      },
      referenceId === null
        ? "La referencia de beca se creó correctamente."
        : "La referencia de beca se actualizó correctamente.",
      (reference) => {
        setScholarshipReferences((previous) =>
          sortScholarshipReferences(upsertById(previous, reference)),
        );
        setScholarshipForm(EMPTY_SCHOLARSHIP_FORM);
      },
    );
  };

  const handleScholarshipStatusChange = async (
    reference: SafeScholarshipReference,
  ) => {
    await runSettingsAction(
      async () => {
        const response = await requestJson<{
          scholarshipReference?: SafeScholarshipReference;
        }>(
          `/api/admin/settings/scholarship-references/${encodeURIComponent(reference.id)}/status`,
          {
            body: JSON.stringify({
              status: reference.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            }),
            method: "PATCH",
          },
        );

        if (response.scholarshipReference === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.scholarshipReference;
      },
      reference.status === "ACTIVE"
        ? "La referencia de beca se inactivó y se conservaron sus relaciones."
        : "La referencia de beca se activó correctamente.",
      (nextReference) => {
        setScholarshipReferences((previous) =>
          sortScholarshipReferences(upsertById(previous, nextReference)),
        );
      },
    );
  };

  const handleHourCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const categoryId = hourCategoryForm.id;
    const endpoint =
      categoryId === null
        ? "/api/admin/settings/hour-categories"
        : `/api/admin/settings/hour-categories/${encodeURIComponent(categoryId)}`;
    const body = {
      activityKind:
        hourCategoryForm.activityKind === ""
          ? null
          : hourCategoryForm.activityKind,
      name: hourCategoryForm.name,
    };

    const completed = await runSettingsAction(
      async () => {
        const response = await requestJson<{ category?: SafeHourCategory; }>(
          endpoint,
          {
            body: JSON.stringify(body),
            method: categoryId === null ? "POST" : "PATCH",
          },
        );

        if (response.category === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.category;
      },
      categoryId === null
        ? "La categoría de horas se creó correctamente."
        : "La categoría de horas se actualizó correctamente.",
      (category) => {
        setHourCategories((previous) => sortByName(upsertById(previous, category)));
        setHourCategoryForm(EMPTY_HOUR_CATEGORY_FORM);
      },
    );

    if (!completed) {
      window.setTimeout(() => {
        document.getElementById("hour-category-name")?.focus();
      }, 0);
    }
  };

  const handleHourCategoryStatusChange = async (category: SafeHourCategory) => {
    await runSettingsAction(
      async () => {
        const response = await requestJson<{ category?: SafeHourCategory; }>(
          `/api/admin/settings/hour-categories/${encodeURIComponent(category.id)}/status`,
          {
            body: JSON.stringify({
              status: category.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            }),
            method: "PATCH",
          },
        );

        if (response.category === undefined) {
          throw new SettingsRequestError("internal_server_error");
        }

        return response.category;
      },
      category.status === "ACTIVE"
        ? "La categoría de horas se inactivó y se conservaron sus movimientos."
        : "La categoría de horas se activó correctamente.",
      (nextCategory) => {
        setHourCategories((previous) =>
          sortByName(upsertById(previous, nextCategory)),
        );
      },
    );
  };

  return {
    closeCycleTriggerRef,
    closeCycleHistoryRef,
    isLoading,
    screenState,
    updateStateForEditing,
    refreshSettings,
    handleCreateCycle,
    handleCloseCycle,
    handleCareerSubmit,
    handleCareerStatusChange,
    handleSubjectSubmit,
    handleSubjectStatusChange,
    handleScholarshipSubmit,
    handleScholarshipStatusChange,
    handleHourCategorySubmit,
    handleHourCategoryStatusChange,
    currentCycle,
    cycles,
    careers,
    subjects,
    scholarshipReferences,
    hourCategories,
    cycleForm,
    setCycleForm,
    careerForm,
    setCareerForm,
    subjectForm,
    setSubjectForm,
    scholarshipForm,
    setScholarshipForm,
    hourCategoryForm,
    setHourCategoryForm,
    state,
    feedback,
    closeConfirmationOpen,
    setCloseConfirmationOpen,
  };
}
