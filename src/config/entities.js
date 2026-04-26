/**
 * Entity registry – maps the entity names used in Camunda BPMN
 * to their PostgreSQL table names and field mappings.
 */

const entities = {
  Student: {
    table: 'students',
    // Maps incoming camelCase JSON keys → DB snake_case columns
    fieldMap: {
      key: 'key',
      email: 'email',
      firstName: 'first_name',
      lastName: 'last_name',
    },
    // Maps DB snake_case → outgoing camelCase JSON keys
    reverseMap: {
      key: 'key',
      email: 'email',
      first_name: 'firstName',
      last_name: 'lastName',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    },
  },

  Events: {
    table: 'events',
    fieldMap: {
      key: 'key',
      studentKey: 'student_key',
      type: 'type',
      isFinalExam: 'is_final_exam',
      subject: 'subject',
      date: 'date',
    },
    reverseMap: {
      key: 'key',
      student_key: 'studentKey',
      type: 'type',
      is_final_exam: 'isFinalExam',
      subject: 'subject',
      date: 'date',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    },
  },

  Timeslots: {
    table: 'timeslots',
    fieldMap: {
      key: 'key',
      subject: 'subject',
      status: 'status',
      timeslot: 'timeslot',
    },
    reverseMap: {
      key: 'key',
      subject: 'subject',
      status: 'status',
      timeslot: 'timeslot',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    },
  },

  AbsenceRequest: {
    table: 'absence_requests',
    fieldMap: {
      key: 'key',
      studentEmail: 'student_email',
      reason: 'reason',
      from: 'from_date',
      to: 'to_date',
      status: 'status',
    },
    reverseMap: {
      key: 'key',
      student_email: 'studentEmail',
      reason: 'reason',
      from_date: 'from',
      to_date: 'to',
      status: 'status',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    },
  },

  SupportCase: {
    table: 'support_cases',
    fieldMap: {
      key: 'key',
      email: 'email',
      supportQuestion: 'support_question',
      status: 'status',
    },
    reverseMap: {
      key: 'key',
      email: 'email',
      support_question: 'supportQuestion',
      status: 'status',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    },
  },

  SupportingDocument: {
    table: 'supporting_documents',
    fieldMap: {
      id: 'id',
      referenceType: 'reference_type',
      referenceKey: 'reference_key',
      documentType: 'document_type',
      fileName: 'file_name',
      contentType: 'content_type',
      sizeBytes: 'size_bytes',
      storeId: 'store_id',
      documentId: 'document_id',
      contentHash: 'content_hash',
    },
    reverseMap: {
      id: 'id',
      reference_type: 'referenceType',
      reference_key: 'referenceKey',
      document_type: 'documentType',
      file_name: 'fileName',
      content_type: 'contentType',
      size_bytes: 'sizeBytes',
      store_id: 'storeId',
      document_id: 'documentId',
      content_hash: 'contentHash',
      created_at: 'createdAt',
    },
  },

  PastConversation: {
    table: 'past_conversations',
    fieldMap: {
      id: 'id',
      email: 'email',
      conversation: 'conversation',
    },
    reverseMap: {
      id: 'id',
      email: 'email',
      conversation: 'conversation',
      created_at: 'createdAt',
    },
  },
};

function getEntityConfig(entityName) {
  return entities[entityName] || null;
}

function mapRowToResponse(row, reverseMap) {
  const result = {};
  for (const [dbCol, jsonKey] of Object.entries(reverseMap)) {
    if (row[dbCol] !== undefined) {
      // Convert booleans stored as strings
      let val = row[dbCol];
      if (val === 'true') val = true;
      if (val === 'false') val = false;
      result[jsonKey] = val;
    }
  }
  return result;
}

function mapBodyToColumns(body, fieldMap) {
  const columns = [];
  const values = [];
  for (const [jsonKey, dbCol] of Object.entries(fieldMap)) {
    if (jsonKey === 'key' || jsonKey === 'id') continue; // auto-generated
    if (body[jsonKey] !== undefined) {
      columns.push(`"${dbCol}"`);
      values.push(body[jsonKey]);
    }
  }
  return { columns, values };
}

module.exports = { getEntityConfig, mapRowToResponse, mapBodyToColumns, entities };
