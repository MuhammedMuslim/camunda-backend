/**
 * Seed script – populates the database with sample data
 * matching the payloads.json from the Camunda modeler files.
 */
require('dotenv').config();
const { pool } = require('../config/database');

async function seed() {
  console.log('Seeding database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Students ──────────────────────────────────────────────
    await client.query(`
      INSERT INTO students (key, email, first_name, last_name)
      VALUES
        (1, 'marco.lopes@camunda.com', 'Marco', 'Lopes'),
        (2, 'john.doe@code81.com',     'John',  'Doe'),
        (3, 'ahmed.mahmoud@code81.com', 'Ahmed', 'Mahmoud')
      ON CONFLICT (key) DO NOTHING
    `);
    // Reset the sequence
    await client.query(`SELECT setval('students_key_seq', (SELECT COALESCE(MAX(key),0) FROM students))`);

    // ── Events ───────────────────────────────────────────────
    await client.query(`
      INSERT INTO events (key, student_key, type, is_final_exam, subject, date)
      VALUES
        (1, 1, 'Exam Math',     FALSE, 'Math',     '2026-04-15'),
        (2, 2, 'Exam Chemistry', FALSE, 'Chemistry','2026-04-20'),
        (3, 2, 'Lab Biology',    FALSE, 'Biology',  '2026-04-22'),
        (4, 3, 'Exam Physics',   TRUE,  'Physics',  '2026-04-10')
      ON CONFLICT (key) DO NOTHING
    `);
    await client.query(`SELECT setval('events_key_seq', (SELECT COALESCE(MAX(key),0) FROM events))`);

    // ── Timeslots ─────────────────────────────────────────────
    await client.query(`
      INSERT INTO timeslots (key, subject, status, timeslot)
      VALUES
        (1, 'Physics',  'Free', 'Mon 2026-04-28 09:00–10:00'),
        (2, 'Physics',  'Free', 'Mon 2026-04-28 14:00–15:00'),
        (3, 'Chemistry','Taken','Tue 2026-04-29 10:00–11:00')
      ON CONFLICT (key) DO NOTHING
    `);
    await client.query(`SELECT setval('timeslots_key_seq', (SELECT COALESCE(MAX(key),0) FROM timeslots))`);

    // ── Absence Requests ─────────────────────────────────────
    await client.query(`
      INSERT INTO absence_requests (key, student_email, reason, from_date, to_date, status)
      VALUES
        (1, 'ahmed.mahmoud@code81.com', 'Medical', '2026-05-09', '2026-05-09', 'pending')
      ON CONFLICT (key) DO NOTHING
    `);
    await client.query(`SELECT setval('absence_requests_key_seq', (SELECT COALESCE(MAX(key),0) FROM absence_requests))`);

    // ── Support Cases ────────────────────────────────────────
    await client.query(`
      INSERT INTO support_cases (key, email, support_question, status)
      VALUES
        (1, 'ahmed.mahmoud@code81.com', 'error', 'open')
      ON CONFLICT (key) DO NOTHING
    `);
    await client.query(`SELECT setval('support_cases_key_seq', (SELECT COALESCE(MAX(key),0) FROM support_cases))`);

    await client.query('COMMIT');
    console.log('Seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
