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

  if (!partial || 'displayName' in input || 'firstName' in input) {
    assertRequired(Boolean(displayName || firstName), 'CUSTOMER_IDENTITY_REQUIRED', 'Customer requires either displayName or firstName');
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

  const normalized = {
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
  };

  assertRequired(Boolean(normalized.displayName || normalized.firstName), 'CUSTOMER_IDENTITY_REQUIRED', 'Customer requires either displayName or firstName');

  return normalized;
}

function deriveDisplayName({ firstName, lastName, companyName }) {
  const person = [firstName, lastName].filter(Boolean).join(' ').trim();
  return person || firstName || companyName || '';
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
