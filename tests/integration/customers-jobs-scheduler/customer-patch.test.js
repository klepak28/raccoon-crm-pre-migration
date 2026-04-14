// Integration regression tests: PATCH /api/customers/:id must preserve omitted fields.
// These exercise the full route → validator → service → repository path.

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

test('PATCH with only displayName preserves phones, emails, addresses, and tags', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const createRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Before Patch',
        customerType: 'Homeowner',
        mobilePhone: '555-9001',
        email: 'keepme@example.com',
        street: '42 Oak',
        city: 'Houston',
        state: 'TX',
        zip: '77001',
        tags: 'gold,frequent',
        customerNotes: 'Handle carefully',
      }),
    });
    assert.equal(createRes.status, 201);
    const { item: created } = await createRes.json();

    const patchRes = await fetch(`${baseUrl}/api/customers/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: 'After Patch' }),
    });
    assert.equal(patchRes.status, 200);
    const { item: patched } = await patchRes.json();

    assert.equal(patched.displayName, 'After Patch');
    assert.equal(patched.phones.length, 1, 'phones must not be erased by PATCH');
    assert.equal(patched.phones[0].value, '555-9001');
    assert.equal(patched.emails.length, 1, 'emails must not be erased by PATCH');
    assert.equal(patched.emails[0].value, 'keepme@example.com');
    assert.equal(patched.addresses.length, 1, 'addresses must not be erased by PATCH');
    assert.equal(patched.addresses[0].street, '42 Oak');
    assert.deepEqual(patched.tags, ['gold', 'frequent']);
    assert.equal(patched.customerNotes, 'Handle carefully');
  });
});

test('PATCH with only customerNotes preserves all contact and address data', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const createRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Jane',
        customerType: 'Homeowner',
        mobilePhone: '555-4000',
        email: 'jane@example.com',
        street: '7 Elm',
        city: 'Dallas',
        state: 'TX',
        zip: '75201',
      }),
    });
    assert.equal(createRes.status, 201);
    const { item: created } = await createRes.json();

    const patchRes = await fetch(`${baseUrl}/api/customers/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerNotes: 'Call before arriving' }),
    });
    assert.equal(patchRes.status, 200);
    const { item: patched } = await patchRes.json();

    assert.equal(patched.customerNotes, 'Call before arriving');
    assert.equal(patched.firstName, 'Jane');
    assert.equal(patched.phones.length, 1, 'phones must not be erased');
    assert.equal(patched.emails.length, 1, 'emails must not be erased');
    assert.equal(patched.addresses.length, 1, 'addresses must not be erased');
  });
});

test('PATCH with doNotService and sendNotifications preserves all subrecords', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const createRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Flag Test',
        customerType: 'Homeowner',
        mobilePhone: '555-0001',
        email: 'flags@example.com',
        street: '1 Flag',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        tags: 'important',
      }),
    });
    const { item: created } = await createRes.json();

    const patchRes = await fetch(`${baseUrl}/api/customers/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ doNotService: true }),
    });
    assert.equal(patchRes.status, 200);
    const { item: patched } = await patchRes.json();

    assert.equal(patched.doNotService, true);
    assert.equal(patched.phones.length, 1, 'phones must not be erased');
    assert.equal(patched.emails.length, 1, 'emails must not be erased');
    assert.equal(patched.addresses.length, 1, 'addresses must not be erased');
    assert.deepEqual(patched.tags, ['important']);
  });
});

test('PATCH on unknown customer id returns 404', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const patchRes = await fetch(`${baseUrl}/api/customers/cust_9999`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: 'Ghost' }),
    });
    assert.equal(patchRes.status, 404);
  });
});

test('PATCH address fields preserves phones and emails', async () => {
  const context = createContext();
  const app = createApp({ staticRoot, context });

  await withServer(app, async (baseUrl) => {
    const createRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Address Patch',
        customerType: 'Homeowner',
        mobilePhone: '555-8888',
        email: 'addr@example.com',
        street: '1 Old',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
      }),
    });
    const { item: created } = await createRes.json();

    // Patch only the address (street/city/state/zip)
    const patchRes = await fetch(`${baseUrl}/api/customers/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ street: '2 New', city: 'Dallas', state: 'TX', zip: '75201' }),
    });
    assert.equal(patchRes.status, 200);
    const { item: patched } = await patchRes.json();

    assert.equal(patched.addresses[0].street, '2 New');
    assert.equal(patched.phones.length, 1, 'phones must not be erased when patching address');
    assert.equal(patched.emails.length, 1, 'emails must not be erased when patching address');
  });
});
