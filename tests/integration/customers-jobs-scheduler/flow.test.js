import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../../src/app.js';
import { createContext } from '../../../src/bootstrap/create-context.js';
import { withServer } from '../../helpers/http-test-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticRoot = path.resolve(__dirname, '../../../src/ui/static');

async function createTeamMember(baseUrl, overrides = {}) {
  const response = await fetch(`${baseUrl}/api/team-members`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      displayName: 'Team Blue',
      color: '#5b7cff',
      ...overrides,
    }),
  });
  const payload = await response.json();
  return payload.item;
}

test('customer -> job -> schedule -> assign -> day schedule flow works', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const teamMember = await createTeamMember(baseUrl, { displayName: 'Team Green', color: '#16a34a' });
    const customerResponse = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Flow Customer',
        customerType: 'Homeowner',
        street: '1 Main',
        city: 'Austin',
        state: 'TX',
        zip: '73301',
      }),
    });
    const customerPayload = await customerResponse.json();
    assert.equal(customerResponse.status, 201);

    const addressId = customerPayload.item.addresses[0].id;
    const customerId = customerPayload.item.id;

    const jobResponse = await fetch(`${baseUrl}/api/customers/${customerId}/jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleOrServiceSummary: 'Replace switch',
        customerAddressId: addressId,
      }),
    });
    const jobPayload = await jobResponse.json();
    assert.equal(jobResponse.status, 201);

    const jobId = jobPayload.item.id;
    await fetch(`${baseUrl}/api/jobs/${jobId}/schedule`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduledStartAt: '2026-04-13T10:00:00.000Z',
        scheduledEndAt: '2026-04-13T11:00:00.000Z',
      }),
    });

    await fetch(`${baseUrl}/api/jobs/${jobId}/assign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ teamMemberId: teamMember.id }),
    });

    const scheduleResponse = await fetch(`${baseUrl}/api/schedule/day?date=2026-04-13`);
    const schedulePayload = await scheduleResponse.json();
    const lane = schedulePayload.item.lanes.find((item) => item.id === teamMember.id);
    assert.equal(lane.jobs.length, 1);
    assert.equal(lane.jobs[0].id, jobId);
  });
});

test('team member API supports create and update for settings employees tab', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const created = await createTeamMember(baseUrl, { displayName: 'North Team', color: '#ff7a59' });

    const patchResponse = await fetch(`${baseUrl}/api/team-members/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: 'North Crew', color: '#22c55e' }),
    });
    const patchPayload = await patchResponse.json();

    assert.equal(patchResponse.status, 200);
    assert.equal(patchPayload.item.displayName, 'North Crew');
    assert.equal(patchPayload.item.color, '#22c55e');
  });
});

test('customer PATCH preserves omitted subrecords', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const teamMember = await createTeamMember(baseUrl);
    const customerResponse = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Patch Flow',
        customerType: 'Homeowner',
        mobilePhone: '555-222-3333',
        email: 'patch-flow@example.com',
        street: '1 Main',
        city: 'Austin',
        state: 'TX',
        zip: '73301',
        tags: ['blue'],
      }),
    });
    const customerPayload = await customerResponse.json();
    const customerId = customerPayload.item.id;

    const patchResponse = await fetch(`${baseUrl}/api/customers/${customerId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: 'Patch Flow Updated' }),
    });
    assert.equal(patchResponse.status, 200);

    const detailResponse = await fetch(`${baseUrl}/api/customers/${customerId}`);
    const detailPayload = await detailResponse.json();

    assert.equal(detailPayload.item.displayName, 'Patch Flow Updated');
    assert.equal(detailPayload.item.phones.length, 1);
    assert.equal(detailPayload.item.emails.length, 1);
    assert.equal(detailPayload.item.addresses.length, 1);
    assert.deepEqual(detailPayload.item.tags, ['blue']);
  });
});

