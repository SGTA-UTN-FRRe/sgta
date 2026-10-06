import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import AdminLoading from "./loading";
import TutorsLoading from "./tutors/loading";
import SubjectsLoading from "./tutors/subjects/loading";
import SchedulesLoading from "./schedules/loading";
import AttendanceLoading from "./schedules/attendance/loading";
import HoursLoading from "./hours/loading";
import MovementsLoading from "./hours/movements/loading";
import ConsultationsLoading from "./consultations/loading";
import SettingsLoading from "./settings/loading";

it.each([
  ["overview", AdminLoading],
  ["tutors", TutorsLoading],
  ["subjects", SubjectsLoading],
  ["schedules", SchedulesLoading],
  ["attendance", AttendanceLoading],
  ["hours", HoursLoading],
  ["movements", MovementsLoading],
  ["consultations", ConsultationsLoading],
  ["settings", SettingsLoading],
] as const)("announces loading for Admin %s without exposing placeholder content", (_, Loading) => {
  render(<Loading />);

  expect(screen.getByRole("status", { name: "Cargando sección" })).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
