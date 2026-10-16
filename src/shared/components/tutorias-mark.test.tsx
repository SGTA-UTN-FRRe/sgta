import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TutoriasMark } from "./tutorias-mark";

describe("TutoriasMark", () => {
  it("renders with default accessible attributes and classes", () => {
    const { container } = render(<TutoriasMark />);
    const svg = container.querySelector("svg");

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 328 505");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("h-6", "w-6");
    expect(svg).toHaveAttribute("fill", "currentColor");
  });

  it("applies custom styling classes", () => {
    const { container } = render(<TutoriasMark className="size-7 text-faro" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveClass("size-7", "text-faro");
  });

  it("supports accessible labels when not purely decorative", () => {
    render(<TutoriasMark aria-label="Isotipo institucional de Tutorías UTN FRRe" />);
    const svg = screen.getByLabelText("Isotipo institucional de Tutorías UTN FRRe");

    expect(svg).toBeInTheDocument();
    expect(svg).not.toHaveAttribute("aria-hidden", "true");
  });

  it("renders the path with evenodd fill rule for complex geometry", () => {
    const { container } = render(<TutoriasMark />);
    const path = container.querySelector("path");

    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute("fill-rule", "evenodd");
    expect(path?.getAttribute("d")).toBeTruthy();
  });
});

