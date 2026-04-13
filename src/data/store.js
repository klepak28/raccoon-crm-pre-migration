import { createIdGenerator } from '../lib/ids.js';

export function createStore() {
  const nextCustomerId = createIdGenerator('cust');
  const nextAddressId = createIdGenerator('addr');
  const nextPhoneId = createIdGenerator('phone');
  const nextEmailId = createIdGenerator('email');
  const nextJobId = createIdGenerator('job');

  return {
    customers: [],
    jobs: [],
    teamMembers: [
      {
        id: 'tm_0001',
        displayName: 'Team 1',
        initials: 'T1',
        activeOnSchedule: true,
      },
      {
        id: 'tm_0002',
        displayName: 'Team 2',
        initials: 'T2',
        activeOnSchedule: true,
      },
      {
        id: 'tm_0003',
        displayName: 'Artur Pirogov',
        initials: 'AP',
        activeOnSchedule: true,
      },
      {
        id: 'tm_0004',
        displayName: 'Inactive Tech',
        initials: 'IT',
        activeOnSchedule: false,
      },
    ],
    nextCustomerId,
    nextAddressId,
    nextPhoneId,
    nextEmailId,
    nextJobId,
  };
}
