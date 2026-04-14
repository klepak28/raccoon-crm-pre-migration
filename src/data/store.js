import { createIdGenerator } from '../lib/ids.js';

export function createStore() {
  const nextCustomerId = createIdGenerator('cust');
  const nextAddressId = createIdGenerator('addr');
  const nextPhoneId = createIdGenerator('phone');
  const nextEmailId = createIdGenerator('email');
  const nextJobId = createIdGenerator('job');
  const nextTeamMemberId = createIdGenerator('tm');
  const nextRecurringSeriesId = createIdGenerator('rseries');

  return {
    customers: [],
    jobs: [],
    teamMembers: [],
    recurringSeries: [],
    nextCustomerId,
    nextAddressId,
    nextPhoneId,
    nextEmailId,
    nextJobId,
    nextTeamMemberId,
    nextRecurringSeriesId,
  };
}
