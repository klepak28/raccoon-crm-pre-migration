// Regression tests for customer partial update (PATCH) preservation semantics.
// These tests target the service layer directly to verify the merge contract.
// The integration test covers the full HTTP route path.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from '../../../src/bootstrap/create-context.js';
import { validateCustomerInput } from '../../../src/validation/customers/customer-input.validator.js';

function createFullCustomer(context) {
  return context.services.customers.createCustomer(validateCustomerInput({
    displayName: 'Patch Target',
    customerType: 'Homeowner',
    mobilePhone: '555-111-2222',
    email: 'patch@example.com',
    street: '1 Main',
    city: 'Austin',
    state: 'TX',
    zip: '73301',
    tags: ['vip', 'north'],
    customerNotes: 'Keep gate closed',
  }));
}

test('patching displayName only preserves existing phones, emails, addresses, tags, and notes', () => {
  const context = createContext();
  const customer = createFullCustomer(context);

  const updated = context.services.customers.updateCustomerBasic(customer.id, {
    displayName: 'Patch Target Updated',
  });

  assert.equal(updated.displayName, 'Patch Target Updated');
  assert.equal(updated.phones.length, 1);
  assert.equal(updated.phones[0].value, '555-111-2222');
  assert.equal(updated.emails.length, 1);
  assert.equal(updated.emails[0].value, 'patch@example.com');
  assert.equal(updated.addresses.length, 1);
  assert.equal(updated.addresses[0].street, '1 Main');
  assert.deepEqual(updated.tags, ['vip', 'north']);
  assert.equal(updated.customerNotes, 'Keep gate closed');
});

test('patching customerNotes only preserves identity, phones, emails, addresses, and tags', () => {
  const context = createContext();
  const customer = createFullCustomer(context);

  const updated = context.services.customers.updateCustomerBasic(customer.id, {
    customerNotes: 'Updated gate note',
  });

  assert.equal(updated.customerNotes, 'Updated gate note');
  assert.equal(updated.displayName, 'Patch Target');
  assert.equal(updated.phones.length, 1);
  assert.equal(updated.emails.length, 1);
  assert.equal(updated.addresses.length, 1);
  assert.deepEqual(updated.tags, ['vip', 'north']);
});

test('patching tags only preserves phones, emails, and addresses', () => {
  const context = createContext();
  const customer = createFullCustomer(context);

  // Simulate the validated patch object produced by validateCustomerInput(body, { partial: true })
  const patch = validateCustomerInput({ tags: 'priority' }, { partial: true });
  const updated = context.services.customers.updateCustomerBasic(customer.id, patch);

  assert.deepEqual(updated.tags, ['priority']);
  assert.equal(updated.phones.length, 1);
  assert.equal(updated.emails.length, 1);
  assert.equal(updated.addresses.length, 1);
  assert.equal(updated.customerNotes, 'Keep gate closed');
});

test('patching doNotService only preserves all identity and contact data', () => {
  const context = createContext();
  const customer = createFullCustomer(context);

  const patch = validateCustomerInput({ doNotService: true }, { partial: true });
  const updated = context.services.customers.updateCustomerBasic(customer.id, patch);

  assert.equal(updated.doNotService, true);
  assert.equal(updated.displayName, 'Patch Target');
  assert.equal(updated.phones.length, 1);
  assert.equal(updated.emails.length, 1);
  assert.equal(updated.addresses.length, 1);
  assert.deepEqual(updated.tags, ['vip', 'north']);
});

test('effective post-merge identity is valid after patching non-identity fields', () => {
  const context = createContext();
  const customer = createFullCustomer(context);

  const patch = validateCustomerInput({ customerNotes: 'Note only' }, { partial: true });
  const updated = context.services.customers.updateCustomerBasic(customer.id, patch);

  assert.ok(updated.displayName || updated.firstName, 'merged customer must still have valid identity');
});

test('patch that would erase effective identity is rejected', () => {
  const context = createContext();
  const customer = context.services.customers.createCustomer(
    validateCustomerInput({ firstName: 'OnlyFirst', customerType: 'Homeowner' }),
  );

  // Explicitly clear both identity fields — the service must reject this after merging
  assert.throws(
    () => context.services.customers.updateCustomerBasic(customer.id, { displayName: '', firstName: '' }),
    /displayName or firstName/,
  );
});

test('patching unknown customer id throws not found', () => {
  const context = createContext();
  assert.throws(
    () => context.services.customers.updateCustomerBasic('cust_9999', { customerNotes: 'Ghost' }),
    /not found/i,
  );
});
