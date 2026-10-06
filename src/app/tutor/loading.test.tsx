import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import TutorLoading from "./loading";
import ScheduleLoading from "./schedule/loading";
import HoursLoading from "./hours/loading";

it.each([
  ["summary", TutorLoading],
  ["schedule", ScheduleLoading],
  ["hours", HoursLoading],
] as const)("announces loading for Tutor %s without exposing placeholder content", (_, Loading) => {
  render(<Loading />);

  expect(screen.getByRole("status", { name: "Cargando sección" })).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
