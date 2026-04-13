export function createTeamMemberRepository(store) {
  return {
    listActive() {
      return store.teamMembers.filter((member) => member.activeOnSchedule);
    },
    getById(teamMemberId) {
      return store.teamMembers.find((member) => member.id === teamMemberId) || null;
    },
  };
}
