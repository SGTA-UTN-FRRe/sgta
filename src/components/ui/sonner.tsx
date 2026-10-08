"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { buttonVariants } from "./button";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group z-toast"
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: "Cerrar notificación",
        classNames: {
          toast:
            "flex w-full flex-wrap items-center gap-3 rounded-xl border border-border bg-popover p-4 pr-14 font-sans text-sm text-popover-foreground shadow-lg duration-200! motion-reduce:duration-0!",
          title: "font-semibold",
          description: "text-xs text-muted-foreground",
          actionButton: buttonVariants({ size: "sm" }),
          cancelButton: buttonVariants({ variant: "secondary", size: "sm" }),
          closeButton:
            "absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full text-popover-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-info" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-xl)",
          zIndex: "var(--layer-toast)",
        } as React.CSSProperties
      }
      {...props}
      theme="light"
      richColors={false}
      containerAriaLabel="Notificaciones"
      closeButton
    />
  );
};

export { Toaster };
