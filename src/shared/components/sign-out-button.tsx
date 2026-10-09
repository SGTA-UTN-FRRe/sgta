"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";

import { authClient } from "@/auth/auth-client";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/shared/utils";

export const SIGN_OUT_ERROR_MESSAGE = "No se pudo cerrar la sesión. Intentar nuevamente.";

/** Ends the session, then returns to `/login`; failures keep the user on the page. */
export function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = pending ? "Cerrando sesión…" : "Cerrar sesión";

  async function signOut() {
    if (pending) return;

    setPending(true);
    setFailed(false);

    try {
      const result = await authClient.signOut();
      if (result.error) {
        setFailed(true);
        setPending(false);
        return;
      }
    } catch {
      setFailed(true);
      setPending(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return { pending, failed, label, signOut };
}

export function SignOutIcon({ pending }: { pending: boolean }) {
  return pending ? (
    <LoaderCircle className="animate-spin" aria-hidden="true" />
  ) : (
    <LogOut aria-hidden="true" />
  );
}

interface SignOutButtonProps {
  variant?: ButtonProps["variant"];
  className?: string;
  labelClassName?: string;
  errorClassName?: string;
}

export function SignOutButton({
  variant = "ghost",
  className,
  labelClassName,
  errorClassName,
}: SignOutButtonProps) {
  const { pending, failed, label, signOut } = useSignOut();

  return (
    <div className="relative min-w-0">
      <Button
        type="button"
        variant={variant}
        className={cn("h-auto min-h-11", className)}
        aria-label={label}
        aria-busy={pending}
        title={label}
        disabled={pending}
        onClick={() => void signOut()}
      >
        <SignOutIcon pending={pending} />
        <span className={cn("truncate", labelClassName)}>{label}</span>
      </Button>
      {failed && (
        <p
          role="alert"
          className={cn("mt-2 wrap-break-word text-sm text-destructive", errorClassName)}
        >
          {SIGN_OUT_ERROR_MESSAGE}
        </p>
      )}
    </div>
  );
}
