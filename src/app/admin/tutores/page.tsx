import type { Metadata } from "next";

import { goldenScreenFixtures } from "@/features/golden-screens/fixtures";
import { TutorsScreen } from "@/features/tutors/tutors-screen";

export const metadata: Metadata = {
  title: "Tutores | SGTA",
  description: goldenScreenFixtures.tutors.description,
};

export default function AdminTutoresPage() {
  return <TutorsScreen fixture={goldenScreenFixtures.tutors} />;
}
