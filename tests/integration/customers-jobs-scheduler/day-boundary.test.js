// Integration regression tests: scheduler day filtering must use the same local-day
// interpretation as the UI input path (datetime-local -> new Date(local).toISOString()).
// V1 rule: all of schedule input, day filtering, and display agree on local midnight boundaries.

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

// Mirror the browser conversion in app.js toIso(): interpret datetime-local in the
// local timezone, then serialize to UTC ISO. This keeps tests aligned with the UI.
function uiLocalToIso(localDateTimeString) {
  return new Date(localDateTimeString).toISOString();
}

async function setupCustomerAndJob(baseUrl, titleOrServiceSummary) {
  const customerRes = await fetch(`${baseUrl}/api/customers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      displayName: 'Day Boundary Customer',
      customerType: 'Homeowner',
      street: '1 Main',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
    }),
  });
  const { item: customer } = await customerRes.json();

  const jobRes = await fetch(`${baseUrl}/api/customers/${customer.id}/jobs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      titleOrServiceSummary,
      customerAddressId: customer.addresses[0].id,
    }),
  });
  const { item: job } = await jobRes.json();
  return { customer, job };
}

test('job scheduled via UI-style local input appears on the selected local day', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const { job } = await setupCustomerAndJob(baseUrl, 'Midday local job');

    // Schedule using the same conversion the UI uses (local → ISO)
    await fetch(`${baseUrl}/api/jobs/${job.id}/schedule`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduledStartAt: uiLocalToIso('2026-04-15T10:00'),
        scheduledEndAt: uiLocalToIso('2026-04-15T11:00'),
      }),
    });

    const scheduleRes = await fetch(`${baseUrl}/api/schedule/day?date=2026-04-15`);
    const { item: schedule } = await scheduleRes.json();

    const allJobIds = schedule.lanes.flatMap((lane) => lane.jobs.map((j) => j.id));
    assert.ok(allJobIds.includes(job.id), 'job must appear on the selected local day');
  });
});

test('job scheduled via UI-style near-midnight local input appears on the selected local day', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const { job } = await setupCustomerAndJob(baseUrl, 'Near midnight local job');

    // User schedules for 11:30pm–11:59pm local on the 15th
    await fetch(`${baseUrl}/api/jobs/${job.id}/schedule`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduledStartAt: uiLocalToIso('2026-04-15T23:30'),
        scheduledEndAt: uiLocalToIso('2026-04-15T23:59'),
      }),
    });

    const scheduleRes = await fetch(`${baseUrl}/api/schedule/day?date=2026-04-15`);
    const { item: schedule } = await scheduleRes.json();
    const prevDayRes = await fetch(`${baseUrl}/api/schedule/day?date=2026-04-14`);
    const { item: prevSchedule } = await prevDayRes.json();

    const onSelectedDay = schedule.lanes.flatMap((l) => l.jobs.map((j) => j.id));
    const onPrevDay = prevSchedule.lanes.flatMap((l) => l.jobs.map((j) => j.id));

    assert.ok(onSelectedDay.includes(job.id), 'near-midnight job must appear on selected local day');
    assert.ok(!onPrevDay.includes(job.id), 'near-midnight job must not appear on previous day');
  });
});

test('job at local midnight start appears on the start day not the previous day', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const { job } = await setupCustomerAndJob(baseUrl, 'Midnight start job');

    // User schedules from midnight local on the 16th
    await fetch(`${baseUrl}/api/jobs/${job.id}/schedule`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduledStartAt: uiLocalToIso('2026-04-16T00:00'),
        scheduledEndAt: uiLocalToIso('2026-04-16T01:00'),
      }),
    });

    const scheduleRes = await fetch(`${baseUrl}/api/schedule/day?date=2026-04-16`);
    const { item: schedule } = await scheduleRes.json();
    const prevDayRes = await fetch(`${baseUrl}/api/schedule/day?date=2026-04-15`);
    const { item: prevSchedule } = await prevDayRes.json();

    const onStartDay = schedule.lanes.flatMap((l) => l.jobs.map((j) => j.id));
    const onPrevDay = prevSchedule.lanes.flatMap((l) => l.jobs.map((j) => j.id));

    assert.ok(onStartDay.includes(job.id), 'midnight-start job must appear on its start day');
    assert.ok(!onPrevDay.includes(job.id), 'midnight-start job must not appear on previous day');
  });
});

test('job schedule detail and day schedule agree on the same near-midnight example', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const { job } = await setupCustomerAndJob(baseUrl, 'Detail agreement job');

    await fetch(`${baseUrl}/api/jobs/${job.id}/schedule`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduledStartAt: uiLocalToIso('2026-04-17T23:00'),
        scheduledEndAt: uiLocalToIso('2026-04-17T23:45'),
      }),
    });

    const [jobDetailRes, scheduleRes] = await Promise.all([
      fetch(`${baseUrl}/api/jobs/${job.id}`),
      fetch(`${baseUrl}/api/schedule/day?date=2026-04-17`),
    ]);

    const { item: jobDetail } = await jobDetailRes.json();
    const { item: schedule } = await scheduleRes.json();

    const onSelectedDay = schedule.lanes.flatMap((l) => l.jobs.map((j) => j.id));

    // The job detail record and the day schedule must agree
    assert.equal(jobDetail.scheduleState, 'scheduled');
    assert.ok(onSelectedDay.includes(job.id),
      'job visible in detail must also appear on the day schedule for the same local date');
  });
});
