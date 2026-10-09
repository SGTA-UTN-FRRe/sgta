"use client";

import type { ReactNode } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface ConfirmationDialogProps {
  title: string;
  description: string;
  summary?: ReactNode;
  trigger?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The owner closes the controlled dialog after a successful operation. */
  onConfirm: () => void;
  confirmLabel?: string;
  pending?: boolean;
  destructive?: boolean;
}

export function ConfirmationDialog({
  title, description, summary, trigger, open, onOpenChange, onConfirm,
  confirmLabel = "Confirmar", pending = false, destructive = false,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent
        className="max-md:inset-y-0 max-md:left-0 max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:flex max-md:flex-col"
        aria-busy={pending}
        onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {summary && <div className="border-y border-border py-3 text-sm">{summary}</div>}
        <AlertDialogFooter className="max-md:mt-auto">
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            variant={destructive ? "destructive" : "default"}
            onClick={(event) => {
              event.preventDefault();
              if (!pending) onConfirm();
            }}
          >
            {pending ? "Confirmando…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
