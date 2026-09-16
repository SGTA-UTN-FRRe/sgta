import type { Metadata } from "next";

import { goldenScreenFixtures } from "@/features/golden-screens/fixtures";

import { LoginScreen } from "./login-screen";

export const metadata: Metadata = {
  title: "Acceso | SGTA",
  description: "Acceso para usuarios habilitados de Tutorías UTN FRRe.",
};

export default function LoginPage() {
  return <LoginScreen fixture={goldenScreenFixtures.login} />;
}
