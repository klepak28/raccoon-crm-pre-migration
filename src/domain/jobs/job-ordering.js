import { compareDateTimes } from '../../lib/time.js';

export function compareJobsForOperations(left, right) {
  if (left.scheduleState !== right.scheduleState) {
    return left.scheduleState === 'scheduled' ? -1 : 1;
  }

  if (left.scheduleState === 'scheduled') {
    return compareScheduledJobs(left, right);
  }

  const updatedAtDiff = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  if (updatedAtDiff !== 0) {
    return updatedAtDiff;
  }

  const createdAtDiff = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return compareJobIdentity(left, right);
}

export function compareScheduledJobs(left, right) {
  const startDiff = compareDateTimes(left.scheduledStartAt, right.scheduledStartAt);
  if (startDiff !== 0) {
    return startDiff;
  }

  const endDiff = compareDateTimes(left.scheduledEndAt, right.scheduledEndAt);
  if (endDiff !== 0) {
    return endDiff;
  }

  const assigneeDiff = compareNullableStrings(left.assigneeTeamMemberId, right.assigneeTeamMemberId);
  if (assigneeDiff !== 0) {
    return assigneeDiff;
  }

  return compareJobIdentity(left, right);
}

function compareJobIdentity(left, right) {
  const jobNumberDiff = compareNullableStrings(left.jobNumber, right.jobNumber);
  if (jobNumberDiff !== 0) {
    return jobNumberDiff;
  }

  return compareNullableStrings(left.id, right.id);
}

function compareNullableStrings(left, right) {
  const leftValue = left || '';
  const rightValue = right || '';
  return leftValue.localeCompare(rightValue);
}
