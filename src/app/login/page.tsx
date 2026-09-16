import type { Metadata } from "next";

import { loginScreenData } from "@/mocks/login.mock";

import { LoginScreen } from "./login-screen";

export const metadata: Metadata = {
  title: "Acceso | SGTA",
  description: "Acceso para usuarios habilitados de Tutorías UTN FRRe.",
};

export default function LoginPage() {
  return <LoginScreen data={loginScreenData} />;
}
