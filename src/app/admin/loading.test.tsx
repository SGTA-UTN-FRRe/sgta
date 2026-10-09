import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import AdminLoading from "./loading";
import TutorsLoading from "./tutors/loading";
import SubjectsLoading from "./tutors/subjects/loading";
import SchedulesLoading from "./schedules/loading";
import HoursLoading from "./hours/loading";
import MovementsLoading from "./hours/movements/loading";
import ConsultationsLoading from "./consultations/loading";
import SettingsLoading from "./settings/loading";

it.each([
  ["overview", AdminLoading, "Cargando sección"],
  ["tutors", TutorsLoading, "Cargando sección"],
  ["subjects", SubjectsLoading, "Cargando sección"],
  ["schedules", SchedulesLoading, "Cargando horarios"],
  ["hours", HoursLoading, "Cargando sección"],
  ["movements", MovementsLoading, "Cargando sección"],
  ["consultations", ConsultationsLoading, "Cargando sección"],
  ["settings", SettingsLoading, "Cargando sección"],
] as const)("announces loading for Admin %s without exposing placeholder content", (_, Loading, name) => {
  render(<Loading />);

  expect(screen.getByRole("status", { name })).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
