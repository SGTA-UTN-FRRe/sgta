import { toast } from "sonner";

import type { SafeScheduleWorkspace } from "./schedule-service";

export const pageTitleId = "schedules-page-title";

export function getInitialPlanId(workspace: SafeScheduleWorkspace | null) {
  return workspace?.selectedPlan?.status === "ACTIVE"
    ? workspace.selectedPlan.id
    : workspace?.plans.find((plan) => plan.status === "ACTIVE")?.id ?? "";
}

export function notifySaved(description: string) {
  toast.success("Cambios guardados", { description });
}

/** Returns focus to an overlay's trigger, or to the page title when the trigger is gone. */
export function returnFocus(event: Event, trigger: HTMLElement | null) {
  event.preventDefault();

  if (trigger?.isConnected && !trigger.matches(":disabled")) {
    trigger.focus();
  } else {
    document.getElementById(pageTitleId)?.focus();
  }
}

export function findVisible(selector: string) {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

  return elements.find((element) => element.getClientRects().length > 0) ?? elements[0];
}
