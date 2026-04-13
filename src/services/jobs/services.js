import { httpError } from '../../lib/http.js';

export function createJobServices({ customerRepository, jobRepository, teamMemberRepository }) {
  return {
    createOneTimeJob(customerId, input) {
      const customer = customerRepository.getById(customerId);
      if (!customer) {
        throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      const address = customer.addresses.find((item) => item.id === input.customerAddressId);
      if (!address) {
        throw httpError(400, 'ADDRESS_NOT_OWNED_BY_CUSTOMER', 'Job address must belong to the selected customer');
      }
      return jobRepository.create({ ...input, customerId });
    },
    getJobDetail(jobId) {
      const job = jobRepository.getById(jobId);
      if (!job) {
        throw httpError(404, 'JOB_NOT_FOUND', 'Job not found');
      }
      const customer = customerRepository.getById(job.customerId);
      const address = customer?.addresses.find((item) => item.id === job.customerAddressId) || null;
      const assignee = job.assigneeTeamMemberId ? teamMemberRepository.getById(job.assigneeTeamMemberId) : null;
      return {
        ...job,
        assignmentState: job.assigneeTeamMemberId ? 'assigned' : 'unassigned',
        customer: customer ? {
          id: customer.id,
          displayName: customer.displayName,
          doNotService: customer.doNotService,
          phones: customer.phones,
        } : null,
        address,
        assignee,
      };
    },
    updateJobBasic(jobId, input) {
      const existing = jobRepository.getById(jobId);
      if (!existing) {
        throw httpError(404, 'JOB_NOT_FOUND', 'Job not found');
      }
      const customer = customerRepository.getById(existing.customerId);
      if (!customer.addresses.some((item) => item.id === input.customerAddressId)) {
        throw httpError(400, 'ADDRESS_NOT_OWNED_BY_CUSTOMER', 'Job address must belong to the selected customer');
      }
      return jobRepository.update(jobId, (job) => {
        job.titleOrServiceSummary = input.titleOrServiceSummary;
        job.customerAddressId = input.customerAddressId;
        job.leadSource = input.leadSource;
        job.privateNotes = input.privateNotes;
        job.tags = input.tags;
      });
    },
    scheduleJob(jobId, input) {
      const existing = jobRepository.getById(jobId);
      if (!existing) {
        throw httpError(404, 'JOB_NOT_FOUND', 'Job not found');
      }
      const customer = customerRepository.getById(existing.customerId);
      if (customer.doNotService) {
        throw httpError(400, 'DO_NOT_SERVICE_BLOCK', 'Jobs for do-not-service customers cannot be scheduled in V1');
      }
      return jobRepository.update(jobId, (job) => {
        job.scheduleState = 'scheduled';
        job.scheduledStartAt = input.scheduledStartAt;
        job.scheduledEndAt = input.scheduledEndAt;
      });
    },
    unscheduleJob(jobId) {
      const existing = jobRepository.getById(jobId);
      if (!existing) {
        throw httpError(404, 'JOB_NOT_FOUND', 'Job not found');
      }
      return jobRepository.update(jobId, (job) => {
        job.scheduleState = 'unscheduled';
        job.scheduledStartAt = null;
        job.scheduledEndAt = null;
      });
    },
    assignJob(jobId, teamMemberId) {
      const existing = jobRepository.getById(jobId);
      if (!existing) {
        throw httpError(404, 'JOB_NOT_FOUND', 'Job not found');
      }
      const teamMember = teamMemberRepository.getById(teamMemberId);
      if (!teamMember || !teamMember.activeOnSchedule) {
        throw httpError(400, 'INVALID_ASSIGNEE', 'Assignee must be an active assignable team member');
      }
      return jobRepository.update(jobId, (job) => {
        job.assigneeTeamMemberId = teamMemberId;
      });
    },
    unassignJob(jobId) {
      const existing = jobRepository.getById(jobId);
      if (!existing) {
        throw httpError(404, 'JOB_NOT_FOUND', 'Job not found');
      }
      return jobRepository.update(jobId, (job) => {
        job.assigneeTeamMemberId = null;
      });
    },
  };
}
