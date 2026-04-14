import { httpError } from '../../lib/http.js';
import { isIsoDate } from '../../lib/time.js';
import { assertEnum, asTrimmedString } from '../../lib/validation.js';

export function validateJobListFilters(searchParams) {
  const scheduleState = asTrimmedString(searchParams.get('scheduleState')) || null;
  const assignmentState = asTrimmedString(searchParams.get('assignmentState')) || null;
  const customerId = asTrimmedString(searchParams.get('customerId')) || null;
  const startDate = asTrimmedString(searchParams.get('startDate')) || null;
  const endDate = asTrimmedString(searchParams.get('endDate')) || null;

  if (scheduleState) {
    assertEnum(scheduleState, ['scheduled', 'unscheduled'], 'scheduleState');
  }

  if (assignmentState) {
    assertEnum(assignmentState, ['assigned', 'unassigned'], 'assignmentState');
  }

  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw httpError(400, 'INVALID_DATE_RANGE', 'Job list date filtering requires both startDate and endDate');
  }

  if (startDate || endDate) {
    if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
      throw httpError(400, 'INVALID_DATE_RANGE', 'Job list date filtering requires YYYY-MM-DD startDate and endDate');
    }
    if (new Date(`${endDate}T00:00:00`).getTime() < new Date(`${startDate}T00:00:00`).getTime()) {
      throw httpError(400, 'INVALID_DATE_RANGE', 'endDate must be on or after startDate');
    }
  }

  return {
    scheduleState,
    assignmentState,
    customerId,
    startDate,
    endDate,
  };
}
