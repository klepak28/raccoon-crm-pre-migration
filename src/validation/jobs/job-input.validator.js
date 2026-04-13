import { asTrimmedString, assertNoUnsupportedV1Fields, assertRequired, normalizeTags } from '../../lib/validation.js';

export function validateJobInput(input) {
  assertNoUnsupportedV1Fields(input);

  const titleOrServiceSummary = asTrimmedString(input.titleOrServiceSummary || input.description || input.serviceSummary);
  const customerAddressId = asTrimmedString(input.customerAddressId);

  assertRequired(Boolean(titleOrServiceSummary), 'JOB_TITLE_REQUIRED', 'One-time job requires titleOrServiceSummary');
  assertRequired(Boolean(customerAddressId), 'JOB_ADDRESS_REQUIRED', 'One-time job requires an explicit customerAddressId');

  return {
    titleOrServiceSummary,
    customerAddressId,
    leadSource: asTrimmedString(input.leadSource),
    privateNotes: asTrimmedString(input.privateNotes),
    tags: normalizeTags(input.tags),
  };
}
