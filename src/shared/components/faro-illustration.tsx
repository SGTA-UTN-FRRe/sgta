import type { SVGProps } from "react";

import { cn } from "@/shared/utils";

export interface FaroIllustrationProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Ilustración geométrica minimalista del Faro institucional para estados vacíos y superficies de orientación.
 * Utiliza exclusivamente acentos de Midnight Navy (#0B172E) y Faro Amber (#F59E0B).
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
      {/* Fondo circular tenue con acento ámbar */}
      <circle cx="48" cy="48" r="44" className="fill-[#F59E0B]/5 stroke-[#F59E0B]/15" strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Rayos geométricos de luz del faro */}
      <path
        d="M48 27L18 19M48 31L16 35"
        stroke="#F59E0B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
      <path
        d="M48 27L78 19M48 31L80 35"
        stroke="#F59E0B"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />

      {/* Cúpula superior y linterna */}
      <circle cx="48" cy="19" r="2.5" fill="#F59E0B" />
      <path
        d="M42 27C42 23.5 44.5 21 48 21C51.5 21 54 23.5 54 27H42Z"
        fill="#F59E0B"
      />

      {/* Estructura de la cabina de luz */}
      <rect
        x="42"
        y="27"
        width="12"
        height="8"
        rx="1"
        stroke="#0B172E"
        strokeWidth="2"
        className="stroke-[#0B172E] dark:stroke-[#F8FAFC]"
        fill="#FFFBEB"
      />
      <line
        x1="48"
        y1="27"
        x2="48"
        y2="35"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Balcón del faro */}
      <line
        x1="38"
        y1="35"
        x2="58"
        y2="35"
        stroke="#0B172E"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-[#0B172E] dark:stroke-[#F8FAFC]"
      />

      {/* Cuerpo principal del faro (torre cónica) */}
      <path
        d="M43 35L38 72H58L53 35H43Z"
        fill="#FFFFFF"
        stroke="#0B172E"
        strokeWidth="2"
        strokeLinejoin="round"
        className="stroke-[#0B172E] dark:stroke-[#F8FAFC]"
      />

      {/* Franja central distintiva en Faro Amber */}
      <path
        d="M41 48L39.5 58H56.5L55 48H41Z"
        fill="#F59E0B"
        stroke="#F59E0B"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Ventana de la torre */}
      <rect
        x="46.5"
        y="62"
        width="3"
        height="5"
        rx="1.5"
        fill="#0B172E"
        className="fill-[#0B172E] dark:fill-[#F8FAFC]"
      />

      {/* Base / Plataforma inferior */}
      <path
        d="M32 72H64"
        stroke="#0B172E"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-[#0B172E] dark:stroke-[#F8FAFC]"
      />
      <path
        d="M26 77H70"
        stroke="#0B172E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.4"
        className="stroke-[#0B172E] dark:stroke-[#F8FAFC]"
      />
    </svg>
  );
}

