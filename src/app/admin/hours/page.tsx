import type { Metadata } from "next";

import { hoursScreenData } from "@/mocks/hours.mock";
import { HoursScreen } from "@/features/hours/hours-screen";

export const metadata: Metadata = {
  title: "Horas | SGTA",
  description: hoursScreenData.description,
};

export default function AdminHoursPage() {
  return (
    <HoursScreen data={hoursScreenData} />
  );
}
