import type { Metadata } from "next";

import { tutorsScreenData } from "@/mocks/tutors.mock";
import { TutorsScreen } from "@/features/tutors/tutors-screen";

export const metadata: Metadata = {
  title: "Tutores | SGTA",
  description: tutorsScreenData.description,
};

export default function AdminTutorsPage() {
  return <TutorsScreen data={tutorsScreenData} />;
}
