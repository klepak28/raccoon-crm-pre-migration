import { asTrimmedString, assertRequired } from '../../lib/validation.js';
import { httpError } from '../../lib/http.js';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export function validateTeamMemberInput(input, { partial = false } = {}) {
  const displayName = asTrimmedString(input.displayName || input.name);
  const color = asTrimmedString(input.color || '#5b7cff');
  const activeOnSchedule = input.activeOnSchedule !== false;

  if (!partial || 'displayName' in input || 'name' in input) {
    assertRequired(Boolean(displayName), 'TEAM_MEMBER_NAME_REQUIRED', 'Employee team requires a name');
  }

  if ((!partial || 'color' in input) && !HEX_COLOR.test(color)) {
    throw httpError(400, 'INVALID_TEAM_COLOR', 'Employee team color must be a valid hex color', { field: 'color' });
  }

  const normalized = {
    displayName,
    initials: deriveInitials(displayName),
    color,
    activeOnSchedule,
  };

  if (!partial) {
    return normalized;
  }

  const patch = {};
  if ('displayName' in input || 'name' in input) {
    patch.displayName = normalized.displayName;
    patch.initials = normalized.initials;
  }
  if ('color' in input) patch.color = normalized.color;
  if ('activeOnSchedule' in input) patch.activeOnSchedule = normalized.activeOnSchedule;
  return patch;
}

function deriveInitials(displayName) {
  const parts = String(displayName || '').split(/\s+/).filter(Boolean).slice(0, 2);
  return (parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'TM').slice(0, 2);
}
