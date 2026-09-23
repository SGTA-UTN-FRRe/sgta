import { count, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  activity,
  administrativeCycle,
  attendanceRecord,
  auditEvent,
  career,
  consultation,
  consultationImportRun,
  consultationStaging,
  dutyOccurrence,
  hourCategory,
  hourMovement,
  scheduleAssignment,
  schedulePlan,
  subject,
  tutor,
  tutorCycleMembership,
  tutorSubject,
} from "@/db/schema";
import { provisionUser } from "@/auth/provisioning";
import { getAdminOverviewReadModel } from "@/features/admin-overview/admin-overview-service";
import {
  getOperationalReport,
  getReportFilterOptions,
} from "@/features/reports/report-service";
import { ReportFilterValidationError } from "@/features/reports/report-validation";
import { getIntegrationDatabase } from "./setup";

vi.mock("server-only", () => ({}));

const reportNow = new Date("2026-09-22T12:00:00.000Z");
const reportFrom = "2026-09-18";
const reportTo = "2026-09-21";

async function resetDatabase() {
  await getIntegrationDatabase().execute(sql`
    TRUNCATE TABLE
      "consultation_duplicate_candidate",
      "consultation",
      "consultation_staging",
      "consultation_import_run",
      "hour_movement",
      "activity",
      "attendance_record",
      "duty_occurrence",
      "schedule_assignment",
      "schedule_plan",
      "hour_category",
      "tutor_cycle_membership",
      "tutor_subject",
      "tutor",
      "scholarship_reference",
      "subject",
      "career",
      "audit_event",
      "session",
      "account",
      "verification",
      "administrative_cycle",
      "user"
    CASCADE
  `);
}

function requireCreated<T>(row: T | undefined, label: string): T {
  if (row === undefined) throw new Error(`${label} fixture was not created.`);
  return row;
}

