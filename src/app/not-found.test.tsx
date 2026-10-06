import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import NotFound from "./not-found";

it("renders the missing-page state with a role-aware home destination", () => {
  render(<NotFound />);

  expect(screen.getByRole("main")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("No encontramos esa página");
  expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
});
