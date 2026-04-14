import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from '../../../src/bootstrap/create-context.js';
import { validateCustomerInput } from '../../../src/validation/customers/customer-input.validator.js';
import { validateJobInput } from '../../../src/validation/jobs/job-input.validator.js';
import { validateRecurrenceInput } from '../../../src/validation/recurring-jobs/recurring-job-input.validator.js';

function createCustomer(context, overrides = {}) {
  return context.services.customers.createCustomer(validateCustomerInput({
    displayName: 'Recurring Customer',
    customerType: 'Homeowner',
    street: '1 Main',
    city: 'Austin',
    state: 'TX',
    zip: '73301',
    ...overrides,
  }));
}

function createTeamMember(context, overrides = {}) {
  return context.services.teamMembers.createTeamMember({
    displayName: 'Team Blue',
    color: '#5b7cff',
    ...overrides,
  });
}

function createScheduledJob(context, customer, overrides = {}) {
  const job = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'HVAC maintenance',
    customerAddressId: customer.addresses[0].id,
    leadSource: 'Google',
    privateNotes: 'Original note',
    tags: ['spring'],
    ...overrides,
  }));

  context.services.jobs.scheduleJob(job.id, {
    scheduledStartAt: '2026-04-17T14:00:00.000Z',
    scheduledEndAt: '2026-04-17T15:00:00.000Z',
  });

  return context.services.jobs.getJobDetail(job.id);
}

function createWeeklyRule(overrides = {}) {
  return validateRecurrenceInput({
    recurrenceFrequency: 'weekly',
    recurrenceInterval: 1,
    recurrenceDayOfWeek: ['FRI'],
    recurrenceEndMode: 'after_n_occurrences',
    recurrenceOccurrenceCount: 4,
    ...overrides,
  });
}

test('createRecurringSeries turns current job into occurrence 1 and materializes future jobs', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const teamMember = createTeamMember(context, { displayName: 'North Team', color: '#16a34a' });
  const scheduledJob = createScheduledJob(context, customer);
  context.services.jobs.assignJob(scheduledJob.id, teamMember.id);

  const result = context.services.recurringJobs.createRecurringSeries(
    scheduledJob.id,
    createWeeklyRule({ recurrenceOccurrenceCount: 3 }),
  );

  assert.equal(result.sourceJob.occurrenceIndex, 1);
  assert.equal(result.sourceJob.generatedFromRuleVersion, 1);
  assert.equal(result.generatedCount, 2);

  const seriesDetail = context.services.recurringJobs.getSeriesDetail(result.series.id);
  assert.equal(seriesDetail.occurrences.length, 3);
  assert.deepEqual(seriesDetail.occurrences.map((item) => item.occurrenceIndex), [1, 2, 3]);
  assert.equal(seriesDetail.occurrences.every((item) => item.recurringSeriesId === result.series.id), true);
  assert.equal(seriesDetail.occurrences.every((item) => item.assigneeTeamMemberId === teamMember.id), true);
});

test('editSingleOccurrence updates only the selected occurrence and marks it as exception', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const scheduledJob = createScheduledJob(context, customer);
  const { series } = context.services.recurringJobs.createRecurringSeries(scheduledJob.id, createWeeklyRule());
  const occurrences = context.services.recurringJobs.getSeriesDetail(series.id).occurrences;
  const secondOccurrence = occurrences[1];
  const thirdOccurrence = occurrences[2];

  const updated = context.services.recurringJobs.editSingleOccurrence(secondOccurrence.id, {
    titleOrServiceSummary: 'One-off visit',
    scheduledStartAt: '2026-04-24T16:30:00.000Z',
    scheduledEndAt: '2026-04-24T17:45:00.000Z',
    privateNotes: 'Only this one',
  });

  assert.equal(updated.isExceptionInstance, true);
  assert.equal(updated.titleOrServiceSummary, 'One-off visit');
  assert.equal(updated.scheduledStartAt, '2026-04-24T16:30:00.000Z');
  assert.equal(updated.privateNotes, 'Only this one');

  const untouchedThird = context.services.jobs.getJobDetail(thirdOccurrence.id);
  assert.equal(untouchedThird.titleOrServiceSummary, 'HVAC maintenance');
  assert.equal(untouchedThird.scheduledStartAt, thirdOccurrence.scheduledStartAt);
  assert.equal(untouchedThird.isExceptionInstance, false);
});

