import { httpError } from '../../lib/http.js';
import { asTrimmedString, assertEnum, assertNoUnsupportedV1Fields, assertRequired, normalizeTags } from '../../lib/validation.js';

const STATE_CODES = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']);

export function validateCustomerInput(input, { partial = false } = {}) {
  assertNoUnsupportedV1Fields(input);

  const displayName = asTrimmedString(input.displayName);
  const firstName = asTrimmedString(input.firstName);
  const lastName = asTrimmedString(input.lastName);
  const companyName = asTrimmedString(input.companyName ?? input.company);
  const role = asTrimmedString(input.role);
  const customerType = asTrimmedString(input.customerType || 'Homeowner');

  if (!partial || 'customerType' in input) {
    assertEnum(customerType, ['Homeowner', 'Business'], 'customerType');
  }

  if (!partial || 'displayName' in input || 'firstName' in input || 'companyName' in input || 'company' in input) {
    assertRequired(Boolean(displayName || firstName || companyName), 'CUSTOMER_IDENTITY_REQUIRED', 'Customer requires a first name, company, or derived display name');
  }

  const emails = normalizeEmails(input);
  const phones = normalizePhones(input);
  const addresses = normalizeAddresses(input);
  const tags = normalizeTags(input.tags);
  const state = asTrimmedString(input.state || input.address?.state).toUpperCase();

  if (state && !STATE_CODES.has(state)) {
    throw httpError(400, 'INVALID_STATE', 'State must be a valid US abbreviation', { field: 'state' });
  }

  for (const email of emails) {
    if (!/^\S+@\S+\.\S+$/.test(email.value)) {
      throw httpError(400, 'INVALID_EMAIL', 'Email must be syntactically valid', { value: email.value });
    }
  }

  if (partial) {
    const patch = {};

    assignIfPresent(patch, input, 'firstName', firstName);
    assignIfPresent(patch, input, 'lastName', lastName);
    assignIfPresent(patch, input, 'displayName', displayName);
    assignIfPresent(patch, input, 'companyName', companyName);
    assignIfPresent(patch, input, 'role', role);
    assignIfPresent(patch, input, 'customerType', customerType);
    if ('subcontractor' in input || 'customerType' in input) {
      patch.subcontractor = customerType === 'Business' ? Boolean(input.subcontractor) : false;
    }
    if ('doNotService' in input) patch.doNotService = Boolean(input.doNotService);
    if ('sendNotifications' in input) patch.sendNotifications = input.sendNotifications !== false;
    assignIfPresent(patch, input, 'customerNotes', asTrimmedString(input.customerNotes));
    assignIfPresent(patch, input, 'leadSource', asTrimmedString(input.leadSource));
    assignIfPresent(patch, input, 'referredBy', asTrimmedString(input.referredBy));
    if ('tags' in input) patch.tags = tags;
    if (hasAnyPhoneInput(input)) patch.phones = phones;
    if (hasAnyEmailInput(input)) patch.emails = emails;
    if (hasAnyAddressInput(input)) patch.addresses = addresses;

    return applyDoNotServiceInvariant(patch);
  }

  const normalized = applyDoNotServiceInvariant({
    firstName,
    lastName,
    displayName: displayName || deriveDisplayName({ firstName, lastName, companyName }),
    companyName,
    role,
    customerType,
    subcontractor: customerType === 'Business' ? Boolean(input.subcontractor) : false,
    doNotService: Boolean(input.doNotService),
    sendNotifications: input.sendNotifications !== false,
    customerNotes: asTrimmedString(input.customerNotes),
    leadSource: asTrimmedString(input.leadSource),
    referredBy: asTrimmedString(input.referredBy),
    tags,
    phones,
    emails,
    addresses,
  });

  assertRequired(Boolean(normalized.displayName || normalized.firstName || normalized.companyName), 'CUSTOMER_IDENTITY_REQUIRED', 'Customer requires a first name, company, or derived display name');

  return normalized;
}

function applyDoNotServiceInvariant(customer) {
  if (customer.doNotService) {
    customer.sendNotifications = false;
  }
  return customer;
}

function deriveDisplayName({ firstName, lastName, companyName }) {
  const person = [firstName, lastName].filter(Boolean).join(' ').trim();
  return person || firstName || companyName || '';
}

function assignIfPresent(target, source, key, value) {
  if (key in source || (key === 'companyName' && 'company' in source)) {
    target[key] = value;
  }
}

function hasAnyPhoneInput(input) {
  return 'mobilePhone' in input || 'homePhone' in input || 'workPhone' in input || 'additionalPhones' in input;
}

function hasAnyEmailInput(input) {
  return 'email' in input || 'additionalEmails' in input;
}

function hasAnyAddressInput(input) {
  return 'street' in input || 'unit' in input || 'city' in input || 'state' in input || 'zip' in input || 'addressNotes' in input || 'additionalAddresses' in input;
}

function normalizeEmails(input) {
  const values = [];
  const primary = asTrimmedString(input.email);
  if (primary) values.push({ value: primary });
  for (const row of input.additionalEmails || []) {
    const value = asTrimmedString(row?.value ?? row);
    if (value) values.push({ value });
  }
  return values;
}

function normalizePhones(input) {
  const values = [];
  for (const candidate of [
    { value: input.mobilePhone, note: 'Mobile', type: 'mobile' },
    { value: input.homePhone, note: 'Home', type: 'home' },
    { value: input.workPhone, note: 'Work', type: 'work' },
  ]) {
    const value = asTrimmedString(candidate.value);
    if (value) values.push({ value, note: candidate.note, type: candidate.type });
  }
  for (const row of input.additionalPhones || []) {
    const value = asTrimmedString(row?.value ?? row);
    if (value) {
      values.push({
        value,
        note: asTrimmedString(row?.note),
        type: asTrimmedString(row?.type) || 'other',
      });
    }
  }
  return values;
}

function normalizeAddresses(input) {
  const street = asTrimmedString(input.street);
  const unit = asTrimmedString(input.unit);
  const city = asTrimmedString(input.city);
  const state = asTrimmedString(input.state).toUpperCase();
  const zip = asTrimmedString(input.zip);
  const notes = asTrimmedString(input.addressNotes);

  const addresses = [];
  if (street || city || state || zip || notes || unit) {
    addresses.push({ street, unit, city, state, zip, notes });
  }
  for (const row of input.additionalAddresses || []) {
    const address = {
      street: asTrimmedString(row?.street),
      unit: asTrimmedString(row?.unit),
      city: asTrimmedString(row?.city),
      state: asTrimmedString(row?.state).toUpperCase(),
      zip: asTrimmedString(row?.zip),
      notes: asTrimmedString(row?.notes),
    };
    if (address.street || address.city || address.state || address.zip || address.unit || address.notes) {
      if (address.state && !STATE_CODES.has(address.state)) {
        throw httpError(400, 'INVALID_STATE', 'State must be a valid US abbreviation', { field: 'additionalAddresses.state' });
      }
      addresses.push(address);
    }
  }
  return addresses;
}
