import { redirect } from "next/navigation";

import {
  AuthorizationUnavailableError,
  getAuthorizedUser,
} from "@/auth/authorization";

export default async function Home() {
  let user;

  try {
    user = await getAuthorizedUser({ allowUnconfigured: true });
  } catch (error) {
    if (!(error instanceof AuthorizationUnavailableError)) {
      throw error;
    }

    redirect("/login?error=authorization_unavailable");
  }

  if (user !== null) {
    redirect(user.role === "ADMIN" ? "/admin" : "/tutor");
  }

  redirect("/login");
}
