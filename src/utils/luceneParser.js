/**
 * Lightweight Lucene-style query parser.
 *
 * Supports the patterns used by the Camunda RSP connector:
 *   - "email:ahmed.mahmoud@code81.com"
 *   - "studentKey:3"
 *   - "subject:Physics AND status:Free"   (timeslots)
 *   - "from:2026-05-09 AND to:2026-05-09"  (absence_requests → from_date / to_date)
 *   - "firstName:Ahmed AND lastName:Mahmoud"
 *
 * Returns { whereClause: string, params: any[] } ready for pg.
 */

// Column name mapping – Camunda uses camelCase, Postgres uses snake_case.
const COLUMN_MAP = {
  email: 'email',
  studentemail: 'student_email',
  firstname: 'first_name',
  lastname: 'last_name',
  studentkey: 'student_key',
  isfinalexam: 'is_final_exam',
  subject: 'subject',
  type: 'type',
  date: 'date',
  status: 'status',
  reason: 'reason',
  supportquestion: 'support_question',
  fromdate: 'from_date',
  todate: 'to_date',
  from: 'from_date',
  to: 'to_date',
  key: 'key',
  timeslot: 'timeslot',
};

function parseLuceneQuery(luceneQuery) {
  if (!luceneQuery || typeof luceneQuery !== 'string' || luceneQuery.trim() === '') {
    return { whereClause: '1=1', params: [] };
  }

  // Split on AND (case-insensitive)
  const parts = luceneQuery.split(/\s+AND\s+/i);
  const conditions = [];
  const params = [];

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;

    const rawField = part.substring(0, colonIdx).trim();
    const value = part.substring(colonIdx + 1).trim();
    const field = COLUMN_MAP[rawField.toLowerCase()] || rawField.toLowerCase();

    params.push(value);
    conditions.push(`"${field}" = $${params.length}`);
  }

  if (conditions.length === 0) {
    return { whereClause: '1=1', params: [] };
  }

  return { whereClause: conditions.join(' AND '), params };
}

module.exports = { parseLuceneQuery };
