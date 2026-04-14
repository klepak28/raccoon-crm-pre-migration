import {
  asTrimmedString,
  assertNoMultiAssigneeFields,
  assertNoUnsupportedV1Fields,
  assertRequired,
} from '../../lib/validation.js';

export function validateAssignJobInput(input) {
  assertNoUnsupportedV1Fields(input);
  assertNoMultiAssigneeFields(input);
  const teamMemberId = asTrimmedString(input.teamMemberId);
  assertRequired(Boolean(teamMemberId), 'TEAM_MEMBER_REQUIRED', 'Assign requires teamMemberId');
  return {
    teamMemberId,
  };
}
