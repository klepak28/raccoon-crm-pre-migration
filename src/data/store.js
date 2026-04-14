import { createIdGenerator } from '../lib/ids.js';

export function createStore() {
  const nextCustomerId = createIdGenerator('cust');
  const nextAddressId = createIdGenerator('addr');
  const nextPhoneId = createIdGenerator('phone');
  const nextEmailId = createIdGenerator('email');
  const nextJobId = createIdGenerator('job');
  const nextTeamMemberId = createIdGenerator('tm');

  return {
    customers: [],
    jobs: [],
    teamMembers: [],
    nextCustomerId,
    nextAddressId,
    nextPhoneId,
    nextEmailId,
    nextJobId,
    nextTeamMemberId,
  };
}
