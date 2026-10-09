import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CareerColor } from "@/shared/career-color";
import { CareerColorField } from "./career-color-field";

function Field() {
  const [color, setColor] = useState<CareerColor>("BLUE");
  return <CareerColorField mode="edit" name="Ingeniería Industrial" value={color} onChange={setColor} />;
}

describe("CareerColorField", () => {
  it("explains automatic color assignment only in create mode", () => {
    const description = "Identifica a los tutores de esta carrera en la grilla de horarios.";
    const createDescription = `${description} Si no se elige un color, se asigna automáticamente el menos usado.`;
    const onChange = vi.fn();
    const { rerender } = render(
      <CareerColorField mode="create" name="Ingeniería Industrial" onChange={onChange} />,
    );

    expect(screen.getByRole("radiogroup", { name: "Color en Horarios" }))
      .toHaveAccessibleDescription(createDescription);

    rerender(
      <CareerColorField mode="create" name="Ingeniería Industrial" value="BLUE" onChange={onChange} />,
    );

    expect(screen.getByRole("radiogroup", { name: "Color en Horarios" }))
      .toHaveAccessibleDescription(createDescription);

    rerender(
      <CareerColorField mode="edit" name="Ingeniería Industrial" value="BLUE" onChange={onChange} />,
    );

    expect(screen.getByRole("radiogroup", { name: "Color en Horarios" }))
      .toHaveAccessibleDescription(description);
  });

  it("names the eight options and supports keyboard selection", async () => {
    const user = userEvent.setup();
    render(<Field />);
    expect(screen.getByRole("radiogroup", { name: "Color en Horarios" })).toHaveAccessibleDescription(
      "Identifica a los tutores de esta carrera en la grilla de horarios.");
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Azul" })).toHaveFocus();
    // Radix defers roving focus and selects on focus while the arrow is held.
    await user.keyboard("{ArrowRight>}");
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Esmeralda" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Esmeralda" })).toHaveFocus();
    });
    await user.keyboard("{/ArrowRight}");
  });
  it("prevents selection while the form is disabled", async () => {
    const onChange = vi.fn();
    render(<CareerColorField mode="edit" name="Ingeniería Industrial" value="BLUE" disabled onChange={onChange} />);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: "Violeta" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
