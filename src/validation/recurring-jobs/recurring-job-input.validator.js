import { httpError } from '../../lib/http.js';
import { isIsoDate, isIsoDateTime } from '../../lib/time.js';
import { assertRequired, asTrimmedString, normalizeTags } from '../../lib/validation.js';

const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];
const VALID_END_MODES = ['never', 'after_n_occurrences', 'on_date'];
const VALID_DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const VALID_ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'last'];
const VALID_MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export function validateRecurrenceInput(input) {
  assertRequired(input, 'RECURRENCE_REQUIRED', 'Recurrence rule is required');

  const recurrenceFrequency = asTrimmedString(input.recurrenceFrequency);
  assertRequired(
    VALID_FREQUENCIES.includes(recurrenceFrequency),
    'INVALID_FREQUENCY',
    `recurrenceFrequency must be one of: ${VALID_FREQUENCIES.join(', ')}`,
  );

  const recurrenceInterval = Number(input.recurrenceInterval) || 1;
  if (recurrenceInterval < 1 || recurrenceInterval > 999) {
    throw httpError(400, 'INVALID_INTERVAL', 'recurrenceInterval must be between 1 and 999');
  }

  const recurrenceEndMode = asTrimmedString(input.recurrenceEndMode || 'never');
  assertRequired(
    VALID_END_MODES.includes(recurrenceEndMode),
    'INVALID_END_MODE',
    `recurrenceEndMode must be one of: ${VALID_END_MODES.join(', ')}`,
  );

  let recurrenceOccurrenceCount = null;
  if (recurrenceEndMode === 'after_n_occurrences') {
    recurrenceOccurrenceCount = Number(input.recurrenceOccurrenceCount);
    if (!recurrenceOccurrenceCount || recurrenceOccurrenceCount < 1) {
      throw httpError(400, 'INVALID_OCCURRENCE_COUNT', 'recurrenceOccurrenceCount must be at least 1');
    }
  }

  let recurrenceEndDate = null;
  if (recurrenceEndMode === 'on_date') {
    recurrenceEndDate = asTrimmedString(input.recurrenceEndDate);
    if (!recurrenceEndDate || !isIsoDate(recurrenceEndDate)) {
      throw httpError(400, 'INVALID_END_DATE', 'recurrenceEndDate must be a valid YYYY-MM-DD date');
    }
  }

  let recurrenceDayOfWeek = [];
  if (input.recurrenceDayOfWeek) {
    recurrenceDayOfWeek = (Array.isArray(input.recurrenceDayOfWeek)
      ? input.recurrenceDayOfWeek
      : [input.recurrenceDayOfWeek]
    ).map((d) => String(d).toUpperCase().trim());

    for (const day of recurrenceDayOfWeek) {
      if (!VALID_DAYS_OF_WEEK.includes(day)) {
        throw httpError(400, 'INVALID_DAY_OF_WEEK', `Invalid day of week: ${day}`);
      }
    }
  }

  let recurrenceDayOfMonth = null;
  if (input.recurrenceDayOfMonth != null) {
    recurrenceDayOfMonth = Number(input.recurrenceDayOfMonth);
    if (recurrenceDayOfMonth < 1 || recurrenceDayOfMonth > 31) {
      throw httpError(400, 'INVALID_DAY_OF_MONTH', 'recurrenceDayOfMonth must be between 1 and 31');
    }
  }

  let recurrenceOrdinal = null;
  if (input.recurrenceOrdinal) {
    recurrenceOrdinal = asTrimmedString(input.recurrenceOrdinal).toLowerCase();
    if (!VALID_ORDINALS.includes(recurrenceOrdinal)) {
      throw httpError(400, 'INVALID_ORDINAL', `recurrenceOrdinal must be one of: ${VALID_ORDINALS.join(', ')}`);
    }
  }

  let recurrenceMonthOfYear = null;
  if (input.recurrenceMonthOfYear) {
    recurrenceMonthOfYear = asTrimmedString(input.recurrenceMonthOfYear).toUpperCase();
    if (!VALID_MONTHS.includes(recurrenceMonthOfYear)) {
      throw httpError(400, 'INVALID_MONTH', `recurrenceMonthOfYear must be one of: ${VALID_MONTHS.join(', ')}`);
    }
  }

  // Validate frequency-specific constraints
  if (recurrenceFrequency === 'monthly') {
    if (recurrenceOrdinal && recurrenceDayOfWeek.length === 0) {
      throw httpError(400, 'ORDINAL_REQUIRES_DAY', 'Monthly ordinal recurrence requires recurrenceDayOfWeek');
    }
  }

  if (recurrenceFrequency === 'yearly' && recurrenceOrdinal) {
    if (!recurrenceMonthOfYear) {
      throw httpError(400, 'YEARLY_ORDINAL_REQUIRES_MONTH', 'Yearly ordinal recurrence requires recurrenceMonthOfYear');
    }
    if (recurrenceDayOfWeek.length === 0) {
      throw httpError(400, 'YEARLY_ORDINAL_REQUIRES_DAY', 'Yearly ordinal recurrence requires recurrenceDayOfWeek');
    }
  }

  return {
    recurrenceFrequency,
    recurrenceInterval,
    recurrenceEndMode,
    recurrenceOccurrenceCount,
    recurrenceEndDate,
    recurrenceDayOfWeek,
    recurrenceDayOfMonth,
    recurrenceOrdinal,
    recurrenceMonthOfYear,
  };
}

