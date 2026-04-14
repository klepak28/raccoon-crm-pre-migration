import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomerInput } from '../../../src/validation/customers/customer-input.validator.js';

test('accepts displayName-only customer identity', () => {
  const result = validateCustomerInput({
    displayName: 'Acme HQ',
    customerType: 'Business',
    state: 'TX',
  });

  assert.equal(result.displayName, 'Acme HQ');
  assert.equal(result.customerType, 'Business');
});

test('accepts firstName-only customer identity', () => {
  const result = validateCustomerInput({
    firstName: 'Alex',
    customerType: 'Homeowner',
  });

  assert.equal(result.displayName, 'Alex');
});

test('rejects customer when displayName and firstName are both missing', () => {
  assert.throws(() => validateCustomerInput({ customerType: 'Homeowner' }), /displayName or firstName/);
});

test('rejects malformed email', () => {
  assert.throws(() => validateCustomerInput({ displayName: 'Bad Email', email: 'nope', customerType: 'Homeowner' }), /syntactically valid/);
});

test('do-not-service turns notifications off on create payloads', () => {
  const result = validateCustomerInput({
    displayName: 'Blocked Customer',
    customerType: 'Homeowner',
    doNotService: true,
    sendNotifications: true,
  });

  assert.equal(result.doNotService, true);
  assert.equal(result.sendNotifications, false);
});

test('do-not-service patch forces notifications off', () => {
  const result = validateCustomerInput({
    doNotService: true,
    sendNotifications: true,
  }, { partial: true });

  assert.equal(result.doNotService, true);
  assert.equal(result.sendNotifications, false);
});
