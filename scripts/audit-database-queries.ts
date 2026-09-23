import path from "node:path";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { databaseSchema } from "../src/db/schema";

async function startAudit() {
  const container = await new PostgreSqlContainer("postgres:16.4-alpine")
    .withDatabase("sgta_query_audit")
    .withUsername("sgta_audit")
    .withPassword("sgta_audit_password")
    .start();

  const pool = new Pool({
    connectionString: container.getConnectionUri(),
    max: 5,
  });
  const db = drizzle(pool, { schema: databaseSchema });

async function main() {
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });
  await migrate(db, { migrationsFolder });
  await pool.query(`
    DROP INDEX hour_movement_movement_date_idx;
    DROP INDEX consultation_staging_pending_queue_idx;
    CREATE INDEX consultation_staging_review_updated_idx
      ON consultation_staging (status, updated_at);
  `);

  const seedStatements = `
    INSERT INTO "user" (id, name, email, email_verified, role, enabled)
    VALUES ('query-audit-admin', 'Query Audit Admin', 'query-audit-admin@example.test', TRUE, 'ADMIN', TRUE);

    INSERT INTO career (id, name, normalized_name)
    VALUES (md5('query-audit-career')::uuid, 'Synthetic Career', 'synthetic career');

    INSERT INTO administrative_cycle (id, name, start_date, end_date, status)
    SELECT
      md5('query-audit-cycle-' || year)::uuid,
      'Synthetic ' || year,
      make_date(year, 1, 1),
      make_date(year, 12, 31),
      CASE WHEN year = 2025 THEN 'OPEN'::administrative_cycle_status ELSE 'CLOSED'::administrative_cycle_status END
    FROM generate_series(2021, 2025) AS year;

    INSERT INTO tutor (id, first_name, last_name, primary_career_id, status)
    SELECT
      md5('query-audit-tutor-' || n)::uuid,
      'Tutor' || n,
      'Surname' || (n % 67),
      md5('query-audit-career')::uuid,
      CASE WHEN n % 5 = 0 THEN 'INACTIVE'::record_status ELSE 'ACTIVE'::record_status END
    FROM generate_series(1, 1000) AS n;

    INSERT INTO tutor_cycle_membership (tutor_id, cycle_id)
    SELECT tutor.id, cycle.id
    FROM tutor
    CROSS JOIN administrative_cycle AS cycle;

    INSERT INTO hour_category (id, name, normalized_name)
    VALUES (md5('query-audit-category')::uuid, 'Synthetic Activity', 'synthetic activity');

    INSERT INTO hour_movement (
      id, cycle_id, tutor_id, category_id, direction, duration_minutes,
      movement_date, actor_id, created_at
    )
    SELECT
      md5('query-audit-movement-' || n)::uuid,
      md5('query-audit-cycle-' || EXTRACT(YEAR FROM (DATE '2021-01-01' + ((n - 1) % 1826)::integer))::integer)::uuid,
      md5('query-audit-tutor-' || (((n - 1) % 1000) + 1))::uuid,
      md5('query-audit-category')::uuid,
      CASE WHEN n % 2 = 0 THEN 'CREDIT'::hour_movement_direction ELSE 'DEBIT'::hour_movement_direction END,
      30 + (n % 240),
      DATE '2021-01-01' + ((n - 1) % 1826)::integer,
      'query-audit-admin',
      (DATE '2021-01-01' + ((n - 1) % 1826)::integer + TIME '12:00') AT TIME ZONE 'UTC'
    FROM generate_series(1, 150000) AS n;

    INSERT INTO schedule_plan (id, cycle_id, name, kind, valid_from, valid_to)
    SELECT md5('query-audit-plan-' || EXTRACT(YEAR FROM cycle.start_date)::integer)::uuid,
      cycle.id,
      'Synthetic regular plan',
      'REGULAR',
      cycle.start_date,
      cycle.end_date
    FROM administrative_cycle AS cycle;

    INSERT INTO schedule_assignment (
      id, plan_id, tutor_id, pattern, weekday, start_minutes, end_minutes, kind, status
    )
    SELECT
      md5('query-audit-assignment-' || EXTRACT(YEAR FROM cycle.start_date)::integer || '-' || tutor.id)::uuid,
      md5('query-audit-plan-' || EXTRACT(YEAR FROM cycle.start_date)::integer)::uuid,
      tutor.id,
      'WEEKDAY',
      1,
      480 + (row_number() OVER (PARTITION BY cycle.id ORDER BY tutor.id) % 600)::integer,
      540 + (row_number() OVER (PARTITION BY cycle.id ORDER BY tutor.id) % 600)::integer,
      'DUTY',
      tutor.status
    FROM administrative_cycle AS cycle
    CROSS JOIN tutor;

    INSERT INTO duty_occurrence (
      id, cycle_id, plan_id, assignment_id, tutor_id, occurrence_date,
      start_minutes, end_minutes, kind
    )
    SELECT
      md5('query-audit-occurrence-' || assignment.id || '-' || occurrence_date)::uuid,
      plan.cycle_id,
      plan.id,
      assignment.id,
      assignment.tutor_id,
      occurrence_date,
      assignment.start_minutes,
      assignment.end_minutes,
      assignment.kind
    FROM schedule_assignment AS assignment
    INNER JOIN schedule_plan AS plan ON plan.id = assignment.plan_id
    CROSS JOIN LATERAL generate_series(0, 19) AS week_number
    CROSS JOIN LATERAL (
      SELECT date_trunc('week', make_date(EXTRACT(YEAR FROM plan.valid_from)::integer, 1, 1)::timestamp)::date
        + (week_number * 7)::integer AS occurrence_date
    ) AS dates;

    INSERT INTO consultation_import_run (
      id, actor_id, status, source_spreadsheet_id, source_range, completed_at
    )
    VALUES (
      md5('query-audit-run')::uuid,
      'query-audit-admin',
      'SUCCEEDED',
      'query-audit-source',
      'A:K',
      NOW()
    );

    INSERT INTO consultation_staging (
      id, source_provider, source_spreadsheet_id, source_tab, source_row_key,
      source_fingerprint, first_seen_run_id, last_seen_run_id, raw_student_first_name,
      raw_student_last_name, normalized_consultation_date, career_id, tutor_id,
      normalized_student_first_name, normalized_student_last_name, status,
      classification, reviewed_by, reviewed_at, updated_at
    )
    SELECT
      md5('query-audit-staging-' || n)::uuid,
      'GOOGLE_SHEETS',
      'query-audit-source',
      'Consultations',
      n::text,
      repeat('a', 64),
      md5('query-audit-run')::uuid,
      md5('query-audit-run')::uuid,
      'Student',
      n::text,
      DATE '2021-01-01' + ((n - 1) % 1826)::integer,
      md5('query-audit-career')::uuid,
      md5('query-audit-tutor-' || (((n - 1) % 1000) + 1))::uuid,
      'student',
      n::text,
      CASE WHEN n % 5 = 0 THEN 'PENDING_REVIEW'::consultation_staging_status ELSE 'CONSOLIDATED'::consultation_staging_status END,
      CASE WHEN n % 5 = 0 THEN 'PENDING_CLASSIFICATION'::consultation_classification ELSE 'GENERAL'::consultation_classification END,
      CASE WHEN n % 5 = 0 THEN NULL ELSE 'query-audit-admin' END,
      CASE WHEN n % 5 = 0 THEN NULL ELSE NOW() END,
      DATE '2021-01-01' + ((n - 1) % 1826)::integer
    FROM generate_series(1, 75000) AS n;

    INSERT INTO consultation (
      id, staging_id, cycle_id, consultation_date, student_first_name,
      student_last_name, career_id, tutor_id, classification
    )
    SELECT
      md5('query-audit-consultation-' || n)::uuid,
      md5('query-audit-staging-' || n)::uuid,
      md5('query-audit-cycle-' || EXTRACT(YEAR FROM (DATE '2021-01-01' + ((n - 1) % 1826)::integer))::integer)::uuid,
      DATE '2021-01-01' + ((n - 1) % 1826)::integer,
      'Student',
      n::text,
      md5('query-audit-career')::uuid,
      md5('query-audit-tutor-' || (((n - 1) % 1000) + 1))::uuid,
      'GENERAL'
    FROM generate_series(1, 75000) AS n
    WHERE n % 5 <> 0;

    ANALYZE;
  `;

  for (const statement of seedStatements.split(";").map((sql) => sql.trim()).filter(Boolean)) {
    console.log(`Seeding ${statement.split(/\s+/, 2).join(" ")}`);
    await pool.query(statement);
  }

  const tableSizes = await pool.query(`
    SELECT relname, n_live_tup
    FROM pg_stat_user_tables
    WHERE relname IN ('tutor', 'consultation', 'consultation_staging', 'duty_occurrence', 'hour_movement')
    ORDER BY relname;
  `);
  console.log("Synthetic table rows:");
  for (const row of tableSizes.rows) {
    console.log(`  ${row.relname}: ${row.n_live_tup}`);
  }

  const plans = [
    {
      title: "Tutor active list page (bounded 50 rows)",
      query: `SELECT tutor.id, tutor.first_name, tutor.last_name, career.name
        FROM tutor INNER JOIN career ON career.id = tutor.primary_career_id
        WHERE tutor.status = 'ACTIVE'
        ORDER BY lower(tutor.last_name), lower(tutor.first_name), tutor.id
        LIMIT 50 OFFSET 0`,
    },
    {
      title: "Consultation pending review queue page (bounded 50 rows)",
      query: `SELECT id, normalized_consultation_date
        FROM consultation_staging
        WHERE status = 'PENDING_REVIEW'
        ORDER BY normalized_consultation_date ASC, id ASC
        LIMIT 50 OFFSET 0`,
    },
    {
      title: "Consultation demand report for a month",
      query: `SELECT career_id, count(*)
        FROM consultation
        WHERE consultation_date BETWEEN DATE '2025-07-01' AND DATE '2025-07-31'
        GROUP BY career_id`,
    },
    {
      title: "Attendance date read (cycle and day, ordered by start time)",
      query: `SELECT id, start_minutes, end_minutes
        FROM duty_occurrence
        WHERE cycle_id = md5('query-audit-cycle-2025')::uuid
          AND occurrence_date = DATE '2025-03-03'
        ORDER BY start_minutes, id`,
    },
    {
      title: "Tutor movement history (cycle and owner, newest first, limit 100)",
      query: `SELECT id, movement_date, created_at
        FROM hour_movement
        WHERE cycle_id = md5('query-audit-cycle-2025')::uuid
          AND tutor_id = md5('query-audit-tutor-7')::uuid
        ORDER BY created_at DESC, id DESC
        LIMIT 100`,
    },
    {
      title: "Admin movement-derived balances for the current cycle",
      query: `SELECT tutor_id,
          sum(CASE WHEN direction = 'CREDIT' THEN duration_minutes ELSE -duration_minutes END)
        FROM hour_movement
        WHERE cycle_id = md5('query-audit-cycle-2025')::uuid
        GROUP BY tutor_id`,
    },
    {
      title: "Hour report activity totals for a month (candidate movement-date index)",
      query: `SELECT count(*) FILTER (WHERE direction = 'CREDIT'),
          count(*) FILTER (WHERE direction = 'DEBIT'),
          coalesce(sum(duration_minutes) FILTER (WHERE direction = 'CREDIT'), 0),
          coalesce(sum(duration_minutes) FILTER (WHERE direction = 'DEBIT'), 0)
        FROM hour_movement
        WHERE movement_date BETWEEN DATE '2025-07-01' AND DATE '2025-07-31'`,
    },
  ];

  async function printPlan(title: string, query: string) {
    const result = await pool.query<{ "QUERY PLAN": string }>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${query}`,
    );
    console.log(`\n${title}\n${result.rows.map((row) => row["QUERY PLAN"]).join("\n")}`);
  }

  console.log("\nPlans before candidate indexes:");
  for (const plan of plans) {
    await printPlan(plan.title, plan.query);
  }

  await pool.query(`
    DROP INDEX consultation_staging_review_updated_idx;
    CREATE INDEX hour_movement_movement_date_idx
      ON hour_movement (movement_date);
    CREATE INDEX consultation_staging_pending_queue_idx
      ON consultation_staging (normalized_consultation_date, id)
      WHERE status = 'PENDING_REVIEW';
    ANALYZE hour_movement;
    ANALYZE consultation_staging;
  `);

  console.log("\nPlans after the two candidate indexes:");
  await printPlan(plans[1]!.title, plans[1]!.query);
  await printPlan(plans[6]!.title, plans[6]!.query);
}

try {
  await main();
} finally {
  await pool.end();
  await container.stop();
}
}

void startAudit();
