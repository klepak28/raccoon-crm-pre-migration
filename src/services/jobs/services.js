import { httpError } from '../../lib/http.js';
import { intersectsDateRange } from '../../lib/time.js';
import { compareJobsForOperations } from '../../domain/jobs/job-ordering.js';

export function createJobServices({ customerRepository, jobRepository, teamMemberRepository }) {
  return {
    listJobs(filters = {}) {
      const {
        scheduleState = null,
        assignmentState = null,
        customerId = null,
        startDate = null,
        endDate = null,
      } = filters;

      return jobRepository
        .list()
        .filter((job) => (scheduleState ? job.scheduleState === scheduleState : true))
        .filter((job) => {
          if (!assignmentState) return true;
          return assignmentState === 'assigned'
            ? Boolean(job.assigneeTeamMemberId)
            : !job.assigneeTeamMemberId;
        })
        .filter((job) => (customerId ? job.customerId === customerId : true))
        .filter((job) => {
          if (!startDate || !endDate) return true;
          if (job.scheduleState !== 'scheduled') return false;
          return intersectsDateRange(job.scheduledStartAt, job.scheduledEndAt, startDate, endDate);
        })
        .sort(compareJobsForOperations)
        .map((job) => toJobSummary(job, customerRepository, teamMemberRepository));
    },
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
          tags: customer.tags,
          primaryPhone: customer.phones[0]?.value || null,
          primaryEmail: customer.emails[0]?.value || null,
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

function toJobSummary(job, customerRepository, teamMemberRepository) {
  const customer = customerRepository.getById(job.customerId);
  const address = customer?.addresses.find((item) => item.id === job.customerAddressId) || null;
  const assignee = job.assigneeTeamMemberId ? teamMemberRepository.getById(job.assigneeTeamMemberId) : null;

  return {
    id: job.id,
    jobNumber: job.jobNumber,
    customerId: job.customerId,
    customerAddressId: job.customerAddressId,
    titleOrServiceSummary: job.titleOrServiceSummary,
    leadSource: job.leadSource,
    privateNotes: job.privateNotes,
    tags: job.tags,
    scheduleState: job.scheduleState,
    scheduledStartAt: job.scheduledStartAt,
    scheduledEndAt: job.scheduledEndAt,
    assigneeTeamMemberId: job.assigneeTeamMemberId,
    assignmentState: job.assigneeTeamMemberId ? 'assigned' : 'unassigned',
    assignee,
    customer: customer ? {
      id: customer.id,
      displayName: customer.displayName,
      doNotService: customer.doNotService,
      tags: customer.tags,
      primaryPhone: customer.phones[0]?.value || null,
      primaryEmail: customer.emails[0]?.value || null,
    } : null,
    address,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
