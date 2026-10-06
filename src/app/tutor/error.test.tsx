import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import TutorError from "./error";

it("announces safe Tutor recovery, retries the segment, and links to Tutor home", async () => {
  const user = userEvent.setup();
  const retry = vi.fn();
  const error = Object.assign(new Error("Private owner and query details"), {
    digest: "internal-tutor-error-digest",
  });
  const { container } = render(<TutorError error={error} retry={retry} />);

  expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar esta sección");
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Intentar nuevamente. Si el problema continúa, avisar a la administración.",
  );
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("No se pudo cargar esta sección");
  expect(container.textContent).not.toContain(error.message);
  expect(container.textContent).not.toContain(error.digest);
  expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/tutor");
  await user.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(retry).toHaveBeenCalledTimes(1);
});