test('schedule day query stays consistent with UI local datetime input near midnight', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const teamMember = await createTeamMember(baseUrl, { displayName: 'Range Team', color: '#5b7cff' });
    const customerResponse = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Near Midnight Flow',
        customerType: 'Homeowner',
        street: '1 Main',
        city: 'Austin',
        state: 'TX',
        zip: '73301',
      }),
    });
    const customerPayload = await customerResponse.json();
    const customerId = customerPayload.item.id;
    const addressId = customerPayload.item.addresses[0].id;

    const jobResponse = await fetch(`${baseUrl}/api/customers/${customerId}/jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleOrServiceSummary: 'Midnight repair',
        customerAddressId: addressId,
      }),
    });
    const jobPayload = await jobResponse.json();
    const jobId = jobPayload.item.id;

    // V1 UTC convention: treat datetime-local strings as UTC directly (append Z, no offset).
    const scheduledStartAt = '2026-04-13T23:30:00.000Z';
    const scheduledEndAt = '2026-04-14T00:30:00.000Z';

    const scheduleResponse = await fetch(`${baseUrl}/api/jobs/${jobId}/schedule`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scheduledStartAt, scheduledEndAt }),
    });
    assert.equal(scheduleResponse.status, 200);

    const day13Response = await fetch(`${baseUrl}/api/schedule/day?date=2026-04-13`);
    const day13Payload = await day13Response.json();
    assert.equal(day13Payload.item.lanes[0].jobs.some((item) => item.id === jobId), true);

    const detailResponse = await fetch(`${baseUrl}/api/jobs/${jobId}`);
    const detailPayload = await detailResponse.json();
    assert.match(detailPayload.item.scheduledStartAt, /^2026-04-14T|^2026-04-13T/);
  });
});

test('schedule range query supports calendar views across multiple days', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const teamMember = await createTeamMember(baseUrl, { displayName: 'Range Team', color: '#5b7cff' });
    const customerResponse = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Calendar Range Customer',
        customerType: 'Homeowner',
        street: '1 Main',
        city: 'Austin',
        state: 'TX',
        zip: '73301',
      }),
    });
    const customerPayload = await customerResponse.json();
    const customerId = customerPayload.item.id;
    const addressId = customerPayload.item.addresses[0].id;

    const firstJobResponse = await fetch(`${baseUrl}/api/customers/${customerId}/jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleOrServiceSummary: 'Tuesday visit',
        customerAddressId: addressId,
      }),
    });
    const firstJobPayload = await firstJobResponse.json();

    const secondJobResponse = await fetch(`${baseUrl}/api/customers/${customerId}/jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleOrServiceSummary: 'Thursday visit',
        customerAddressId: addressId,
      }),
    });
    const secondJobPayload = await secondJobResponse.json();

    await fetch(`${baseUrl}/api/jobs/${firstJobPayload.item.id}/schedule`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduledStartAt: '2026-04-14T14:00:00.000Z',
        scheduledEndAt: '2026-04-14T15:00:00.000Z',
      }),
    });

    await fetch(`${baseUrl}/api/jobs/${secondJobPayload.item.id}/schedule`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduledStartAt: '2026-04-16T09:00:00.000Z',
        scheduledEndAt: '2026-04-16T10:00:00.000Z',
      }),
    });

    await fetch(`${baseUrl}/api/jobs/${secondJobPayload.item.id}/assign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ teamMemberId: teamMember.id }),
    });

    const rangeResponse = await fetch(`${baseUrl}/api/schedule/range?startDate=2026-04-13&endDate=2026-04-19`);
    const rangePayload = await rangeResponse.json();

    assert.equal(rangeResponse.status, 200);
    assert.equal(rangePayload.item.jobs.length, 2);
    assert.equal(rangePayload.item.jobs.some((item) => item.id === firstJobPayload.item.id), true);
    assert.equal(rangePayload.item.jobs.some((item) => item.id === secondJobPayload.item.id), true);
    assert.equal(rangePayload.item.lanes.some((lane) => lane.id === 'unassigned'), true);
    assert.equal(rangePayload.item.lanes.some((lane) => lane.id === teamMember.id), true);
  });
});

