import type { Database } from "../../src/db/client-core";
import {
  activity, administrativeCycle, career, consultation, consultationImportRun,
  consultationStaging, hourCategory, hourMovement, scheduleAssignment, schedulePlan,
  session, subject, tutor, tutorCycleMembership, tutorSubject, user,
} from "../../src/db/schema";
import { CAREER_COLORS } from "../../src/shared/career-color";

export const DEMO_FIXED_NOW = "2026-09-16T15:00:00.000Z";
export const DEMO_SESSION_TOKENS = {
  admin: "demo-admin-session-token",
  tutor: "demo-tutor-session-token",
  forbidden: "demo-forbidden-session-token",
} as const;

// Stable IDs also provide deterministic tie-breaking for database ordering.
function demoId(value: number) {
  return `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
}

export const DEMO_CYCLE_ID = demoId(1);
export const DEMO_PLAN_ID = demoId(2);
export const DEMO_PRIMARY_TUTOR_ID = demoId(100);
export const DEMO_ADMIN_USER_ID = "demo-admin";
export const DEMO_TUTOR_USER_ID = "demo-tutor";
export const DEMO_FORBIDDEN_USER_ID = "demo-forbidden";

const careers = [
  { name: "Ingeniería en Sistemas de Información", subjects: ["Análisis Matemático I", "Algoritmos y Estructuras de Datos", "Álgebra y Geometría Analítica"] },
  { name: "Ingeniería Electromecánica", subjects: ["Física I", "Estabilidad", "Electrotecnia"] },
  { name: "Ingeniería Química", subjects: ["Química General", "Química Orgánica", "Termodinámica"] },
  { name: "Licenciatura en Administración Rural", subjects: ["Economía", "Administración General", "Estadística"] },
  { name: "Tecnicatura Universitaria en Programación", subjects: ["Programación I", "Laboratorio de Computación", "Base de Datos"] },
];

const tutors = [
  { firstName: "Lucía", lastName: "Benítez", careerIndex: 0 },
  { firstName: "Martín", lastName: "Acosta", careerIndex: 1 },
  { firstName: "Valentina", lastName: "Romero", careerIndex: 2 },
  { firstName: "Joaquín", lastName: "Duarte", careerIndex: 3 },
  { firstName: "Camila", lastName: "Ferreyra", careerIndex: 4 },
  { firstName: "Tomás", lastName: "Quiroga", careerIndex: 0 },
  { firstName: "Florencia", lastName: "Medina", careerIndex: 1 },
  { firstName: "Agustín", lastName: "Sosa", careerIndex: 2 },
];

export async function seedDemoDatabase(database: Database) {
  const fixedDate = new Date(DEMO_FIXED_NOW);
  const timestamps = { createdAt: fixedDate, updatedAt: fixedDate };
  await database.insert(user).values([
    { id: DEMO_ADMIN_USER_ID, name: "Coordinación de Tutorías", email: "coordinacion@example.test", role: "ADMIN" as const },
    { id: DEMO_TUTOR_USER_ID, name: "Lucía Benítez", email: "lucia.benitez@example.test", role: "TUTOR" as const },
    { id: DEMO_FORBIDDEN_USER_ID, name: "Sofía Pérez", email: "sofia.perez@example.test", role: "TUTOR" as const },
  ].map((record) => ({ ...record, ...timestamps, emailVerified: true, enabled: true })));
  await database.insert(session).values([
    { userId: DEMO_ADMIN_USER_ID, token: DEMO_SESSION_TOKENS.admin },
    { userId: DEMO_TUTOR_USER_ID, token: DEMO_SESSION_TOKENS.tutor },
    { userId: DEMO_FORBIDDEN_USER_ID, token: DEMO_SESSION_TOKENS.forbidden },
  ].map((record) => ({
    ...record, ...timestamps, id: `${record.userId}-session`,
    expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
  })));
  await database.insert(administrativeCycle).values({
    id: DEMO_CYCLE_ID, name: "2026", startDate: "2026-01-01", endDate: "2026-12-31",
    status: "OPEN", ...timestamps,
  });
  await database.insert(career).values(careers.map((record, index) => ({
    id: demoId(10 + index), name: record.name, normalizedName: record.name.toLowerCase(),
    color: CAREER_COLORS[index], ...timestamps,
  })));
  await database.insert(subject).values(careers.flatMap((record, careerIndex) =>
    record.subjects.map((name, index) => ({
      id: demoId(30 + careerIndex * 3 + index), careerId: demoId(10 + careerIndex),
      name, normalizedName: name.toLowerCase(), ...timestamps,
    })),
  ));
  await database.insert(tutor).values(tutors.map((record, index) => ({
    id: demoId(100 + index), firstName: record.firstName, lastName: record.lastName,
    preferredDisplayName: record.firstName, primaryCareerId: demoId(10 + record.careerIndex),
    applicationUserId: index === 0 ? DEMO_TUTOR_USER_ID : null,
    institutionalIdentifier: `DEMO-${index + 1}`, normalizedInstitutionalIdentifier: `demo-${index + 1}`,
    ...timestamps,
  })));
  await database.insert(tutorCycleMembership).values(tutors.map((_, index) => ({
    tutorId: demoId(100 + index), cycleId: DEMO_CYCLE_ID, ...timestamps,
  })));
  await database.insert(tutorSubject).values(tutors.flatMap((record, index) =>
    careers[record.careerIndex].subjects.slice(0, index % 2 === 0 ? 3 : 2).map((_, subjectIndex) => ({
      tutorId: demoId(100 + index), subjectId: demoId(30 + record.careerIndex * 3 + subjectIndex),
      createdAt: fixedDate,
    })),
  ));
  await database.insert(schedulePlan).values({
    id: DEMO_PLAN_ID, cycleId: DEMO_CYCLE_ID, name: "Horario regular 2026", kind: "REGULAR",
    validFrom: "2026-01-01", validTo: "2026-12-31", ...timestamps,
  });
  // Three shifts span 08:00–20:00. The last shift has one in-person Tutor.
  await database.insert(scheduleAssignment).values([1, 2, 3, 4, 5].flatMap((weekday) =>
    [0, 1, 2, 3, 4].map((slot) => ({
      id: demoId(200 + weekday * 10 + slot), planId: DEMO_PLAN_ID,
      tutorId: demoId(100 + (weekday + slot - 1) % tutors.length),
      pattern: "WEEKDAY" as const, weekday,
      startMinutes: 480 + Math.floor(slot / 2) * 240,
      endMinutes: 720 + Math.floor(slot / 2) * 240,
      modality: "IN_PERSON" as const, ...timestamps,
    })),
  ));
  await database.insert(scheduleAssignment).values({
    id: demoId(299), planId: DEMO_PLAN_ID, tutorId: demoId(105), pattern: "WEEKDAY",
    weekday: 3, startMinutes: 1080, endMinutes: 1200, modality: "VIRTUAL", ...timestamps,
  });
  await database.insert(hourCategory).values([
    { id: demoId(300), name: "Guardia de tutoría", normalizedName: "guardia de tutoría" },
    { id: demoId(301), name: "Reunión de coordinación", normalizedName: "reunión de coordinación", activityKind: "MEETING" as const },
    { id: demoId(302), name: "Recuperación de horas", normalizedName: "recuperación de horas", activityKind: "RECOVERY" as const },
  ].map((record) => ({ ...record, ...timestamps })));
  await database.insert(activity).values({
    id: demoId(310), cycleId: DEMO_CYCLE_ID, kind: "RECOVERY", activityDate: "2026-09-15",
    durationMinutes: 90, note: "Recuperación de guardia", actorId: DEMO_ADMIN_USER_ID, createdAt: fixedDate,
  });
  await database.insert(hourMovement).values(tutors.map((_, index) => ({
    id: demoId(400 + index), cycleId: DEMO_CYCLE_ID, tutorId: demoId(100 + index),
    categoryId: demoId(300), direction: index % 3 === 2 ? "DEBIT" as const : "CREDIT" as const,
    durationMinutes: 60 + index * 30, movementDate: "2026-09-14",
    note: "Registro de guardia", actorId: DEMO_ADMIN_USER_ID,
    createdAt: new Date(`2026-09-14T${String(10 + index).padStart(2, "0")}:00:00.000Z`),
  })));
  await database.insert(hourMovement).values([
    { id: demoId(420), tutorId: demoId(101), categoryId: demoId(300), direction: "DEBIT" as const, durationMinutes: 90, reversalOfMovementId: demoId(401), note: "Corrección del registro de guardia" },
    { id: demoId(421), tutorId: DEMO_PRIMARY_TUTOR_ID, categoryId: demoId(302), direction: "CREDIT" as const, durationMinutes: 90, activityId: demoId(310), note: "Recuperación de guardia" },
  ].map((record, index) => ({
    ...record, cycleId: DEMO_CYCLE_ID, movementDate: "2026-09-15", actorId: DEMO_ADMIN_USER_ID,
    createdAt: new Date(`2026-09-15T${10 + index}:00:00.000Z`),
  })));
  const runId = demoId(500);
  await database.insert(consultationImportRun).values({
    id: runId, actorId: DEMO_ADMIN_USER_ID, status: "SUCCEEDED",
    sourceSpreadsheetId: "demo_consultations", sourceRange: "Consultas!A:I",
    newRows: 10, reviewRows: 2, startedAt: fixedDate, completedAt: fixedDate,
  });
  const students = ["Paula", "Nicolás", "Julieta", "Bruno", "Emilia", "Santiago", "Abril", "Mateo", "Delfina", "Lautaro"];
  for (let index = 0; index < students.length; index++) {
    const record = tutors[index % tutors.length];
    const pending = index >= 8;
    const subjectId = demoId(30 + record.careerIndex * 3);
    const consultationDate = `2026-09-${String(7 + index).padStart(2, "0")}`;
    const studentFirstName = students[index];
    const studentLastName = "González";
    const topic = careers[record.careerIndex].subjects[0];
    await database.insert(consultationStaging).values({
      id: demoId(600 + index), sourceSpreadsheetId: "demo_consultations", sourceTab: "Consultas",
      sourceRowKey: String(index + 2), sourceFingerprint: (index + 1).toString(16).padStart(64, "0"),
      firstSeenRunId: runId, lastSeenRunId: runId,
      rawCareer: careers[record.careerIndex].name, careerId: demoId(10 + record.careerIndex),
      rawTutor: record.firstName, tutorId: demoId(100 + index % tutors.length),
      rawStudentFirstName: studentFirstName, rawStudentLastName: studentLastName,
      normalizedStudentFirstName: studentFirstName, normalizedStudentLastName: studentLastName,
      rawConsultationDate: consultationDate, normalizedConsultationDate: consultationDate,
      rawTopic: topic, normalizedTopic: topic, rawModality: "Presencial", normalizedModality: "Presencial",
      rawAcademicStage: "Primer año", normalizedAcademicStage: "Primer año",
      status: pending ? "PENDING_REVIEW" : "CONSOLIDATED",
      classification: pending ? "PENDING_CLASSIFICATION" : "SUBJECT", subjectId: pending ? null : subjectId,
      suggestedSubjectId: pending ? subjectId : null,
      reviewedBy: pending ? null : DEMO_ADMIN_USER_ID, reviewedAt: pending ? null : fixedDate,
      firstSeenAt: fixedDate, lastSeenAt: fixedDate, ...timestamps,
    });
    if (!pending) {
      await database.insert(consultation).values({
        id: demoId(700 + index), stagingId: demoId(600 + index), cycleId: DEMO_CYCLE_ID,
        consultationDate, studentFirstName, studentLastName, studentContact: `estudiante.${index + 1}@example.test`,
        careerId: demoId(10 + record.careerIndex), tutorId: demoId(100 + index % tutors.length),
        academicStage: "Primer año", modality: "Presencial", rawTopic: topic,
        classification: "SUBJECT", subjectId, ...timestamps,
      });
    }
  }
}
