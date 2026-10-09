import { Badge, type BadgeProps } from "@/components/ui/badge";
import { getCareerAbbreviation } from "@/shared/career-abbreviation";
import type { CareerColor } from "@/shared/career-color";

const careerBadgeVariants: Record<CareerColor, BadgeProps["variant"]> = {
  BLUE: "career-blue",
  EMERALD: "career-emerald",
  VIOLET: "career-violet",
  YELLOW: "career-yellow",
  CYAN: "career-cyan",
  MAGENTA: "career-magenta",
  LIME: "career-lime",
  GRAPHITE: "career-graphite",
};

export function CareerBadge({ name, color, size = "md" }: {
  name: string;
  color: CareerColor;
  size?: "sm" | "md";
}) {
  return (
    <Badge role="img" aria-label={name} title={name} variant={careerBadgeVariants[color]} size={size}>
      {getCareerAbbreviation(name)}
    </Badge>
  );
}
