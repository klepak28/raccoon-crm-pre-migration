import { httpError } from '../../lib/http.js';
import {
  generateOccurrenceDates,
  computeHorizonDate,
  describeRecurrenceRule,
} from './recurrence-engine.js';

export function createRecurringJobServices({
  jobRepository,
  recurringSeriesRepository,
  customerRepository,
  teamMemberRepository,
}) {
  return {
    createRecurringSeries(jobId, recurrenceInput) {
      const sourceJob = requireRecurringEligibleJob(jobId);
      const series = recurringSeriesRepository.create({
        sourceJobId: sourceJob.id,
        ...recurrenceInput,
      });

      const updatedSourceJob = jobRepository.update(sourceJob.id, (job) => {
        job.recurringSeriesId = series.id;
        job.occurrenceIndex = 1;
        job.generatedFromRuleVersion = 1;
        job.isExceptionInstance = false;
        job.deletedFromSeriesAt = null;
      });

      const generatedJobs = materializeFutureOccurrences({
        seriesId: series.id,
        pivotJob: updatedSourceJob,
        startingOccurrenceIndex: 2,
        ruleVersion: 1,
      });

      updateSeriesHorizon(series.id);

      return {
        series: recurringSeriesRepository.getById(series.id),
        sourceJob: jobRepository.getById(sourceJob.id),
        generatedCount: generatedJobs.length,
      };
    },

    createRecurringJobFromScratch(customerId, jobInput, scheduleInput, recurrenceInput) {
      const customer = customerRepository.getById(customerId);
      if (!customer) {
        throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      if (customer.doNotService) {
        throw httpError(400, 'DO_NOT_SERVICE_BLOCK', 'Cannot create jobs for do-not-service customers');
      }

      assertCustomerOwnsAddress(customer, jobInput.customerAddressId);
      assertAssigneeIsValid(scheduleInput.assigneeTeamMemberId);

      const sourceJob = jobRepository.create({
        ...jobInput,
        customerId,
      });

      jobRepository.update(sourceJob.id, (job) => {
        job.scheduleState = 'scheduled';
        job.scheduledStartAt = scheduleInput.scheduledStartAt;
        job.scheduledEndAt = scheduleInput.scheduledEndAt;
        job.assigneeTeamMemberId = scheduleInput.assigneeTeamMemberId || null;
      });

      const series = recurringSeriesRepository.create({
        sourceJobId: sourceJob.id,
        ...recurrenceInput,
      });

      const updatedSourceJob = jobRepository.update(sourceJob.id, (job) => {
        job.recurringSeriesId = series.id;
        job.occurrenceIndex = 1;
        job.generatedFromRuleVersion = 1;
        job.isExceptionInstance = false;
        job.deletedFromSeriesAt = null;
      });

      const generatedJobs = materializeFutureOccurrences({
        seriesId: series.id,
        pivotJob: updatedSourceJob,
        startingOccurrenceIndex: 2,
        ruleVersion: 1,
      });

      updateSeriesHorizon(series.id);

      return {
        series: recurringSeriesRepository.getById(series.id),
        sourceJob: jobRepository.getById(sourceJob.id),
        generatedCount: generatedJobs.length,
      };
    },

    getSeriesDetail(seriesId) {
      const series = recurringSeriesRepository.getById(seriesId);
      if (!series) {
        throw httpError(404, 'SERIES_NOT_FOUND', 'Recurring series not found');
      }
      const occurrences = jobRepository.listBySeriesId(seriesId);
      return {
        ...series,
        description: describeRecurrenceRule(series),
        occurrences,
        totalOccurrences: occurrences.length,
      };
    },

    editSingleOccurrence(jobId, changes) {
      const occurrence = requireRecurringOccurrence(jobId);
      validateOccurrenceChanges(occurrence, changes);

      return jobRepository.update(jobId, (job) => {
        applyJobChanges(job, changes);
        job.isExceptionInstance = true;
      });
    },

    editThisAndFutureOccurrences(jobId, changes, newRecurrenceRule) {
      const pivotOccurrence = requireRecurringOccurrence(jobId);
      validateOccurrenceChanges(pivotOccurrence, changes);

      const series = requireSeries(pivotOccurrence.recurringSeriesId);
      const nextRuleVersion = Number(series.recurrenceRuleVersion || 1) + 1;
      const effectiveRule = mergeSeriesRule(series, newRecurrenceRule);
      const requiresTailRematerialization = Boolean(newRecurrenceRule) || hasScheduleMutation(changes);

      recurringSeriesRepository.update(series.id, (item) => {
        item.recurrenceFrequency = effectiveRule.recurrenceFrequency;
        item.recurrenceInterval = effectiveRule.recurrenceInterval;
        item.recurrenceDayOfWeek = effectiveRule.recurrenceDayOfWeek || [];
        item.recurrenceDayOfMonth = effectiveRule.recurrenceDayOfMonth || null;
        item.recurrenceOrdinal = effectiveRule.recurrenceOrdinal || null;
        item.recurrenceMonthOfYear = effectiveRule.recurrenceMonthOfYear || null;
        item.recurrenceEndMode = effectiveRule.recurrenceEndMode;
        item.recurrenceOccurrenceCount = effectiveRule.recurrenceOccurrenceCount || null;
        item.recurrenceEndDate = effectiveRule.recurrenceEndDate || null;
        item.recurrenceEnabled = true;
        item.recurrenceRuleVersion = nextRuleVersion;
      });

      const updatedPivotOccurrence = jobRepository.update(jobId, (job) => {
        applyJobChanges(job, changes);
        job.generatedFromRuleVersion = nextRuleVersion;
        job.isExceptionInstance = false;
      });

      if (requiresTailRematerialization) {
        archiveSeriesTail(series.id, updatedPivotOccurrence.occurrenceIndex);
        const generatedJobs = materializeFutureOccurrences({
          seriesId: series.id,
          pivotJob: updatedPivotOccurrence,
          startingOccurrenceIndex: (updatedPivotOccurrence.occurrenceIndex || 1) + 1,
          ruleVersion: nextRuleVersion,
        });
        updateSeriesHorizon(series.id);
        return {
          series: recurringSeriesRepository.getById(series.id),
          updatedJob: jobRepository.getById(jobId),
          regeneratedCount: generatedJobs.length,
        };
      }

      const futureOccurrences = jobRepository.listBySeriesId(series.id)
        .filter((item) => (item.occurrenceIndex || 0) > (updatedPivotOccurrence.occurrenceIndex || 0));

      for (const occurrence of futureOccurrences) {
        jobRepository.update(occurrence.id, (job) => {
          applyJobChanges(job, changes);
          job.generatedFromRuleVersion = nextRuleVersion;
          job.isExceptionInstance = false;
        });
      }

      return {
        series: recurringSeriesRepository.getById(series.id),
        updatedJob: jobRepository.getById(jobId),
        updatedFutureCount: futureOccurrences.length,
      };
    },

    deleteThisOccurrence(jobId) {
      const occurrence = requireRecurringOccurrence(jobId);
      return jobRepository.update(occurrence.id, (job) => {
        job.deletedFromSeriesAt = new Date().toISOString();
        job.isExceptionInstance = false;
      });
    },

    deleteThisAndFutureOccurrences(jobId) {
      const occurrence = requireRecurringOccurrence(jobId);
      const pivotIndex = occurrence.occurrenceIndex || 0;
      const now = new Date().toISOString();
      const tail = jobRepository.listBySeriesId(occurrence.recurringSeriesId)
        .filter((item) => (item.occurrenceIndex || 0) >= pivotIndex);

      for (const item of tail) {
        jobRepository.update(item.id, (job) => {
          job.deletedFromSeriesAt = now;
          job.isExceptionInstance = false;
        });
      }

      recurringSeriesRepository.update(occurrence.recurringSeriesId, (series) => {
        series.recurrenceEnabled = false;
      });

      return { deletedCount: tail.length };
    },

    getSeriesForJob(jobId) {
      const job = jobRepository.getById(jobId);
      if (!job || !job.recurringSeriesId) return null;
      return recurringSeriesRepository.getById(job.recurringSeriesId);
    },
  };

  function requireRecurringEligibleJob(jobId) {
    const job = jobRepository.getById(jobId);
    if (!job) {
      throw httpError(404, 'JOB_NOT_FOUND', 'Job not found');
    }
    if (job.recurringSeriesId) {
      throw httpError(400, 'ALREADY_RECURRING', 'Job is already part of a recurring series');
    }
    if (job.scheduleState !== 'scheduled' || !job.scheduledStartAt || !job.scheduledEndAt) {
      throw httpError(400, 'JOB_NOT_SCHEDULED', 'Job must be scheduled before enabling recurrence');
    }
    assertAssigneeIsValid(job.assigneeTeamMemberId);
    return job;
  }

  function requireRecurringOccurrence(jobId) {
    const job = jobRepository.getById(jobId);
    if (!job) {
      throw httpError(404, 'JOB_NOT_FOUND', 'Job not found');
    }
    if (!job.recurringSeriesId) {
      throw httpError(400, 'NOT_RECURRING', 'Job is not part of a recurring series');
    }
    if (job.deletedFromSeriesAt) {
      throw httpError(400, 'OCCURRENCE_DELETED', 'Cannot mutate a deleted occurrence');
    }
    return job;
  }

  function requireSeries(seriesId) {
    const series = recurringSeriesRepository.getById(seriesId);
    if (!series) {
      throw httpError(404, 'SERIES_NOT_FOUND', 'Recurring series not found');
    }
    return series;
  }

  function assertCustomerOwnsAddress(customer, customerAddressId) {
    const address = customer.addresses.find((item) => item.id === customerAddressId);
    if (!address) {
      throw httpError(400, 'ADDRESS_NOT_OWNED_BY_CUSTOMER', 'Job address must belong to the selected customer');
    }
  }

  function assertAssigneeIsValid(teamMemberId) {
    if (!teamMemberId) return;
    const teamMember = teamMemberRepository.getById(teamMemberId);
    if (!teamMember || !teamMember.activeOnSchedule) {
      throw httpError(400, 'INVALID_ASSIGNEE', 'Assignee must be an active assignable team member');
    }
  }

  function validateOccurrenceChanges(occurrence, changes) {
    if (changes.customerAddressId !== undefined) {
      const customer = customerRepository.getById(occurrence.customerId);
      assertCustomerOwnsAddress(customer, changes.customerAddressId);
    }
    if (changes.assigneeTeamMemberId !== undefined) {
      assertAssigneeIsValid(changes.assigneeTeamMemberId);
    }

    const effectiveStartAt = changes.scheduledStartAt !== undefined
      ? changes.scheduledStartAt
      : occurrence.scheduledStartAt;
    const effectiveEndAt = changes.scheduledEndAt !== undefined
      ? changes.scheduledEndAt
      : occurrence.scheduledEndAt;

    if ((changes.scheduledStartAt !== undefined || changes.scheduledEndAt !== undefined)
      && effectiveStartAt
      && effectiveEndAt
      && new Date(effectiveEndAt).getTime() <= new Date(effectiveStartAt).getTime()) {
      throw httpError(400, 'INVALID_SCHEDULE_RANGE', 'scheduledEndAt must be after scheduledStartAt');
    }
  }

  function mergeSeriesRule(series, newRecurrenceRule) {
    if (!newRecurrenceRule) {
      return {
        recurrenceFrequency: series.recurrenceFrequency,
        recurrenceInterval: series.recurrenceInterval,
        recurrenceDayOfWeek: series.recurrenceDayOfWeek || [],
        recurrenceDayOfMonth: series.recurrenceDayOfMonth || null,
        recurrenceOrdinal: series.recurrenceOrdinal || null,
        recurrenceMonthOfYear: series.recurrenceMonthOfYear || null,
        recurrenceEndMode: series.recurrenceEndMode,
        recurrenceOccurrenceCount: series.recurrenceOccurrenceCount || null,
        recurrenceEndDate: series.recurrenceEndDate || null,
      };
    }

    return {
      recurrenceFrequency: newRecurrenceRule.recurrenceFrequency ?? series.recurrenceFrequency,
      recurrenceInterval: newRecurrenceRule.recurrenceInterval ?? series.recurrenceInterval,
      recurrenceDayOfWeek: newRecurrenceRule.recurrenceDayOfWeek ?? (series.recurrenceDayOfWeek || []),
      recurrenceDayOfMonth: newRecurrenceRule.recurrenceDayOfMonth ?? series.recurrenceDayOfMonth ?? null,
      recurrenceOrdinal: newRecurrenceRule.recurrenceOrdinal ?? series.recurrenceOrdinal ?? null,
      recurrenceMonthOfYear: newRecurrenceRule.recurrenceMonthOfYear ?? series.recurrenceMonthOfYear ?? null,
      recurrenceEndMode: newRecurrenceRule.recurrenceEndMode ?? series.recurrenceEndMode,
      recurrenceOccurrenceCount: newRecurrenceRule.recurrenceOccurrenceCount ?? series.recurrenceOccurrenceCount ?? null,
      recurrenceEndDate: newRecurrenceRule.recurrenceEndDate ?? series.recurrenceEndDate ?? null,
    };
  }

  function archiveSeriesTail(seriesId, pivotIndex) {
    const now = new Date().toISOString();
    const futureOccurrences = jobRepository.listBySeriesId(seriesId)
      .filter((item) => (item.occurrenceIndex || 0) > (pivotIndex || 0));

    for (const occurrence of futureOccurrences) {
      jobRepository.update(occurrence.id, (job) => {
        job.deletedFromSeriesAt = now;
        job.isExceptionInstance = false;
      });
    }
  }

  function materializeFutureOccurrences({ seriesId, pivotJob, startingOccurrenceIndex, ruleVersion }) {
    const series = requireSeries(seriesId);
    const anchorStartAt = pivotJob.scheduledStartAt;
    const anchorEndAt = pivotJob.scheduledEndAt;
    const anchorDate = new Date(anchorStartAt);
    const durationMs = new Date(anchorEndAt).getTime() - new Date(anchorStartAt).getTime();
    const horizon = computeHorizonDate(series);
    const dates = generateOccurrenceDates(series, anchorDate, 1000, horizon, 1);
    const generatedJobs = [];
    let occurrenceIndex = startingOccurrenceIndex;

    for (const date of dates) {
      const startAt = new Date(date);
      const anchorStart = new Date(anchorStartAt);
      startAt.setHours(anchorStart.getHours(), anchorStart.getMinutes(), anchorStart.getSeconds(), anchorStart.getMilliseconds());
      const endAt = new Date(startAt.getTime() + durationMs);

      const newJob = jobRepository.create({
        customerId: pivotJob.customerId,
        customerAddressId: pivotJob.customerAddressId,
        titleOrServiceSummary: pivotJob.titleOrServiceSummary,
        leadSource: pivotJob.leadSource,
        privateNotes: pivotJob.privateNotes,
        tags: [...(pivotJob.tags || [])],
        recurringSeriesId: seriesId,
        occurrenceIndex,
        generatedFromRuleVersion: ruleVersion,
      });

      jobRepository.update(newJob.id, (job) => {
        job.scheduleState = 'scheduled';
        job.scheduledStartAt = startAt.toISOString();
        job.scheduledEndAt = endAt.toISOString();
        job.assigneeTeamMemberId = pivotJob.assigneeTeamMemberId || null;
        job.isExceptionInstance = false;
      });

      generatedJobs.push(jobRepository.getById(newJob.id));
      occurrenceIndex += 1;
    }

    return generatedJobs;
  }

  function updateSeriesHorizon(seriesId) {
    const series = requireSeries(seriesId);
    const horizon = computeHorizonDate(series);
    recurringSeriesRepository.update(seriesId, (item) => {
      item.materializationHorizonUntil = horizon.toISOString();
      item.lastExtendedAt = new Date().toISOString();
    });
  }
}

function applyJobChanges(job, changes) {
  if (changes.customerAddressId !== undefined) job.customerAddressId = changes.customerAddressId;
  if (changes.titleOrServiceSummary !== undefined) job.titleOrServiceSummary = changes.titleOrServiceSummary;
  if (changes.leadSource !== undefined) job.leadSource = changes.leadSource;
  if (changes.privateNotes !== undefined) job.privateNotes = changes.privateNotes;
  if (changes.tags !== undefined) job.tags = changes.tags;
  if (changes.scheduledStartAt !== undefined) {
    job.scheduleState = changes.scheduledStartAt ? 'scheduled' : 'unscheduled';
    job.scheduledStartAt = changes.scheduledStartAt;
  }
  if (changes.scheduledEndAt !== undefined) {
    job.scheduleState = changes.scheduledEndAt ? 'scheduled' : 'unscheduled';
    job.scheduledEndAt = changes.scheduledEndAt;
  }
  if (changes.assigneeTeamMemberId !== undefined) job.assigneeTeamMemberId = changes.assigneeTeamMemberId;
}

function hasScheduleMutation(changes) {
  return changes.scheduledStartAt !== undefined || changes.scheduledEndAt !== undefined;
}
