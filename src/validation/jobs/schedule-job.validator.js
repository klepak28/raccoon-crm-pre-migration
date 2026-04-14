import { httpError } from '../../lib/http.js';
import { isIsoDateTime } from '../../lib/time.js';
import {
  asTrimmedString,
  assertNoMultiAssigneeFields,
  assertNoUnsupportedV1Fields,
  assertRequired,
} from '../../lib/validation.js';

export function validateScheduleJobInput(input) {
  assertNoUnsupportedV1Fields(input);
  assertNoMultiAssigneeFields(input);

  const scheduledStartAt = asTrimmedString(input.scheduledStartAt || input.startAt);
  const scheduledEndAt = asTrimmedString(input.scheduledEndAt || input.endAt);

  assertRequired(Boolean(scheduledStartAt), 'SCHEDULE_START_REQUIRED', 'Scheduling requires scheduledStartAt');
  assertRequired(Boolean(scheduledEndAt), 'SCHEDULE_END_REQUIRED', 'Scheduling requires scheduledEndAt');

  if (!isIsoDateTime(scheduledStartAt) || !isIsoDateTime(scheduledEndAt)) {
    throw httpError(400, 'INVALID_DATETIME', 'Scheduling requires valid ISO datetime values');
  }

  if (new Date(scheduledEndAt).getTime() <= new Date(scheduledStartAt).getTime()) {
    throw httpError(400, 'INVALID_SCHEDULE_RANGE', 'scheduledEndAt must be after scheduledStartAt');
  }

  const assigneeTeamMemberId = asTrimmedString(input.assigneeTeamMemberId) || null;

  return { scheduledStartAt, scheduledEndAt, assigneeTeamMemberId };
}
