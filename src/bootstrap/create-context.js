import { createCustomerRepository } from '../domain/customers/customer.repository.js';
import { createJobRepository } from '../domain/jobs/job.repository.js';
import { createTeamMemberRepository } from '../domain/team-members/team-member.repository.js';
import { createStore } from '../data/store.js';
import { createCustomerServices } from '../services/customers/services.js';
import { createJobServices } from '../services/jobs/services.js';
import { createSchedulerServices } from '../services/scheduler/services.js';
import { createTeamMemberServices } from '../services/team-members/services.js';

export function createContext() {
  const store = createStore();
  const customerRepository = createCustomerRepository(store);
  const jobRepository = createJobRepository(store);
  const teamMemberRepository = createTeamMemberRepository(store);

  return {
    repositories: {
      customerRepository,
      jobRepository,
      teamMemberRepository,
    },
    services: {
      customers: createCustomerServices({ customerRepository, jobRepository, teamMemberRepository }),
      jobs: createJobServices({ customerRepository, jobRepository, teamMemberRepository }),
      scheduler: createSchedulerServices({ jobRepository, customerRepository, teamMemberRepository }),
      teamMembers: createTeamMemberServices({ teamMemberRepository, jobRepository }),
    },
  };
}
