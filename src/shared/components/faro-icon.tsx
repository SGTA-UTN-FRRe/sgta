import type { SVGProps } from "react";
import { TutoriasMark } from "./tutorias-mark";

/**
 * @deprecated Use TutoriasMark instead. This alias is maintained for backwards compatibility.
 */
export function FaroIcon(props: SVGProps<SVGSVGElement>) {
  return <TutoriasMark {...props} />;
}
