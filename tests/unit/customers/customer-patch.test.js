import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from '../../../src/bootstrap/create-context.js';
import { validateCustomerInput } from '../../../src/validation/customers/customer-input.validator.js';

function createCustomer(context) {
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

test('customer partial update preserves omitted subrecords and fields', () => {
  const context = createContext();
  const customer = createCustomer(context);

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