export function validateRecurringJobInput(input) {
  const titleOrServiceSummary = asTrimmedString(input.titleOrServiceSummary || input.description || input.serviceSummary);
  const customerAddressId = asTrimmedString(input.customerAddressId);

  assertRequired(Boolean(titleOrServiceSummary), 'JOB_TITLE_REQUIRED', 'Recurring job requires titleOrServiceSummary');
  assertRequired(Boolean(customerAddressId), 'JOB_ADDRESS_REQUIRED', 'Recurring job requires an explicit customerAddressId');

  return {
    titleOrServiceSummary,
    customerAddressId,
    leadSource: asTrimmedString(input.leadSource),
    privateNotes: asTrimmedString(input.privateNotes),
    tags: normalizeTags(input.tags),
  };
}

export function validateOccurrenceEditInput(input) {
  const changes = {};

  if (input.scheduledStartAt !== undefined) {
    const val = asTrimmedString(input.scheduledStartAt);
    if (val && !isIsoDateTime(val)) {
      throw httpError(400, 'INVALID_DATETIME', 'scheduledStartAt must be a valid ISO datetime');
    }
    changes.scheduledStartAt = val || null;
  }

  if (input.scheduledEndAt !== undefined) {
    const val = asTrimmedString(input.scheduledEndAt);
    if (val && !isIsoDateTime(val)) {
      throw httpError(400, 'INVALID_DATETIME', 'scheduledEndAt must be a valid ISO datetime');
    }
    changes.scheduledEndAt = val || null;
  }

  if (changes.scheduledStartAt && changes.scheduledEndAt) {
    if (new Date(changes.scheduledEndAt).getTime() <= new Date(changes.scheduledStartAt).getTime()) {
      throw httpError(400, 'INVALID_SCHEDULE_RANGE', 'scheduledEndAt must be after scheduledStartAt');
    }
  }

  if (input.assigneeTeamMemberId !== undefined) {
    changes.assigneeTeamMemberId = input.assigneeTeamMemberId || null;
  }

  if (input.customerAddressId !== undefined) {
    const customerAddressId = asTrimmedString(input.customerAddressId);
    if (!customerAddressId) {
      throw httpError(400, 'JOB_ADDRESS_REQUIRED', 'customerAddressId is required when provided');
    }
    changes.customerAddressId = customerAddressId;
  }

  if (input.titleOrServiceSummary !== undefined) {
    changes.titleOrServiceSummary = asTrimmedString(input.titleOrServiceSummary);
  }

  if (input.leadSource !== undefined) {
    changes.leadSource = asTrimmedString(input.leadSource);
  }

  if (input.privateNotes !== undefined) {
    changes.privateNotes = asTrimmedString(input.privateNotes);
  }

  if (input.tags !== undefined) {
    changes.tags = normalizeTags(input.tags);
  }

  return changes;
}

export function validateEditScope(input) {
  const scope = asTrimmedString(input.scope);
  assertRequired(
    scope === 'this' || scope === 'this_and_future',
    'INVALID_EDIT_SCOPE',
    'scope must be "this" or "this_and_future"',
  );
  return scope;
}

export function validateDeleteScope(input) {
  const scope = asTrimmedString(input.scope);
  assertRequired(
    scope === 'this' || scope === 'this_and_future',
    'INVALID_DELETE_SCOPE',
    'scope must be "this" or "this_and_future"',
  );
  return scope;
}
