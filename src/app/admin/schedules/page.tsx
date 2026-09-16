import type { Metadata } from "next";

import { schedulesScreenData } from "@/mocks/schedules.mock";
import { SchedulesScreen } from "@/features/schedules/schedules-screen";

export const metadata: Metadata = {
  title: "Horarios | SGTA",
  description: schedulesScreenData.description,
};

export default function AdminSchedulesPage() {
  return (
    <SchedulesScreen data={schedulesScreenData} />
  );
}