async function createReportFixtures() {
  const database = getIntegrationDatabase();
  const admin = await provisionUser(
    database,
    {
      email: "reports.admin.integration@example.test",
      name: "Reports Integration Admin",
      role: "ADMIN",
      enabled: true,
    },
    { source: "bootstrap" },
  );

  const [openCycle] = await database
    .insert(administrativeCycle)
    .values({
      name: "Open report cycle",
      startDate: "2026-01-01",
      endDate: "2027-12-31",
      status: "OPEN",
    })
    .returning();
  const [closedCycle] = await database
    .insert(administrativeCycle)
    .values({
      name: "Closed report cycle",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      status: "CLOSED",
    })
    .returning();
  const openCycleRecord = requireCreated(openCycle, "Open cycle");
  const closedCycleRecord = requireCreated(closedCycle, "Closed cycle");

  const [activeCareer] = await database
    .insert(career)
    .values({ name: "Applied Science", normalizedName: "applied science" })
    .returning();
  const [inactiveCareer] = await database
    .insert(career)
    .values({
      name: "Historical Studies",
      normalizedName: "historical studies",
      status: "INACTIVE",
    })
    .returning();
  const activeCareerRecord = requireCreated(activeCareer, "Active career");
  const inactiveCareerRecord = requireCreated(inactiveCareer, "Inactive career");

  const [firstSubject] = await database
    .insert(subject)
    .values({
      careerId: activeCareerRecord.id,
      name: "Applied Algebra",
      normalizedName: "applied algebra",
    })
    .returning();
  const [secondSubject] = await database
    .insert(subject)
    .values({
      careerId: activeCareerRecord.id,
      name: "Data Methods",
      normalizedName: "data methods",
    })
    .returning();
  const [uncoveredSubject] = await database
    .insert(subject)
    .values({
      careerId: activeCareerRecord.id,
      name: "Uncovered Methods",
      normalizedName: "uncovered methods",
    })
    .returning();
  const [inactiveSubject] = await database
    .insert(subject)
    .values({
      careerId: activeCareerRecord.id,
      name: "Archived Methods",
      normalizedName: "archived methods",
      status: "INACTIVE",
    })
    .returning();
  const [inactiveCareerSubject] = await database
    .insert(subject)
    .values({
      careerId: inactiveCareerRecord.id,
      name: "Historical Calculus",
      normalizedName: "historical calculus",
    })
    .returning();

  const subjectOne = requireCreated(firstSubject, "First subject");
  const subjectTwo = requireCreated(secondSubject, "Second subject");
  const subjectThree = requireCreated(uncoveredSubject, "Uncovered subject");
  const archivedSubject = requireCreated(inactiveSubject, "Inactive subject");
  const subjectUnderInactiveCareer = requireCreated(
    inactiveCareerSubject,
    "Subject under inactive career",
  );

  async function createTutor(
    firstName: string,
    lastName: string,
    options: { status?: "ACTIVE" | "INACTIVE"; careerId?: string } = {},
  ) {
    const [created] = await database
      .insert(tutor)
      .values({
        firstName,
        lastName,
        primaryCareerId: options.careerId ?? activeCareerRecord.id,
        status: options.status ?? "ACTIVE",
      })
      .returning();
    return requireCreated(created, `${firstName} tutor`);
  }

  const owingTutor = await createTutor("Iris", "Owens");
  const positiveTutor = await createTutor("Mina", "Positive");
  const zeroTutor = await createTutor("Noah", "Zero");
  const inactiveTutor = await createTutor("Olive", "Inactive", {
    status: "INACTIVE",
  });
  const historicalTutor = await createTutor("Parker", "Historical", {
    careerId: inactiveCareerRecord.id,
  });

  await database.insert(tutorCycleMembership).values([
    { tutorId: owingTutor.id, cycleId: openCycleRecord.id },
    { tutorId: positiveTutor.id, cycleId: openCycleRecord.id },
    { tutorId: zeroTutor.id, cycleId: openCycleRecord.id },
    { tutorId: inactiveTutor.id, cycleId: openCycleRecord.id },
    { tutorId: owingTutor.id, cycleId: closedCycleRecord.id },
  ]);
  await database.insert(tutorSubject).values([
    { tutorId: owingTutor.id, subjectId: subjectOne.id },
    { tutorId: positiveTutor.id, subjectId: subjectTwo.id },
    { tutorId: inactiveTutor.id, subjectId: subjectThree.id },
  ]);

  const [category] = await database
    .insert(hourCategory)
    .values({ name: "Report ledger", normalizedName: "report ledger" })
    .returning();
  const reportCategory = requireCreated(category, "Hour category");

  const [successfulImport] = await database
    .insert(consultationImportRun)
    .values({
      actorId: admin.id,
      status: "SUCCEEDED",
      sourceSpreadsheetId: "reports-synthetic-source",
      sourceRange: "Responses!A:I",
      startedAt: new Date(reportNow.getTime() - 10_000),
      completedAt: new Date(reportNow.getTime() - 9_000),
    })
    .returning();
  const successRun = requireCreated(successfulImport, "Successful import run");

  async function createStaging(
    sourceRowKey: string,
    classification: "SUBJECT" | "GENERAL" | "PENDING_CLASSIFICATION",
    subjectId: string | null,
    date: string,
  ) {
    const consolidated = classification !== "PENDING_CLASSIFICATION";
    const [created] = await database
      .insert(consultationStaging)
      .values({
        sourceSpreadsheetId: "reports-synthetic-source",
        sourceTab: "Responses",
        sourceRowKey,
        sourceFingerprint: "a".repeat(64),
        firstSeenRunId: successRun.id,
        lastSeenRunId: successRun.id,
        rawCareer: "Synthetic career",
        rawStudentFirstName: "Confidential Student",
        rawStudentLastName: "Report Fixture",
        rawConsultationDate: date,
        rawTutor: "Synthetic tutor",
        rawAcademicStage: "Synthetic stage",
        rawModality: "Synthetic modality",
        rawTopic: "Private raw consultation topic",
        rawContact: "private-student-report@example.test",
        normalizedCareer: activeCareerRecord.normalizedName,
        careerId: activeCareerRecord.id,
        normalizedStudentFirstName: "confidential student",
        normalizedStudentLastName: "report fixture",
        normalizedConsultationDate: date,
        normalizedTutor: "synthetic tutor",
        tutorId: owingTutor.id,
        normalizedAcademicStage: "synthetic stage",
        normalizedModality: "synthetic modality",
        normalizedTopic: "private raw consultation topic",
        normalizedContact: "private-student-report@example.test",
        status: consolidated ? "CONSOLIDATED" : "PENDING_REVIEW",
        classification,
        subjectId: classification === "SUBJECT" ? subjectId : null,
        reviewedBy: consolidated ? admin.id : null,
        reviewedAt: consolidated ? reportNow : null,
      })
      .returning();
    return requireCreated(created, `Staging ${sourceRowKey}`);
  }

  async function createConsultation(
    sourceRowKey: string,
    options: {
      date: string;
      classification: "SUBJECT" | "GENERAL";
      careerId?: string;
      tutorId?: string;
      subjectId?: string;
      cycleId?: string;
      modality: string | null;
      academicStage: string | null;
    },
  ) {
    const careerId = options.careerId ?? activeCareerRecord.id;
    const tutorId = options.tutorId ?? owingTutor.id;
    const subjectId = options.classification === "SUBJECT"
      ? options.subjectId ?? subjectOne.id
      : null;
    const staging = await createStaging(
      sourceRowKey,
      options.classification,
      subjectId,
      options.date,
    );
    await database.insert(consultation).values({
      stagingId: staging.id,
      cycleId: options.cycleId,
      consultationDate: options.date,
      studentFirstName: "Confidential Student",
      studentLastName: "Report Fixture",
      studentContact: "private-student-report@example.test",
      careerId,
      tutorId,
      academicStage: options.academicStage,
      modality: options.modality,
      rawTopic: "Private raw consultation topic",
      classification: options.classification,
      subjectId,
    });
  }

  await createConsultation("subject-virtual", {
    date: reportFrom,
    classification: "SUBJECT",
    tutorId: owingTutor.id,
    subjectId: subjectOne.id,
    modality: "Virtual",
    academicStage: "First year",
  });
  await createConsultation("subject-unspecified", {
    date: reportFrom,
    classification: "SUBJECT",
    tutorId: owingTutor.id,
    subjectId: subjectOne.id,
    modality: null,
    academicStage: null,
  });
  await createConsultation("general-active-career", {
    date: reportTo,
    classification: "GENERAL",
    tutorId: positiveTutor.id,
    modality: "On campus",
    academicStage: "Second year",
    cycleId: closedCycleRecord.id,
  });
  await createConsultation("general-inactive-career", {
    date: "2026-09-20",
    classification: "GENERAL",
    careerId: inactiveCareerRecord.id,
    tutorId: zeroTutor.id,
    modality: "Virtual",
    academicStage: "Third year",
  });
  await createConsultation("outside-report-period", {
    date: "2026-09-17",
    classification: "GENERAL",
    modality: "Virtual",
    academicStage: "First year",
  });
  await createStaging(
    "pending-classification",
    "PENDING_CLASSIFICATION",
    null,
    "2026-09-19",
  );

  const [failedImport] = await database
    .insert(consultationImportRun)
    .values({
      actorId: admin.id,
      status: "FAILED",
      sourceSpreadsheetId: "reports-synthetic-source",
      sourceRange: "Responses!A:I",
      errorRows: 1,
      errorCode: "source_unavailable",
      startedAt: new Date(reportNow.getTime() + 1_000),
      completedAt: new Date(reportNow.getTime() + 2_000),
    })
    .returning();
  requireCreated(failedImport, "Failed source import");

  const [regularPlan] = await database
    .insert(schedulePlan)
    .values({
      cycleId: openCycleRecord.id,
      name: "Report regular plan",
      kind: "REGULAR",
      validFrom: reportFrom,
      validTo: reportTo,
    })
    .returning();
  const [specialPlan] = await database
    .insert(schedulePlan)
    .values({
      cycleId: openCycleRecord.id,
      name: "Report special plan",
      kind: "SPECIAL",
      validFrom: "2026-09-19",
      validTo: "2026-09-19",
    })
    .returning();
  const [upcomingPlan] = await database
    .insert(schedulePlan)
    .values({
      cycleId: openCycleRecord.id,
      name: "Report upcoming special plan",
      kind: "SPECIAL",
      validFrom: "2026-09-23",
      validTo: "2026-09-23",
    })
    .returning();
  const regular = requireCreated(regularPlan, "Regular plan");
  const special = requireCreated(specialPlan, "Special plan");
  const upcoming = requireCreated(upcomingPlan, "Upcoming plan");

  async function createAssignment(
    planId: string,
    tutorId: string,
    assignmentDate: string,
    kind: "DUTY" | "RECOVERY",
    startMinutes: number,
    endMinutes: number,
    modality: string | null,
  ) {
    const [created] = await database
      .insert(scheduleAssignment)
      .values({
        planId,
        tutorId,
        pattern: "DATE",
        assignmentDate,
        startMinutes,
        endMinutes,
        kind,
        modality,
      })
      .returning();
    return requireCreated(created, `Assignment ${assignmentDate} ${kind}`);
  }

  const assignments = {
    sep18: await createAssignment(
      regular.id,
      owingTutor.id,
      "2026-09-18",
      "DUTY",
      480,
      540,
      "Virtual",
    ),
    sep19Regular: await createAssignment(
      regular.id,
      positiveTutor.id,
      "2026-09-19",
      "DUTY",
      480,
      540,
      "Virtual",
    ),
    sep20: await createAssignment(
      regular.id,
      zeroTutor.id,
      "2026-09-20",
      "DUTY",
      480,
      525,
      null,
    ),
    sep21: await createAssignment(
      regular.id,
      owingTutor.id,
      "2026-09-21",
      "DUTY",
      480,
      510,
      "Virtual",
    ),
    sep19SpecialDuty: await createAssignment(
      special.id,
      positiveTutor.id,
      "2026-09-19",
      "DUTY",
      600,
      630,
      "On campus",
    ),
    sep19SpecialRecovery: await createAssignment(
      special.id,
      positiveTutor.id,
      "2026-09-19",
      "RECOVERY",
      660,
      680,
      "Online",
    ),
    upcoming: await createAssignment(
      upcoming.id,
      owingTutor.id,
      "2026-09-23",
      "DUTY",
      480,
      540,
      "Virtual",
    ),
  };

  async function createOccurrence(
    date: string,
    assignment: typeof assignments.sep18,
    status: "PRESENT" | "ABSENT" | "PENDING" | null,
  ) {
    const [created] = await database
      .insert(dutyOccurrence)
      .values({
        cycleId: openCycleRecord.id,
        planId: assignment.planId,
        assignmentId: assignment.id,
        tutorId: assignment.tutorId,
        occurrenceDate: date,
        startMinutes: assignment.startMinutes,
        endMinutes: assignment.endMinutes,
        kind: assignment.kind,
        modality: assignment.modality,
      })
      .returning();
    const occurrence = requireCreated(created, `Occurrence ${date}`);
    if (status !== null) {
      await database.insert(attendanceRecord).values({
        occurrenceId: occurrence.id,
        status,
        actorId: admin.id,
      });
    }
    return occurrence;
  }

  const occurrences = {
    sep18: await createOccurrence("2026-09-18", assignments.sep18, "PRESENT"),
    sep19: await createOccurrence(
      "2026-09-19",
      assignments.sep19SpecialDuty,
      "ABSENT",
    ),
    sep20: await createOccurrence("2026-09-20", assignments.sep20, "PENDING"),
    sep21: await createOccurrence("2026-09-21", assignments.sep21, null),
  };

  const activityRows: Array<{
    id: string;
    kind: "MEETING" | "WORKSHOP" | "EXTRAORDINARY" | "RECOVERY";
    activityDate: string;
    durationMinutes: number;
  }> = [];
  for (const [index, item] of [
    { kind: "MEETING" as const, date: "2026-09-18", durationMinutes: 30 },
    { kind: "WORKSHOP" as const, date: "2026-09-19", durationMinutes: 15 },
    { kind: "EXTRAORDINARY" as const, date: "2026-09-20", durationMinutes: 20 },
    { kind: "RECOVERY" as const, date: "2026-09-21", durationMinutes: 10 },
  ].entries()) {
    const [created] = await database
      .insert(activity)
      .values({
        cycleId: openCycleRecord.id,
        kind: item.kind,
        activityDate: item.date,
        durationMinutes: item.durationMinutes,
        note: `Synthetic ${item.kind.toLowerCase()} activity`,
        actorId: admin.id,
      })
      .returning();
    const row = requireCreated(created, `Activity ${index}`);
    activityRows.push({
      id: row.id,
      kind: row.kind,
      activityDate: row.activityDate,
      durationMinutes: row.durationMinutes,
    });
  }

  async function createMovement(
    overrides: {
      cycleId?: string;
      tutorId: string;
      direction: "CREDIT" | "DEBIT";
      durationMinutes: number;
      movementDate: string;
      activityId?: string;
      reversalOfMovementId?: string;
    },
  ) {
    const [created] = await database
      .insert(hourMovement)
      .values({
        cycleId: overrides.cycleId ?? openCycleRecord.id,
        tutorId: overrides.tutorId,
        categoryId: reportCategory.id,
        direction: overrides.direction,
        durationMinutes: overrides.durationMinutes,
        movementDate: overrides.movementDate,
        activityId: overrides.activityId,
        reversalOfMovementId: overrides.reversalOfMovementId,
        actorId: admin.id,
      })
      .returning();
    return requireCreated(created, "Hour movement");
  }

  const movements = {
    owingMeetingCreditOne: await createMovement({
      tutorId: owingTutor.id,
      direction: "CREDIT",
      durationMinutes: 90,
      movementDate: "2026-09-18",
      activityId: activityRows[0]!.id,
    }),
    owingMeetingCreditTwo: await createMovement({
      tutorId: owingTutor.id,
      direction: "CREDIT",
      durationMinutes: 30,
      movementDate: "2026-09-18",
      activityId: activityRows[0]!.id,
    }),
    owingDebit: await createMovement({
      tutorId: owingTutor.id,
      direction: "DEBIT",
      durationMinutes: 180,
      movementDate: "2026-09-19",
    }),
    positiveCredit: await createMovement({
      tutorId: positiveTutor.id,
      direction: "CREDIT",
      durationMinutes: 120,
      movementDate: "2026-09-20",
      activityId: activityRows[1]!.id,
    }),
    originalDebit: await createMovement({
      tutorId: zeroTutor.id,
      direction: "DEBIT",
      durationMinutes: 60,
      movementDate: "2026-09-21",
      activityId: activityRows[2]!.id,
    }),
  };
  const reversedDebit = await createMovement({
    tutorId: zeroTutor.id,
    direction: "CREDIT",
    durationMinutes: 60,
    movementDate: "2026-09-21",
    reversalOfMovementId: movements.originalDebit.id,
  });
  await createMovement({
    cycleId: closedCycleRecord.id,
    tutorId: owingTutor.id,
    direction: "CREDIT",
    durationMinutes: 999,
    movementDate: "2026-09-18",
  });

  return {
    admin,
    openCycle: openCycleRecord,
    closedCycle: closedCycleRecord,
    activeCareer: activeCareerRecord,
    inactiveCareer: inactiveCareerRecord,
    subjects: {
      first: subjectOne,
      second: subjectTwo,
      uncovered: subjectThree,
      inactive: archivedSubject,
      inactiveCareer: subjectUnderInactiveCareer,
    },
    tutors: { owing: owingTutor, positive: positiveTutor, zero: zeroTutor, inactive: inactiveTutor, historical: historicalTutor },
    assignments,
    occurrences,
    activities: activityRows,
    movements: { ...movements, reversedDebit },
  };
}

