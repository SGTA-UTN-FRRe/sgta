import { render, screen } from "@testing-library/react";

import Home from "./page";

describe("Home", () => {
  it("shows the SGTA landing page", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Sistema de Gestión de Tutorías" }),
    ).toBeInTheDocument();
  });
});
