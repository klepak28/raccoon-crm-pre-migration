import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from '../../../src/bootstrap/create-context.js';
import { validateCustomerInput } from '../../../src/validation/customers/customer-input.validator.js';
import { validateJobInput } from '../../../src/validation/jobs/job-input.validator.js';

function createCustomer(context, overrides = {}) {
  return context.services.customers.createCustomer(validateCustomerInput({
    displayName: 'Test Customer',
    customerType: 'Homeowner',
    street: '1 Main',
    city: 'Austin',
    state: 'TX',
    zip: '73301',
    ...overrides,
  }));
}

test('new one-time job starts unscheduled and unassigned', () => {
  const context = createContext();
  const customer = createCustomer(context);

  const job = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Install outlet',
    customerAddressId: customer.addresses[0].id,
  }));

  assert.equal(job.scheduleState, 'unscheduled');
  assert.equal(job.assigneeTeamMemberId, null);
});

test('unschedule clears schedule fields and preserves assignee', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const job = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Install outlet',
    customerAddressId: customer.addresses[0].id,
  }));

  context.services.jobs.assignJob(job.id, 'tm_0001');
  context.services.jobs.scheduleJob(job.id, {
    scheduledStartAt: '2026-04-13T14:00:00.000Z',
    scheduledEndAt: '2026-04-13T15:00:00.000Z',
  });

  const updated = context.services.jobs.unscheduleJob(job.id);
  assert.equal(updated.scheduleState, 'unscheduled');
  assert.equal(updated.scheduledStartAt, null);
  assert.equal(updated.scheduledEndAt, null);
  assert.equal(updated.assigneeTeamMemberId, 'tm_0001');
});

test('lists operational job summaries for unscheduled queue', () => {
  const context = createContext();
  const customer = createCustomer(context, {
    displayName: 'Queue Customer',
    mobilePhone: '555-111-2222',
    tags: ['vip'],
  });
  const job = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Queue task',
    customerAddressId: customer.addresses[0].id,
    tags: ['electrical'],
  }));

  context.services.jobs.assignJob(job.id, 'tm_0002');

  const items = context.services.jobs.listJobs({ scheduleState: 'unscheduled' });
  const queuedJob = items.find((item) => item.id === job.id);

  assert.equal(queuedJob.customer.displayName, 'Queue Customer');
  assert.equal(queuedJob.customer.primaryPhone, '555-111-2222');
  assert.deepEqual(queuedJob.customer.tags, ['vip']);
  assert.deepEqual(queuedJob.tags, ['electrical']);
  assert.equal(queuedJob.assignee.displayName, 'Team 2');
});

test('rejects inactive assignee', () => {
  const context = createContext();
  const customer = createCustomer(context);
  const job = context.services.jobs.createOneTimeJob(customer.id, validateJobInput({
    titleOrServiceSummary: 'Install outlet',
    customerAddressId: customer.addresses[0].id,
  }));

  assert.throws(() => context.services.jobs.assignJob(job.id, 'tm_0004'), /active assignable team member/);
});
