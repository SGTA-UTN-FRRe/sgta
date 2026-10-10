import type { Database } from "../../src/db/client-core";
import { runApplicationServer } from "../support/application-server";

import {
  activity,
  administrativeCycle,
  career,
  hourCategory,
  hourMovement,
  scholarshipReference,
  scheduleAssignment,
  schedulePlan,
  session,
  subject,
  tutor,
  tutorCycleMembership,
  tutorSubject,
  user,
} from "../../src/db/schema";
import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_ADMIN_USER_ID,
  E2E_ADMIN_SIGN_OUT_SESSION_TOKEN,
  E2E_TUTOR_SIGN_OUT_SESSION_TOKEN,
  E2E_FORBIDDEN_SIGN_OUT_SESSION_TOKEN,
  E2E_CAREER_ID,
  E2E_CYCLE_ID,
  E2E_FIXED_NOW,
  E2E_INACTIVE_CATEGORY_ID,
  E2E_INACTIVE_TUTOR_ID,
  E2E_MANUAL_CATEGORY_ID,
  E2E_MEETING_CATEGORY_ID,
  E2E_PRIMARY_TUTOR_ID,
  E2E_REGULAR_ASSIGNMENT_ID,
  E2E_REGULAR_PLAN_ID,
  E2E_SECONDARY_ASSIGNMENT_ID,
  E2E_SECONDARY_MOVEMENT_ID,
  E2E_SECONDARY_TUTOR_ID,
  E2E_SECONDARY_TUTOR_USER_ID,
  E2E_SCHEDULE_ASSIGNMENT_ID,
  E2E_SCHEDULE_TUTOR_ID,
  E2E_SEEDED_ACTIVITY_ID,
  E2E_SEEDED_MOVEMENT_ID,
  E2E_SPECIAL_PLAN_ID,
  E2E_TUTOR_SESSION_TOKEN,
  E2E_TUTOR_SPECIAL_ASSIGNMENT_ID,
  E2E_TUTOR_USER_ID,
  E2E_UNLINKED_TUTOR_USER_ID,
} from "./e2e-test-data";

