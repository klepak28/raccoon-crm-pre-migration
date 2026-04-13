import { asTrimmedString, assertNoUnsupportedV1Fields } from '../../lib/validation.js';

export function validateAssignJobInput(input) {
  assertNoUnsupportedV1Fields(input);
  return {
    teamMemberId: asTrimmedString(input.teamMemberId),
  };
}
