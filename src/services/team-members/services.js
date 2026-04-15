import { httpError } from '../../lib/http.js';

export function createTeamMemberServices({ teamMemberRepository, jobRepository }) {
  return {
    listTeamMembers() {
      return teamMemberRepository.list().sort(compareTeamMembers);
    },
    listActiveTeamMembers() {
      return teamMemberRepository.listActive().sort(compareTeamMembers);
    },
    createTeamMember(input) {
      return teamMemberRepository.create(input);
    },
    updateTeamMember(teamMemberId, input) {
      const existing = teamMemberRepository.getById(teamMemberId);
      if (!existing) {
        throw httpError(404, 'TEAM_MEMBER_NOT_FOUND', 'Employee team not found');
      }

      if (input.activeOnSchedule === false) {
        const assignedJobs = jobRepository.list().filter((job) => job.assigneeTeamMemberId === teamMemberId);
        if (assignedJobs.length > 0) {
          throw httpError(400, 'TEAM_MEMBER_HAS_ASSIGNED_JOBS', 'Cannot deactivate a team while jobs are still assigned');
        }
      }

      return teamMemberRepository.update(teamMemberId, (member) => {
        if ('displayName' in input) member.displayName = input.displayName;
        if ('initials' in input) member.initials = input.initials;
        if ('color' in input) member.color = input.color;
        if ('activeOnSchedule' in input) member.activeOnSchedule = input.activeOnSchedule !== false;
      });
    },
  };
}

function compareTeamMembers(left, right) {
  return String(left.displayName || '').localeCompare(String(right.displayName || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}
