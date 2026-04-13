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