async function reportFixtureCounts() {
  const database = getIntegrationDatabase();
  const [consultations, movements, activities, auditEvents] = await Promise.all([
    database.select({ count: count() }).from(consultation),
    database.select({ count: count() }).from(hourMovement),
    database.select({ count: count() }).from(activity),
    database.select({ count: count() }).from(auditEvent),
  ]);
  return {
    consultations: consultations[0]?.count,
    movements: movements[0]?.count,
    activities: activities[0]?.count,
    auditEvents: auditEvents[0]?.count,
  };
}

describe("PostgreSQL reporting integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("derives safe metrics from canonical records without writes when the source is unavailable", async () => {
    const database = getIntegrationDatabase();
    const fixture = await createReportFixtures();
    const before = await reportFixtureCounts();

    const [report, options, overview] = await Promise.all([
      getOperationalReport(database, { fromDate: reportFrom, toDate: reportTo }, reportNow),
      getReportFilterOptions(database),
      getAdminOverviewReadModel(database, reportNow),
    ]);

    expect(report.consultationDemand).toMatchObject({
      status: "ready",
      data: {
        total: 4,
        subjectTotal: 2,
        generalTotal: 2,
        byCareer: {
          items: [
            { key: fixture.activeCareer.id, count: 3 },
            { key: fixture.inactiveCareer.id, count: 1 },
          ],
        },
        bySubject: { items: [{ key: fixture.subjects.first.id, count: 2 }] },
        byModality: {
          items: expect.arrayContaining([
            { key: "Virtual", label: "Virtual", count: 2 },
            { key: null, label: "Sin especificar", count: 1 },
            { key: "On campus", label: "On campus", count: 1 },
          ]),
        },
        byAcademicStage: {
          items: expect.arrayContaining([
            { key: null, label: "Sin especificar", count: 1 },
            { key: "First year", label: "First year", count: 1 },
          ]),
        },
        byMonth: [{ key: "2026-09", label: "2026-09", count: 4 }],
      },
    });
    expect(report.activeTutors).toEqual({ status: "ready", data: { count: 4 } });
    expect(report.subjectCoverage).toMatchObject({
      status: "ready",
      data: {
        cycleId: fixture.openCycle.id,
        coveredSubjects: 2,
        totalSubjects: 3,
        coveragePercent: 66.67,
      },
    });
    expect(report.plannedSchedules).toMatchObject({
      status: "ready",
      data: {
        totalOccurrences: 5,
        totalMinutes: 185,
        byKind: [
          { kind: "DUTY", count: 4, minutes: 165 },
          { kind: "RECOVERY", count: 1, minutes: 20 },
        ],
      },
    });
    expect(report.attendance).toEqual({
      status: "ready",
      data: {
        dueOccurrences: 4,
        present: 1,
        absent: 1,
        pending: 2,
        registered: 2,
        registrationRatePercent: 50,
      },
    });
    expect(report.currentBalances).toMatchObject({
      status: "ready",
      data: { totalTutors: 3, owes: 1, current: 2 },
    });
    expect(report.movements).toMatchObject({
      status: "ready",
      data: {
        creditCount: 5,
        debitCount: 2,
        creditMinutes: 1_299,
        debitMinutes: 240,
        netMinutes: 1_059,
      },
    });
    expect(report.movements.status === "ready" && report.movements.data.groups.items)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ date: "2026-09-21", direction: "CREDIT", count: 1, minutes: 60 }),
        expect.objectContaining({ date: "2026-09-21", direction: "DEBIT", count: 1, minutes: 60 }),
      ]));
    expect(report.activities).toMatchObject({
      status: "ready",
      data: {
        totalActivities: 4,
        totalMinutes: 75,
        groups: expect.arrayContaining([
          { date: "2026-09-18", kind: "MEETING", count: 1, minutes: 30 },
          { date: "2026-09-19", kind: "WORKSHOP", count: 1, minutes: 15 },
          { date: "2026-09-20", kind: "EXTRAORDINARY", count: 1, minutes: 20 },
          { date: "2026-09-21", kind: "RECOVERY", count: 1, minutes: 10 },
        ]),
      },
    });
    expect(options.careers.map((item) => item.id)).toEqual(
      expect.arrayContaining([fixture.activeCareer.id, fixture.inactiveCareer.id]),
    );
    expect(options.subjects.map((item) => item.id)).toEqual(
      expect.arrayContaining([fixture.subjects.inactive.id, fixture.subjects.inactiveCareer.id]),
    );
    expect(options.tutors.map((item) => item.id)).toContain(fixture.tutors.inactive.id);
    expect(options.modalities).toEqual(expect.arrayContaining(["Virtual", "On campus", "Online"]));

    expect(overview.cycle).toMatchObject({ id: fixture.openCycle.id, name: "Open report cycle" });
    if (overview.cycle === null) throw new Error("The overview cycle should be available.");
    expect(overview.pendingAttendance).toEqual({
      status: "ready",
      value: { count: 2, firstDate: "2026-09-20" },
    });
    expect(overview.negativeBalances).toEqual({ status: "ready", value: 1 });
    expect(overview.consultationReviews).toEqual({ status: "ready", value: 1 });
    expect(overview.consultationSource).toEqual({
      status: "ready",
      value: { degraded: true },
    });
    expect(overview.upcomingDuties).toMatchObject({
      status: "ready",
      value: [expect.objectContaining({ date: "2026-09-23", tutor: "Owens, Iris" })],
    });

    const publicPayload = JSON.stringify({ report, options });
    expect(publicPayload).not.toContain("Confidential Student");
    expect(publicPayload).not.toContain("private-student-report@example.test");
    expect(publicPayload).not.toContain("Private raw consultation topic");
    expect(await reportFixtureCounts()).toEqual(before);
  });

  it("applies dimensions only to their documented sections and uses inclusive event dates", async () => {
    const database = getIntegrationDatabase();
    const fixture = await createReportFixtures();
    const filtered = await getOperationalReport(
      database,
      {
        fromDate: reportFrom,
        toDate: reportFrom,
        careerId: fixture.activeCareer.id,
        subjectId: fixture.subjects.first.id,
        tutorId: fixture.tutors.owing.id,
        modality: "Virtual",
      },
      reportNow,
    );

    expect(filtered.consultationDemand).toMatchObject({
      status: "ready",
      data: { total: 1, subjectTotal: 1, generalTotal: 0 },
    });
    expect(filtered.activeTutors).toEqual({ status: "ready", data: { count: 1 } });
    expect(filtered.subjectCoverage).toMatchObject({
      status: "ready",
      data: { coveredSubjects: 1, totalSubjects: 1 },
    });
    expect(filtered.plannedSchedules).toMatchObject({
      status: "ready",
      data: { totalOccurrences: 1, totalMinutes: 60 },
    });
    expect(filtered.attendance).toMatchObject({
      status: "ready",
      data: { dueOccurrences: 1, present: 1, absent: 0, pending: 0 },
    });
    expect(filtered.currentBalances).toMatchObject({
      status: "ready",
      data: { totalTutors: 1, owes: 1, current: 0 },
    });
    expect(filtered.movements).toMatchObject({
      status: "ready",
      data: { creditCount: 3, creditMinutes: 1_119, netMinutes: 1_119 },
    });
    expect(filtered.activities).toMatchObject({
      status: "ready",
      data: { totalActivities: 1, totalMinutes: 30 },
    });

    const unspecified = await getOperationalReport(
      database,
      { fromDate: "2026-09-20", toDate: "2026-09-20", modality: "UNSPECIFIED" },
      reportNow,
    );
    expect(unspecified.consultationDemand).toMatchObject({
      status: "ready",
      data: { total: 0, subjectTotal: 0, generalTotal: 0 },
    });
    expect(unspecified.plannedSchedules).toMatchObject({
      status: "ready",
      data: { totalOccurrences: 1, totalMinutes: 45 },
    });
    expect(unspecified.attendance).toMatchObject({
      status: "ready",
      data: { dueOccurrences: 1, pending: 1, registrationRatePercent: 0 },
    });

    const subjectOnly = await getOperationalReport(
      database,
      {
        fromDate: reportFrom,
        toDate: reportTo,
        careerId: fixture.activeCareer.id,
        subjectId: fixture.subjects.first.id,
      },
      reportNow,
    );
    expect(subjectOnly.consultationDemand).toMatchObject({
      status: "ready",
      data: { total: 2, subjectTotal: 2, generalTotal: 0 },
    });
    expect(subjectOnly.currentBalances).toMatchObject({
      status: "ready",
      data: { totalTutors: 3, owes: 1, current: 2 },
    });
  });

  it("reports invalid filters, empty periods, and unavailable cycle snapshots explicitly", async () => {
    const database = getIntegrationDatabase();
    const fixture = await createReportFixtures();

    await expect(
      getOperationalReport(database, { fromDate: reportFrom }, reportNow),
    ).rejects.toBeInstanceOf(ReportFilterValidationError);
    await expect(
      getOperationalReport(
        database,
        { fromDate: "2026-09-21", toDate: "2026-09-18" },
        reportNow,
      ),
    ).rejects.toBeInstanceOf(ReportFilterValidationError);
    await expect(
      getOperationalReport(
        database,
        { fromDate: "2025-01-01", toDate: "2026-01-02" },
        reportNow,
      ),
    ).rejects.toBeInstanceOf(ReportFilterValidationError);
    await expect(
      getOperationalReport(
        database,
        {
          fromDate: reportFrom,
          toDate: reportTo,
          careerId: fixture.activeCareer.id,
          subjectId: fixture.subjects.inactiveCareer.id,
        },
        reportNow,
      ),
    ).rejects.toBeInstanceOf(ReportFilterValidationError);

    const empty = await getOperationalReport(
      database,
      { fromDate: "2024-04-03", toDate: "2024-04-03" },
      reportNow,
    );
    expect(empty.consultationDemand).toMatchObject({ status: "ready", data: { total: 0 } });
    expect(empty.plannedSchedules).toMatchObject({ status: "ready", data: { totalOccurrences: 0 } });
    expect(empty.attendance).toMatchObject({ status: "ready", data: { dueOccurrences: 0 } });
    expect(empty.attendance.status === "ready" && empty.attendance.data.registrationRatePercent)
      .toBeNull();
    expect(empty.activities).toMatchObject({ status: "ready", data: { totalActivities: 0 } });

    await database
      .update(administrativeCycle)
      .set({ status: "CLOSED" })
      .where(eq(administrativeCycle.id, fixture.openCycle.id));
    const withoutOpenCycle = await getOperationalReport(
      database,
      { fromDate: reportFrom, toDate: reportTo },
      reportNow,
    );
    expect(withoutOpenCycle.currentCycle).toEqual({ status: "ready", data: null });
    expect(withoutOpenCycle.subjectCoverage).toEqual({
      status: "unavailable",
      reason: "NO_OPEN_CYCLE",
    });
    expect(withoutOpenCycle.currentBalances).toEqual({
      status: "unavailable",
      reason: "NO_OPEN_CYCLE",
    });
    expect(withoutOpenCycle.consultationDemand).toMatchObject({
      status: "ready",
      data: { total: 4 },
    });
  });
});
