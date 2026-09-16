import type { SVGProps } from "react";

export function FaroIcon({
  className = "h-6 w-6",
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden ?? (ariaLabel ? undefined : true)}
      {...props}
    >
      {/* Cupula y linterna */}
      <circle cx="16" cy="3.5" r="1" fill="currentColor" />
      <path
        d="M12.5 8.5C12.5 6.5 14 5 16 5C18 5 19.5 6.5 19.5 8.5H12.5Z"
        fill="currentColor"
      />
      {/* Rejilla de linterna */}
      <path
        d="M13.5 8.5V13.5M16 8.5V13.5M18.5 8.5V13.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Haces de luz horizontales */}
      <path
        d="M6.5 11H11M21 11H25.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Silueta exterior / Escudo */}
      <path
        d="M7.5 13V21C7.5 26 11 29 16 29C21 29 24.5 26 24.5 21V13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Franjas del faro */}
      <path
        d="M13.4 14L12.6 19H19.4L18.6 14H13.4Z"
        fill="currentColor"
      />
      <path
        d="M12.2 22L11.2 27.5H20.8L19.8 22H12.2Z"
        fill="currentColor"
      />
    </svg>
  );
}
