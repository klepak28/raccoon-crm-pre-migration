import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from '../../../src/bootstrap/create-context.js';
import { validateCustomerInput } from '../../../src/validation/customers/customer-input.validator.js';
import { validateJobInput } from '../../../src/validation/jobs/job-input.validator.js';

// V1 day convention: the UI converts datetime-local values to UTC using the local
// timezone (new Date(str).toISOString()), and the backend filters with local midnight
// boundaries.  Both sides use the same local-day interpretation so near-midnight jobs
// are never shifted to the wrong scheduler day.  This helper mirrors app.js toIso().
function toUiIso(localDateTime) {
  return new Date(localDateTime).toISOString();
}

function createCustomer(context) {
  return context.services.customers.createCustomer(validateCustomerInput({
    displayName: 'Schedule Customer',
    customerType: 'Homeowner',
    street: '1 Main',
    city: 'Austin',
    state: 'TX',
    zip: '73301',
  }));
}

function createTeamMember(context, overrides = {}) {
  return context.services.teamMembers.createTeamMember({
    displayName: 'Team Blue',
    color: '#5b7cff',
    ...overrides,
  });
}

test('returns unassigned lane first and includes intersecting scheduled jobs', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const job = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Late repair',
    customerAddressId: customer.addresses[0].id,
  }));

  context.services.jobs.scheduleJob(job.id, {
    scheduledStartAt: '2026-04-13T23:00:00.000Z',
    scheduledEndAt: '2026-04-14T01:00:00.000Z',
  });

  const daySchedule = context.services.scheduler.getDaySchedule('2026-04-13');
  assert.equal(daySchedule.lanes[0].label, 'Unassigned');
  assert.equal(daySchedule.lanes[0].jobs.length, 1);
  assert.equal(daySchedule.lanes[0].jobs[0].jobNumber, job.jobNumber);
});

test('moves job into assigned lane after assignment', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const teamMember = createTeamMember(context);
  const job = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Assigned repair',
    customerAddressId: customer.addresses[0].id,
  }));

  context.services.jobs.scheduleJob(job.id, {
    scheduledStartAt: '2026-04-13T12:00:00.000Z',
    scheduledEndAt: '2026-04-13T13:00:00.000Z',
  });
  context.services.jobs.assignJob(job.id, teamMember.id);

  const daySchedule = context.services.scheduler.getDaySchedule('2026-04-13');
  const lane = daySchedule.lanes.find((item) => item.id === teamMember.id);
  assert.equal(lane.jobs.length, 1);
  assert.equal(lane.jobs[0].id, job.id);
});

// Near-midnight regression: V1 day rule uses local time boundaries throughout.
// A job scheduled in the UI as local 23:30→00:30 must appear on the selected
// local day (13th) and also on the next day (14th) because it spans local midnight.
test('uses the same local-day interpretation as UI scheduling input near midnight', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const job = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Near midnight local job',
    customerAddressId: customer.addresses[0].id,
  }));

  context.services.jobs.scheduleJob(job.id, {
    scheduledStartAt: toUiIso('2026-04-13T23:30'),
    scheduledEndAt: toUiIso('2026-04-14T00:30'),
  });

  const selectedDay = context.services.scheduler.getDaySchedule('2026-04-13');
  const nextDay = context.services.scheduler.getDaySchedule('2026-04-14');

  assert.equal(selectedDay.lanes[0].jobs.some((item) => item.id === job.id), true);
  assert.equal(nextDay.lanes[0].jobs.some((item) => item.id === job.id), true);
});

// Boundary regression: a job entirely within local 23:30–23:59 on day D must
// appear on day D and must NOT appear on the previous day (D-1).
test('near-midnight job wholly within a day does not appear on the previous day', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const job = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Late night only',
    customerAddressId: customer.addresses[0].id,
  }));

  context.services.jobs.scheduleJob(job.id, {
    scheduledStartAt: toUiIso('2026-04-13T23:30'),
    scheduledEndAt: toUiIso('2026-04-13T23:59'),
  });

  const day = context.services.scheduler.getDaySchedule('2026-04-13');
  const prevDay = context.services.scheduler.getDaySchedule('2026-04-12');

  assert.equal(day.lanes[0].jobs.some((item) => item.id === job.id), true, 'job should be on selected day');
  assert.equal(prevDay.lanes[0].jobs.some((item) => item.id === job.id), false, 'job must not bleed into previous day');
});

// Boundary regression: a job starting at local 00:00 on day D must appear on D
// and must NOT appear on day D-1.
test('job starting at local midnight does not appear on the previous day', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const job = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Early start',
    customerAddressId: customer.addresses[0].id,
  }));

  context.services.jobs.scheduleJob(job.id, {
    scheduledStartAt: toUiIso('2026-04-14T00:00'),
    scheduledEndAt: toUiIso('2026-04-14T01:00'),
  });

  const day = context.services.scheduler.getDaySchedule('2026-04-14');
  const prevDay = context.services.scheduler.getDaySchedule('2026-04-13');

  assert.equal(day.lanes[0].jobs.some((item) => item.id === job.id), true, 'job should be on its start day');
  assert.equal(prevDay.lanes[0].jobs.some((item) => item.id === job.id), false, 'job at midnight must not appear on previous day');
});

test('sorts team lanes naturally so Team 2 comes before Team 10', () => {
  const context = createContext();
  createTeamMember(context, { displayName: 'Team 10', color: '#ef4444' });
  createTeamMember(context, { displayName: 'Team 2', color: '#22c55e' });
  createTeamMember(context, { displayName: 'Team 1', color: '#3b82f6' });

  const daySchedule = context.services.scheduler.getDaySchedule('2026-04-13');
  assert.deepEqual(
    daySchedule.lanes.map((lane) => lane.label),
    ['Unassigned', 'Team 1', 'Team 2', 'Team 10'],
  );

  const teamMembers = context.services.teamMembers.listTeamMembers();
  assert.deepEqual(teamMembers.map((team) => team.displayName), ['Team 1', 'Team 2', 'Team 10']);
});

test('range query returns scheduled jobs with lane metadata for calendar views', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const teamMember = createTeamMember(context, { displayName: 'Team Green', color: '#16a34a' });
  const firstJob = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Monday visit',
    customerAddressId: customer.addresses[0].id,
  }));
  const secondJob = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Wednesday visit',
    customerAddressId: customer.addresses[0].id,
  }));

  context.services.jobs.scheduleJob(firstJob.id, {
    scheduledStartAt: toUiIso('2026-04-13T09:00'),
    scheduledEndAt: toUiIso('2026-04-13T10:00'),
  });
  context.services.jobs.scheduleJob(secondJob.id, {
    scheduledStartAt: toUiIso('2026-04-15T11:00'),
    scheduledEndAt: toUiIso('2026-04-15T12:00'),
  });
  context.services.jobs.assignJob(secondJob.id, teamMember.id);

  const range = context.services.scheduler.getScheduleRange('2026-04-13', '2026-04-19');

  assert.equal(range.jobs.length, 2);
  assert.equal(range.jobs.some((item) => item.id === firstJob.id), true);
  assert.equal(range.jobs.some((item) => item.id === secondJob.id), true);
  assert.equal(range.lanes[0].id, 'unassigned');
  assert.equal(range.lanes.some((item) => item.id === teamMember.id), true);
});
