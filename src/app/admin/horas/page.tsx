import type { Metadata } from "next";

import { goldenScreenFixtures } from "@/features/golden-screens/fixtures";
import { HoursScreen } from "@/features/hours/hours-screen";

export const metadata: Metadata = {
  title: "Horas | SGTA",
  description: goldenScreenFixtures.hours.description,
};

export default function AdminHorasPage() {
  return (
    <HoursScreen fixture={goldenScreenFixtures.hours} />
  );
}
