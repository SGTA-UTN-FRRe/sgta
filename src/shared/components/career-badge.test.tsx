import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CAREER_COLORS } from "@/shared/career-color";
import { CareerBadge } from "./career-badge";

describe("CareerBadge", () => {
  it.each(CAREER_COLORS)("pairs %s with its foreground, abbreviation and full accessible name", (color) => {
    render(<CareerBadge name="Ingeniería en Sistemas de Información" color={color} />);
    const badge = screen.getByRole("img", { name: "Ingeniería en Sistemas de Información" });
    expect(badge).toHaveTextContent("ISI");
    expect(badge).toHaveAttribute("title", "Ingeniería en Sistemas de Información");
    expect(badge).toHaveClass(`bg-career-${color.toLowerCase()}`, `text-career-${color.toLowerCase()}-foreground`);
  });
  it("supports compact badges without changing their meaning", () => {
    render(<CareerBadge name="Ingeniería Industrial" color="YELLOW" size="sm" />);
    expect(screen.getByRole("img", { name: "Ingeniería Industrial" })).toHaveClass("text-xs");
  });
});
