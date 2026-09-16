import type { Metadata } from "next";

import { goldenScreenFixtures } from "@/features/golden-screens/fixtures";
import { SchedulesScreen } from "@/features/schedules/schedules-screen";

export const metadata: Metadata = {
  title: "Horarios | SGTA",
  description: goldenScreenFixtures.schedules.description,
};

export default function AdminHorariosPage() {
  return (
    <SchedulesScreen fixture={goldenScreenFixtures.schedules} />
  );
}
