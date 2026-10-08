export const CAREER_COLORS = [
  "BLUE", "EMERALD", "VIOLET", "YELLOW", "CYAN", "MAGENTA", "LIME", "GRAPHITE",
] as const;

export type CareerColor = (typeof CAREER_COLORS)[number];

export const CAREER_COLOR_LABELS: Record<CareerColor, string> = {
  BLUE: "Azul", EMERALD: "Esmeralda", VIOLET: "Violeta", YELLOW: "Amarillo",
  CYAN: "Cian", MAGENTA: "Magenta", LIME: "Lima", GRAPHITE: "Grafito",
};

export function getLeastUsedCareerColor(colors: readonly CareerColor[]): CareerColor {
  const counts = new Map(CAREER_COLORS.map((color) => [color, 0]));
  for (const color of colors) counts.set(color, counts.get(color)! + 1);
  return CAREER_COLORS.reduce((least, color) =>
    counts.get(color)! < counts.get(least)! ? color : least,
  );
}
