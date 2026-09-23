import { redirect } from "next/navigation";
import type { Metadata } from "next";

import {
  AuthorizationUnavailableError,
  getAuthorizedUser,
} from "@/auth/authorization";
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
  let error = Array.isArray(params?.error) ? params.error[0] : params?.error;

  if (error !== "authorization_unavailable") {
    try {
      const user = await getAuthorizedUser({ allowUnconfigured: true });

      if (user !== null) {
        redirect(user.role === "ADMIN" ? "/admin" : "/tutor");
      }
    } catch (caught) {
      if (!(caught instanceof AuthorizationUnavailableError)) {
        throw caught;
      }

      error = "authorization_unavailable";
    }
  }

  return (
    <LoginScreen
      data={loginScreenData}
      state={loginStateFromAuthErrorCode(error)}
    />
  );
}
