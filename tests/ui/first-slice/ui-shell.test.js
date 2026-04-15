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

test('customers shell is served on the expected route', async () => {
  const app = createApp({ staticRoot, context: createContext() });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app/customers/list`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /CRM V1/);
    assert.match(html, /\/static\/app.js/);
  });
});

test('scheduler shell is served on the expected route', async () => {
  const app = createApp({ staticRoot, context: createContext() });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app/calendar_new`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /CRM V1/);
  });
});

test('settings shell is served on the expected route', async () => {
  const app = createApp({ staticRoot, context: createContext() });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app/settings`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /CRM V1/);
  });
});

test('dedicated customer detail shell is served on the expected route', async () => {
  const app = createApp({ staticRoot, context: createContext() });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app/customers/c_0001`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /CRM V1/);
    assert.match(html, /\/static\/app.js/);
  });
});

test('dedicated new job shell is served on the expected route', async () => {
  const app = createApp({ staticRoot, context: createContext() });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app/jobs/new?customerId=cust_0001`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /CRM V1/);
    assert.match(html, /\/static\/app.js/);
  });
});

test('dedicated job schedule shell is served on the expected route', async () => {
  const app = createApp({ staticRoot, context: createContext() });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app/jobs/job_0001/schedule`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /CRM V1/);
    assert.match(html, /\/static\/app.js/);
  });
});

test('dedicated recurring new job shell is served on the expected route', async () => {
  const app = createApp({ staticRoot, context: createContext() });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app/recurring_jobs/new`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /CRM V1/);
    assert.match(html, /\/static\/app.js/);
  });
});
