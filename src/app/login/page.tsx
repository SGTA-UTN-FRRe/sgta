import type { Metadata } from "next";

import { loginScreenData } from "@/mocks/login.mock";

import { loginStateFromAuthErrorCode } from "./login-auth";
import { LoginScreen } from "./login-screen";

export const metadata: Metadata = {
  title: "Acceso | SGTA",
  description: "Acceso para usuarios habilitados de Tutorías UTN FRRe.",
};

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps = {}) {
  const params = await searchParams;
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;

  return (
    <LoginScreen
      data={loginScreenData}
      state={loginStateFromAuthErrorCode(error)}
    />
  );
}
