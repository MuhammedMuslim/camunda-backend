/**
 * Database migration script.
 * Creates all tables derived from the Camunda BPMN process definitions & payloads.
 *
 * Uses `DATABASE_URL` (Supabase) or `PGHOST` / `PG*` from `.env`.
 * Prefer Supabase **Session** or **Direct** URI for DDL; avoid Transaction pooler for migrations if you see connection errors.
 */
require('dotenv').config();
const { pool } = require('../config/database');

const migration = `
-- ============================================================
-- Students
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  key           SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  first_name    VARCHAR(255) NOT NULL,
  last_name     VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_email ON students (email);

-- ============================================================
-- Events  (exams, classes, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  key           SERIAL PRIMARY KEY,
  student_key   INTEGER      NOT NULL REFERENCES students(key) ON DELETE CASCADE,
  type          VARCHAR(255) NOT NULL,
  is_final_exam BOOLEAN      NOT NULL DEFAULT FALSE,
  subject       VARCHAR(255) NOT NULL,
  date          DATE         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_student_key ON events (student_key);

-- ============================================================
-- Timeslots (Scheduling agent — BPMN: search by subject/status, PUT timeslot + status)
-- ============================================================
CREATE TABLE IF NOT EXISTS timeslots (
  key           SERIAL PRIMARY KEY,
  subject       VARCHAR(255) NOT NULL,
  status        VARCHAR(50)  NOT NULL DEFAULT 'Free',
  timeslot      VARCHAR(500),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeslots_subject_status ON timeslots (subject, status);

-- ============================================================
-- Absence Requests
-- ============================================================
CREATE TABLE IF NOT EXISTS absence_requests (
  key              SERIAL PRIMARY KEY,
  student_email    VARCHAR(255) NOT NULL,
  reason           VARCHAR(255) NOT NULL,
  from_date        DATE         NOT NULL,
  to_date          DATE         NOT NULL,
  status           VARCHAR(50)  NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_absence_requests_email ON absence_requests (student_email);

-- ============================================================
-- Supporting Documents
-- ============================================================
CREATE TABLE IF NOT EXISTS supporting_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type   VARCHAR(50)  NOT NULL,
  reference_key    INTEGER      NOT NULL,
  document_type    VARCHAR(100) NOT NULL DEFAULT 'camunda',
  file_name        VARCHAR(500),
  content_type     VARCHAR(255),
  size_bytes       INTEGER,
  store_id         VARCHAR(100),
  document_id      VARCHAR(255),
  content_hash     VARCHAR(255),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Support Cases
-- ============================================================
CREATE TABLE IF NOT EXISTS support_cases (
  key              SERIAL PRIMARY KEY,
  email            VARCHAR(255) NOT NULL,
  support_question TEXT         NOT NULL,
  status           VARCHAR(50)  NOT NULL DEFAULT 'open',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Past Conversations (used by the Support Agent KB)
-- ============================================================
CREATE TABLE IF NOT EXISTS past_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            VARCHAR(255) NOT NULL,
  conversation     TEXT         NOT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
`;

async function migrate() {
  console.log('Running migrations...');
  try {
    await pool.query(migration);
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