test('operational job list supports unscheduled queue and preserves assignee after unschedule', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const teamMember = await createTeamMember(baseUrl);
    const customerResponse = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Queue Customer',
        customerType: 'Homeowner',
        street: '1 Main',
        city: 'Austin',
        state: 'TX',
        zip: '73301',
      }),
    });
    const customerPayload = await customerResponse.json();
    const customerId = customerPayload.item.id;
    const addressId = customerPayload.item.addresses[0].id;

    const jobResponse = await fetch(`${baseUrl}/api/customers/${customerId}/jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleOrServiceSummary: 'Queue visit',
        customerAddressId: addressId,
      }),
    });
    const jobPayload = await jobResponse.json();
    const jobId = jobPayload.item.id;

    await fetch(`${baseUrl}/api/jobs/${jobId}/assign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ teamMemberId: teamMember.id }),
    });

    let unscheduledResponse = await fetch(`${baseUrl}/api/jobs?scheduleState=unscheduled`);
    let unscheduledPayload = await unscheduledResponse.json();
    assert.equal(unscheduledResponse.status, 200);
    assert.equal(unscheduledPayload.items.some((item) => item.id === jobId), true);
    assert.equal(unscheduledPayload.items.find((item) => item.id === jobId).assignee.displayName, teamMember.displayName);

    await fetch(`${baseUrl}/api/jobs/${jobId}/schedule`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduledStartAt: '2026-04-15T09:00:00.000Z',
        scheduledEndAt: '2026-04-15T10:00:00.000Z',
      }),
    });

    await fetch(`${baseUrl}/api/jobs/${jobId}/unschedule`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const detailResponse = await fetch(`${baseUrl}/api/jobs/${jobId}`);
    const detailPayload = await detailResponse.json();
    assert.equal(detailPayload.item.scheduleState, 'unscheduled');
    assert.equal(detailPayload.item.assignee.displayName, teamMember.displayName);

    unscheduledResponse = await fetch(`${baseUrl}/api/jobs?scheduleState=unscheduled`);
    unscheduledPayload = await unscheduledResponse.json();
    const queuedJob = unscheduledPayload.items.find((item) => item.id === jobId);
    assert.equal(queuedJob.customer.displayName, 'Queue Customer');
    assert.equal(queuedJob.assignee.displayName, teamMember.displayName);
  });
});

test('recurrence rule changes require this_and_future scope', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const customerResponse = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Recurring Scope Customer',
        customerType: 'Homeowner',
        street: '1 Main',
        city: 'Austin',
        state: 'TX',
        zip: '73301',
      }),
    });
    const customerPayload = await customerResponse.json();
    const customerId = customerPayload.item.id;
    const addressId = customerPayload.item.addresses[0].id;

    const jobResponse = await fetch(`${baseUrl}/api/customers/${customerId}/jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titleOrServiceSummary: 'Recurring visit',
        customerAddressId: addressId,
      }),
    });
    const jobPayload = await jobResponse.json();
    const jobId = jobPayload.item.id;

    await fetch(`${baseUrl}/api/jobs/${jobId}/schedule`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduledStartAt: '2026-04-15T09:00:00.000Z',
        scheduledEndAt: '2026-04-15T10:00:00.000Z',
      }),
    });

    const enableResponse = await fetch(`${baseUrl}/api/jobs/${jobId}/recurrence`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        recurrenceFrequency: 'weekly',
        recurrenceInterval: 1,
        recurrenceDayOfWeek: ['WED'],
        recurrenceEndMode: 'after_n_occurrences',
        recurrenceOccurrenceCount: 4,
      }),
    });
    assert.equal(enableResponse.status, 201);

    const editResponse = await fetch(`${baseUrl}/api/jobs/${jobId}/occurrence-edit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scope: 'this',
        recurrenceRule: {
          recurrenceFrequency: 'monthly',
          recurrenceInterval: 1,
          recurrenceDayOfMonth: 15,
          recurrenceEndMode: 'after_n_occurrences',
          recurrenceOccurrenceCount: 3,
        },
      }),
    });
    const editPayload = await editResponse.json();

    assert.equal(editResponse.status, 400);
    assert.equal(editPayload.error.code, 'RECURRENCE_SCOPE_REQUIRES_FUTURE');
  });
});

test('unsupported recurrence and invoice fields are rejected explicitly', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Bad Payload',
        customerType: 'Homeowner',
        recurrenceRule: 'weekly',
      }),
    });
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.error.code, 'UNSUPPORTED_V1_FIELDS');
  });
});