test('editThisAndFutureOccurrences updates pivot and all future jobs without rewriting history', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const altAddressCustomer = createCustomer(context, { displayName: 'ignored' });
  void altAddressCustomer;
  const teamMember = createTeamMember(context, { displayName: 'Team Orange', color: '#f97316' });
  const scheduledJob = createScheduledJob(context, customer);
  const { series } = context.services.recurringJobs.createRecurringSeries(scheduledJob.id, createWeeklyRule({ recurrenceOccurrenceCount: 5 }));
  const occurrences = context.services.recurringJobs.getSeriesDetail(series.id).occurrences;
  const first = occurrences[0];
  const second = occurrences[1];
  const fourth = occurrences[3];

  const newAddressId = customer.addresses[0].id;
  context.services.recurringJobs.editThisAndFutureOccurrences(second.id, {
    titleOrServiceSummary: 'Biweekly system check',
    customerAddressId: newAddressId,
    leadSource: 'Referral',
    privateNotes: 'Future note',
    tags: ['vip', 'maintenance'],
    assigneeTeamMemberId: teamMember.id,
  });

  const refreshedFirst = context.services.jobs.getJobDetail(first.id);
  const refreshedSecond = context.services.jobs.getJobDetail(second.id);
  const refreshedFourth = context.services.jobs.getJobDetail(fourth.id);

  assert.equal(refreshedFirst.titleOrServiceSummary, 'HVAC maintenance');
  assert.equal(refreshedSecond.titleOrServiceSummary, 'Biweekly system check');
  assert.equal(refreshedSecond.assigneeTeamMemberId, teamMember.id);
  assert.equal(refreshedSecond.privateNotes, 'Future note');
  assert.deepEqual(refreshedSecond.tags, ['vip', 'maintenance']);
  assert.equal(refreshedFourth.titleOrServiceSummary, 'Biweekly system check');
  assert.equal(refreshedFourth.assigneeTeamMemberId, teamMember.id);
  assert.equal(refreshedFourth.generatedFromRuleVersion, 2);
});

test('changing recurrence rule from current occurrence rematerializes the tail from the pivot', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const scheduledJob = createScheduledJob(context, customer);
  const { series } = context.services.recurringJobs.createRecurringSeries(scheduledJob.id, createWeeklyRule({ recurrenceOccurrenceCount: 6 }));
  const before = context.services.recurringJobs.getSeriesDetail(series.id).occurrences;
  const pivot = before[1];

  const result = context.services.recurringJobs.editThisAndFutureOccurrences(
    pivot.id,
    {
      scheduledStartAt: '2026-04-24T18:00:00.000Z',
      scheduledEndAt: '2026-04-24T19:30:00.000Z',
    },
    validateRecurrenceInput({
      recurrenceFrequency: 'monthly',
      recurrenceInterval: 1,
      recurrenceDayOfMonth: 24,
      recurrenceEndMode: 'after_n_occurrences',
      recurrenceOccurrenceCount: 3,
    }),
  );

  assert.equal(result.series.recurrenceFrequency, 'monthly');
  assert.equal(result.updatedJob.generatedFromRuleVersion, 2);

  const after = context.services.recurringJobs.getSeriesDetail(series.id).occurrences;
  assert.equal(after[0].id, before[0].id, 'history must stay intact');
  assert.equal(after[1].id, pivot.id, 'pivot occurrence remains the same job');
  assert.equal(after[1].scheduledStartAt, '2026-04-24T18:00:00.000Z');
  assert.equal(after.length, 4, 'pivot plus 2 new future monthly jobs plus preserved history');
  assert.equal(after[2].scheduledStartAt.startsWith('2026-05-24T18:00:00.000Z'), true);
  assert.equal(after[3].scheduledStartAt.startsWith('2026-06-24T18:00:00.000Z'), true);
});

test('delete scopes distinguish one occurrence from truncating the remaining series', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const scheduledJob = createScheduledJob(context, customer);
  const { series } = context.services.recurringJobs.createRecurringSeries(scheduledJob.id, createWeeklyRule({ recurrenceOccurrenceCount: 5 }));
  const occurrences = context.services.recurringJobs.getSeriesDetail(series.id).occurrences;

  context.services.recurringJobs.deleteThisOccurrence(occurrences[1].id);
  let active = context.services.recurringJobs.getSeriesDetail(series.id).occurrences;
  assert.deepEqual(active.map((item) => item.occurrenceIndex), [1, 3, 4, 5]);

  const truncateResult = context.services.recurringJobs.deleteThisAndFutureOccurrences(occurrences[2].id);
  assert.equal(truncateResult.deletedCount, 3);

  active = context.services.recurringJobs.getSeriesDetail(series.id).occurrences;
  assert.deepEqual(active.map((item) => item.occurrenceIndex), [1]);
  assert.equal(context.services.recurringJobs.getSeriesForJob(occurrences[0].id).recurrenceEnabled, false);
});
