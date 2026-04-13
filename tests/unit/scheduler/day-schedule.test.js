import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from '../../../src/bootstrap/create-context.js';
import { validateCustomerInput } from '../../../src/validation/customers/customer-input.validator.js';
import { validateJobInput } from '../../../src/validation/jobs/job-input.validator.js';

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
  const job = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Assigned repair',
    customerAddressId: customer.addresses[0].id,
  }));

  context.services.jobs.scheduleJob(job.id, {
    scheduledStartAt: '2026-04-13T12:00:00.000Z',
    scheduledEndAt: '2026-04-13T13:00:00.000Z',
  });
  context.services.jobs.assignJob(job.id, 'tm_0001');

  const daySchedule = context.services.scheduler.getDaySchedule('2026-04-13');
  const lane = daySchedule.lanes.find((item) => item.id === 'tm_0001');
  assert.equal(lane.jobs.length, 1);
  assert.equal(lane.jobs[0].id, job.id);
});
