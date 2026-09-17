import { getDatabase } from "@/db/client";
import {
  getCurrentAdministrativeCycle,
  listAdministrativeCycles,
} from "@/features/cycles/cycle-service";
import { SettingsScreen } from "@/features/settings/settings-screen";

export default async function AdminSettingsPage() {
  const database = getDatabase();
  const [currentCycle, cycles] = await Promise.all([
    getCurrentAdministrativeCycle(database),
    listAdministrativeCycles(database),
  ]);

  return <SettingsScreen currentCycle={currentCycle} cycles={cycles} />;
}
