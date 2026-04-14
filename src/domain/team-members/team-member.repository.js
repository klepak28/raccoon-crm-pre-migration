export function createTeamMemberRepository(store) {
  return {
    list() {
      return clone(store.teamMembers);
    },
    listActive() {
      return clone(store.teamMembers.filter((member) => member.activeOnSchedule));
    },
    getById(teamMemberId) {
      const member = store.teamMembers.find((item) => item.id === teamMemberId);
      return member ? clone(member) : null;
    },
    create(input) {
      const timestamp = new Date().toISOString();
      const member = {
        id: store.nextTeamMemberId(),
        displayName: input.displayName,
        initials: input.initials,
        color: input.color,
        activeOnSchedule: input.activeOnSchedule !== false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      store.teamMembers.push(member);
      return clone(member);
    },
    update(teamMemberId, mutate) {
      const member = store.teamMembers.find((item) => item.id === teamMemberId);
      if (!member) return null;
      mutate(member);
      member.updatedAt = new Date().toISOString();
      return clone(member);
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
