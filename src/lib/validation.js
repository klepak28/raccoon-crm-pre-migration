import { httpError } from './http.js';

export const UNSUPPORTED_V1_FIELDS = [
  'recurrence',
  'recurrenceRule',
  'repeat',
  'repeats',
  'recurringSeriesId',
  'occurrenceId',
  'occurrence',
  'invoice',
  'invoiceId',
  'invoiceStatus',
  'billing',
  'billingType',
  'payment',
  'paymentMethod',
  'autoInvoice',
  'autoInvoiceRule',
  'invoiceReminderRule',
];

export function assertNoUnsupportedV1Fields(input) {
  const unsupported = UNSUPPORTED_V1_FIELDS.filter((field) => field in (input || {}));
  if (unsupported.length > 0) {
    throw httpError(400, 'UNSUPPORTED_V1_FIELDS', 'Payload contains fields outside the approved V1 slice', {
      unsupportedFields: unsupported,
    });
  }
}

export function assertEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw httpError(400, 'INVALID_ENUM', `${fieldName} must be one of: ${allowed.join(', ')}`, {
      field: fieldName,
      allowed,
    });
  }
}

export function assertRequired(condition, code, message, details = undefined) {
  if (!condition) throw httpError(400, code, message, details);
}

export function asTrimmedString(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function normalizeTags(value) {
  if (!value) return [];
  const source = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(source.map((item) => String(item).trim()).filter(Boolean))];
}
