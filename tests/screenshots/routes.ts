import { DEMO_CYCLE_ID } from "./demo-data";

export type ScreenshotRoute = {
  slug: string;
  path: string;
  session: "admin" | "tutor" | "forbidden" | "none";
  readme: string | null;
};

const cycleQuery = `cycleId=${DEMO_CYCLE_ID}`;

export const screenshotRoutes: readonly ScreenshotRoute[] = [
  { slug: "login", path: "/login", session: "none", readme: "login.png" },
  { slug: "admin-overview", path: "/admin", session: "admin", readme: "admin-overview.png" },
  { slug: "tutors", path: "/admin/tutors", session: "admin", readme: null },
  { slug: "subjects", path: "/admin/tutors/subjects", session: "admin", readme: null },
  { slug: "schedules", path: `/admin/schedules?${cycleQuery}&date=2026-09-16`, session: "admin", readme: "schedules.png" },
  { slug: "hours", path: `/admin/hours?${cycleQuery}`, session: "admin", readme: "hours.png" },
  { slug: "movements", path: `/admin/hours/movements?${cycleQuery}`, session: "admin", readme: null },
  { slug: "consultations", path: "/admin/consultations", session: "admin", readme: null },
  { slug: "reports", path: "/admin/reports?fromDate=2026-01-01&toDate=2026-09-16", session: "admin", readme: null },
  { slug: "settings", path: "/admin/settings", session: "admin", readme: null },
  { slug: "tutor-summary", path: "/tutor", session: "tutor", readme: "tutor-summary.png" },
  { slug: "tutor-schedule", path: "/tutor/schedule?date=2026-09-16", session: "tutor", readme: null },
  { slug: "tutor-hours", path: "/tutor/hours", session: "tutor", readme: null },
  { slug: "forbidden", path: "/forbidden", session: "forbidden", readme: null },
];
