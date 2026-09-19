import { getDatabase } from "@/db/client";
import {
  getCurrentAdministrativeCycle,
  listAdministrativeCycles,
  type SafeAdministrativeCycle,
} from "@/features/cycles/cycle-service";
import {
  listHourCategories,
  type SafeHourCategory,
} from "@/features/hours/hour-service";
import {
  listCareers,
  listScholarshipReferences,
  listSubjects,
  type SafeCareer,
  type SafeScholarshipReference,
  type SafeSubject,
} from "@/features/tutors/tutor-service";
import { SettingsScreen } from "@/features/settings/settings-screen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emptySettings: {
  currentCycle: SafeAdministrativeCycle | null;
  cycles: SafeAdministrativeCycle[];
  careers: SafeCareer[];
  subjects: SafeSubject[];
  scholarshipReferences: SafeScholarshipReference[];
  hourCategories: SafeHourCategory[];
} = {
  currentCycle: null,
  cycles: [],
  careers: [],
  subjects: [],
  scholarshipReferences: [],
  hourCategories: [],
};

export default async function AdminSettingsPage() {
  let settings = emptySettings;
  let initialErrorMessage: string | undefined;

  try {
    const database = getDatabase();
    const [
      currentCycle,
      cycles,
      careers,
      subjects,
      scholarshipReferences,
      hourCategories,
    ] = await Promise.all([
      getCurrentAdministrativeCycle(database),
      listAdministrativeCycles(database),
      listCareers(database, "ALL"),
      listSubjects(database, "ALL"),
      listScholarshipReferences(database, "ALL"),
      listHourCategories(database, "ALL"),
    ]);

    settings = {
      currentCycle,
      cycles,
      careers,
      subjects,
      scholarshipReferences,
      hourCategories,
    };
  } catch {
    initialErrorMessage =
      "No se pudo cargar la configuración. Reintentar para volver a consultar los datos.";
  }

  return (
    <SettingsScreen
      careers={settings.careers}
      currentCycle={settings.currentCycle}
      cycles={settings.cycles}
      initialErrorMessage={initialErrorMessage}
      initialState={initialErrorMessage === undefined ? undefined : "error"}
      hourCategories={settings.hourCategories}
      scholarshipReferences={settings.scholarshipReferences}
      subjects={settings.subjects}
    />
  );
}
