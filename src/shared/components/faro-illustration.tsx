import type { SVGProps } from "react";

import { cn } from "@/shared/utils";

export interface FaroIllustrationProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Ilustracion geometrica minimalista del Faro para estados vacios y superficies
 * de orientacion. Sus colores se consumen desde los tokens de SGTA.
 */
export function FaroIllustration({ className, ...props }: FaroIllustrationProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-24 w-24", className)}
      aria-hidden="true"
      data-testid="faro-illustration"
      {...props}
    >
      <circle
        cx="48"
        cy="48"
        r="44"
        className="fill-accent/5 stroke-accent/20"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />

      <path
        d="M48 27L18 19M48 31L16 35M48 27L78 19M48 31L80 35"
        className="stroke-accent"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />

      <circle cx="48" cy="19" r="2.5" className="fill-accent" />
      <path
        d="M42 27C42 23.5 44.5 21 48 21C51.5 21 54 23.5 54 27H42Z"
        className="fill-accent"
      />

      <rect
        x="42"
        y="27"
        width="12"
        height="8"
        rx="1"
        className="fill-surface-warm stroke-brand-navy"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="48"
        y1="27"
        x2="48"
        y2="35"
        className="stroke-accent"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <line
        x1="38"
        y1="35"
        x2="58"
        y2="35"
        className="stroke-brand-navy"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M43 35L38 72H58L53 35H43Z"
        className="fill-surface stroke-brand-navy"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M41 48L39.5 58H56.5L55 48H41Z"
        className="fill-accent stroke-accent"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      <rect
        x="46.5"
        y="62"
        width="3"
        height="5"
        rx="1.5"
        className="fill-brand-navy"
      />

      <path
        d="M32 72H64"
        className="stroke-brand-navy"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M26 77H70"
        className="stroke-brand-navy"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
    </svg>
  );
}