async function seedDatabase(database: Database) {
  const [admin] = await database
    .insert(user)
    .values({
      id: E2E_ADMIN_USER_ID,
      name: "E2E Admin",
      email: "admin.e2e@example.test",
      emailVerified: true,
      role: "ADMIN",
      enabled: true,
    })
    .returning({ id: user.id });

  if (admin === undefined) {
    throw new Error("The E2E Admin fixture could not be created.");
  }

  await database.insert(session).values({
    id: "e2e-admin-session",
    token: E2E_ADMIN_SESSION_TOKEN,
    expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
    userId: admin.id,
    ipAddress: "127.0.0.1",
    userAgent: "Playwright E2E",
  });

  await database.insert(user).values([
    {
      id: E2E_TUTOR_USER_ID,
      name: "Ada Tutor",
      email: "ada.tutor.e2e@example.test",
      emailVerified: true,
      role: "TUTOR",
      enabled: true,
    },
    {
      id: E2E_SECONDARY_TUTOR_USER_ID,
      name: "Grace Tutor",
      email: "grace.tutor.e2e@example.test",
      emailVerified: true,
      role: "TUTOR",
      enabled: true,
    },
    {
      id: E2E_UNLINKED_TUTOR_USER_ID,
      name: "Unlinked Tutor",
      email: "unlinked.tutor.e2e@example.test",
      emailVerified: true,
      role: "TUTOR",
      enabled: true,
    },
  ]);

  await database.insert(session).values({
    id: "e2e-tutor-session",
    token: E2E_TUTOR_SESSION_TOKEN,
    expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
    userId: E2E_TUTOR_USER_ID,
    ipAddress: "127.0.0.1",
    userAgent: "Playwright E2E Tutor",
  });

  // Sign-out journeys revoke dedicated sessions without affecting other tests.
  await database.insert(session).values([
    {
      id: "e2e-admin-sign-out-session",
      token: E2E_ADMIN_SIGN_OUT_SESSION_TOKEN,
      userId: E2E_ADMIN_USER_ID,
      expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
    },
    {
      id: "e2e-tutor-sign-out-session",
      token: E2E_TUTOR_SIGN_OUT_SESSION_TOKEN,
      userId: E2E_TUTOR_USER_ID,
      expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
    },
    {
      id: "e2e-forbidden-sign-out-session",
      token: E2E_FORBIDDEN_SIGN_OUT_SESSION_TOKEN,
      userId: E2E_TUTOR_USER_ID,
      expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
    },
  ]);

  await database.insert(administrativeCycle).values({
    id: E2E_CYCLE_ID,
    name: "2027",
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    status: "OPEN",
  });

  await database.insert(career).values({
    id: E2E_CAREER_ID,
    name: "Computer Science",
    normalizedName: "computer science",
    status: "ACTIVE",
  });

  await database.insert(subject).values([
    {
      id: "33333333-3333-4333-8333-333333333333",
      careerId: E2E_CAREER_ID,
      name: "Algorithms",
      normalizedName: "algorithms",
      status: "ACTIVE",
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      careerId: E2E_CAREER_ID,
      name: "Data Structures",
      normalizedName: "data structures",
      status: "ACTIVE",
    },
  ]);

  await database.insert(scholarshipReference).values({
    id: "55555555-5555-4555-8555-555555555555",
    type: "Institutional Scholarship",
    normalizedType: "institutional scholarship",
    knownRequiredHours: 120,
    notes: "Synthetic reference for browser verification.",
    status: "ACTIVE",
  });

  await database.insert(tutor).values([
    {
      id: E2E_PRIMARY_TUTOR_ID,
      applicationUserId: E2E_TUTOR_USER_ID,
      firstName: "Ada",
      lastName: "Lovelace",
      preferredDisplayName: "Ada",
      institutionalIdentifier: "E2E-001",
      normalizedInstitutionalIdentifier: "e2e-001",
      primaryCareerId: E2E_CAREER_ID,
      status: "ACTIVE",
    },
    {
      id: E2E_SECONDARY_TUTOR_ID,
      applicationUserId: E2E_SECONDARY_TUTOR_USER_ID,
      firstName: "Grace",
      lastName: "Hopper",
      preferredDisplayName: "Grace",
      institutionalIdentifier: "E2E-002",
      normalizedInstitutionalIdentifier: "e2e-002",
      primaryCareerId: E2E_CAREER_ID,
      status: "ACTIVE",
    },
    {
      id: E2E_INACTIVE_TUTOR_ID,
      firstName: "Inactive",
      lastName: "Tutor",
      preferredDisplayName: "Inactive",
      institutionalIdentifier: "E2E-003",
      normalizedInstitutionalIdentifier: "e2e-003",
      primaryCareerId: E2E_CAREER_ID,
      status: "INACTIVE",
    },
    {
      id: E2E_SCHEDULE_TUTOR_ID,
      firstName: "Marie",
      lastName: "Curie",
      preferredDisplayName: "Marie",
      institutionalIdentifier: "E2E-004",
      normalizedInstitutionalIdentifier: "e2e-004",
      primaryCareerId: E2E_CAREER_ID,
      status: "ACTIVE",
    },
  ]);

  await database.insert(tutorSubject).values([
    {
      tutorId: E2E_PRIMARY_TUTOR_ID,
      subjectId: "33333333-3333-4333-8333-333333333333",
    },
    {
      tutorId: E2E_SECONDARY_TUTOR_ID,
      subjectId: "44444444-4444-4444-8444-444444444444",
    },
  ]);

  await database.insert(tutorCycleMembership).values([
    {
      tutorId: E2E_PRIMARY_TUTOR_ID,
      cycleId: E2E_CYCLE_ID,
      scholarshipReferenceId: "55555555-5555-4555-8555-555555555555",
    },
    { tutorId: E2E_SECONDARY_TUTOR_ID, cycleId: E2E_CYCLE_ID },
    { tutorId: E2E_INACTIVE_TUTOR_ID, cycleId: E2E_CYCLE_ID },
    { tutorId: E2E_SCHEDULE_TUTOR_ID, cycleId: E2E_CYCLE_ID },
  ]);

  await database.insert(hourCategory).values([
    {
      id: E2E_MEETING_CATEGORY_ID,
      name: "Meeting credit",
      normalizedName: "meeting credit",
      activityKind: "MEETING",
      status: "ACTIVE",
    },
    {
      id: E2E_MANUAL_CATEGORY_ID,
      name: "Manual credit",
      normalizedName: "manual credit",
      activityKind: null,
      status: "ACTIVE",
    },
    {
      id: E2E_INACTIVE_CATEGORY_ID,
      name: "Archived activity",
      normalizedName: "archived activity",
      activityKind: "EXTRAORDINARY",
      status: "INACTIVE",
    },
  ]);

  await database.insert(schedulePlan).values([
    {
      id: E2E_REGULAR_PLAN_ID,
      cycleId: E2E_CYCLE_ID,
      name: "Regular 2027",
      kind: "REGULAR",
      validFrom: "2027-01-01",
      validTo: "2027-12-31",
      status: "ACTIVE",
    },
    {
      id: E2E_SPECIAL_PLAN_ID,
      cycleId: E2E_CYCLE_ID,
      name: "Special week 2027",
      kind: "SPECIAL",
      validFrom: "2027-01-18",
      validTo: "2027-01-18",
      status: "ACTIVE",
    },
  ]);

  await database.insert(scheduleAssignment).values([
    {
      id: E2E_REGULAR_ASSIGNMENT_ID,
      planId: E2E_REGULAR_PLAN_ID,
      tutorId: E2E_PRIMARY_TUTOR_ID,
      pattern: "WEEKDAY",
      weekday: 1,
      startMinutes: 480,
      endMinutes: 540,
      kind: "DUTY",
      modality: "IN_PERSON",
      status: "ACTIVE",
    },
    {
      id: E2E_SECONDARY_ASSIGNMENT_ID,
      planId: E2E_REGULAR_PLAN_ID,
      tutorId: E2E_SECONDARY_TUTOR_ID,
      pattern: "WEEKDAY",
      weekday: 2,
      startMinutes: 600,
      endMinutes: 660,
      kind: "DUTY",
      modality: "VIRTUAL",
      status: "ACTIVE",
    },
    {
      id: E2E_TUTOR_SPECIAL_ASSIGNMENT_ID,
      planId: E2E_SPECIAL_PLAN_ID,
      tutorId: E2E_PRIMARY_TUTOR_ID,
      pattern: "DATE",
      assignmentDate: "2027-01-18",
      startMinutes: 600,
      endMinutes: 720,
      kind: "DUTY",
      modality: "IN_PERSON",
      status: "ACTIVE",
    },
    {
      id: E2E_SCHEDULE_ASSIGNMENT_ID,
      planId: E2E_SPECIAL_PLAN_ID,
      tutorId: E2E_SCHEDULE_TUTOR_ID,
      pattern: "DATE",
      assignmentDate: "2027-01-18",
      startMinutes: 600,
      endMinutes: 720,
      kind: "DUTY",
      modality: "IN_PERSON",
      status: "ACTIVE",
    },
  ]);

  await database.insert(activity).values({
    id: E2E_SEEDED_ACTIVITY_ID,
    cycleId: E2E_CYCLE_ID,
    kind: "MEETING",
    activityDate: "2027-01-15",
    durationMinutes: 30,
    note: "Seeded meeting origin.",
    actorId: admin.id,
  });

  await database.insert(hourMovement).values([
    {
      id: E2E_SEEDED_MOVEMENT_ID,
      cycleId: E2E_CYCLE_ID,
      tutorId: E2E_PRIMARY_TUTOR_ID,
      categoryId: E2E_MEETING_CATEGORY_ID,
      direction: "CREDIT",
      durationMinutes: 30,
      movementDate: "2027-01-15",
      note: "Seeded meeting movement.",
      activityId: E2E_SEEDED_ACTIVITY_ID,
      actorId: admin.id,
    },
    {
      id: E2E_SECONDARY_MOVEMENT_ID,
      cycleId: E2E_CYCLE_ID,
      tutorId: E2E_SECONDARY_TUTOR_ID,
      categoryId: E2E_MEETING_CATEGORY_ID,
      direction: "CREDIT",
      durationMinutes: 60,
      movementDate: "2027-01-16",
      note: "Secondary tutor movement.",
      actorId: admin.id,
    },
  ]);
}

void runApplicationServer({ now: E2E_FIXED_NOW, seed: seedDatabase });
