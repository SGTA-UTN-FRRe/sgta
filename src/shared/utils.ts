import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Custom utilities from globals.css that tailwind-merge cannot infer.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "bg-image": ["bg-hatch"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
