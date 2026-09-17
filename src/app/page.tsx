import { redirect } from "next/navigation";

import { getAuthorizedUser } from "@/auth/authorization";

export default async function Home() {
  const user = await getAuthorizedUser({ allowUnconfigured: true });

  if (user !== null) {
    redirect(user.role === "ADMIN" ? "/admin" : "/tutor");
  }

  redirect("/login");
}
