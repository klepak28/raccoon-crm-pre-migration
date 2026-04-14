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

test('customer -> job -> schedule -> assign -> day schedule flow works', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
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
      body: JSON.stringify({ teamMemberId: 'tm_0002' }),
    });

    const scheduleResponse = await fetch(`${baseUrl}/api/schedule/day?date=2026-04-13`);
    const schedulePayload = await scheduleResponse.json();
    const lane = schedulePayload.item.lanes.find((item) => item.id === 'tm_0002');
    assert.equal(lane.jobs.length, 1);
    assert.equal(lane.jobs[0].id, jobId);
  });
});

test('customer PATCH preserves omitted subrecords', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
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
      body: JSON.stringify({ teamMemberId: 'tm_0001' }),
    });

    const rangeResponse = await fetch(`${baseUrl}/api/schedule/range?startDate=2026-04-13&endDate=2026-04-19`);
    const rangePayload = await rangeResponse.json();

    assert.equal(rangeResponse.status, 200);
    assert.equal(rangePayload.item.jobs.length, 2);
    assert.equal(rangePayload.item.jobs.some((item) => item.id === firstJobPayload.item.id), true);
    assert.equal(rangePayload.item.jobs.some((item) => item.id === secondJobPayload.item.id), true);
    assert.equal(rangePayload.item.lanes.some((lane) => lane.id === 'unassigned'), true);
    assert.equal(rangePayload.item.lanes.some((lane) => lane.id === 'tm_0001'), true);
  });
});

test('operational job list supports unscheduled queue and preserves assignee after unschedule', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
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
      body: JSON.stringify({ teamMemberId: 'tm_0001' }),
    });

    let unscheduledResponse = await fetch(`${baseUrl}/api/jobs?scheduleState=unscheduled`);
    let unscheduledPayload = await unscheduledResponse.json();
    assert.equal(unscheduledResponse.status, 200);
    assert.equal(unscheduledPayload.items.some((item) => item.id === jobId), true);
    assert.equal(unscheduledPayload.items.find((item) => item.id === jobId).assignee.displayName, 'Team 1');

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
    assert.equal(detailPayload.item.assignee.displayName, 'Team 1');

    unscheduledResponse = await fetch(`${baseUrl}/api/jobs?scheduleState=unscheduled`);
    unscheduledPayload = await unscheduledResponse.json();
    const queuedJob = unscheduledPayload.items.find((item) => item.id === jobId);
    assert.equal(queuedJob.customer.displayName, 'Queue Customer');
    assert.equal(queuedJob.assignee.displayName, 'Team 1');
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
