import { httpError } from '../../lib/http.js';
import { compareDateTimes, intersectsDateRange, intersectsDay, isIsoDate } from '../../lib/time.js';

export function createSchedulerServices({ jobRepository, customerRepository, teamMemberRepository }) {
  return {
    getDaySchedule(date) {
      if (!isIsoDate(date)) {
        throw httpError(400, 'INVALID_DATE', 'Day schedule requires date=YYYY-MM-DD');
      }

      const scheduledJobs = jobRepository
        .listScheduled()
        .filter((job) => intersectsDay(job.scheduledStartAt, job.scheduledEndAt, date))
        .sort((left, right) => compareDateTimes(left.scheduledStartAt, right.scheduledStartAt));

      const activeTeamMembers = teamMemberRepository
        .listActive()
        .sort((left, right) => left.displayName.localeCompare(right.displayName));

      const lanes = [
        { id: 'unassigned', label: 'Unassigned', pseudo: true, jobs: [] },
        ...activeTeamMembers.map((member) => ({
          id: member.id,
          label: member.displayName,
          initials: member.initials,
          pseudo: false,
          jobs: [],
        })),
      ];

      for (const job of scheduledJobs) {
        const laneId = job.assigneeTeamMemberId || 'unassigned';
        const lane = lanes.find((item) => item.id === laneId);
        lane.jobs.push(toScheduleJob(job, customerRepository, teamMemberRepository));
      }

      return { date, lanes };
    },
    getScheduleRange(startDate, endDate) {
      if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
        throw httpError(400, 'INVALID_DATE_RANGE', 'Schedule range requires startDate and endDate in YYYY-MM-DD format');
      }
      if (new Date(`${endDate}T00:00:00`).getTime() < new Date(`${startDate}T00:00:00`).getTime()) {
        throw httpError(400, 'INVALID_DATE_RANGE', 'endDate must be on or after startDate');
      }

      const jobs = jobRepository
        .listScheduled()
        .filter((job) => intersectsDateRange(job.scheduledStartAt, job.scheduledEndAt, startDate, endDate))
        .sort((left, right) => compareDateTimes(left.scheduledStartAt, right.scheduledStartAt))
        .map((job) => toScheduleJob(job, customerRepository, teamMemberRepository));

      const lanes = [
        { id: 'unassigned', label: 'Unassigned', pseudo: true },
        ...teamMemberRepository
          .listActive()
          .sort((left, right) => left.displayName.localeCompare(right.displayName))
          .map((member) => ({
            id: member.id,
            label: member.displayName,
            initials: member.initials,
            pseudo: false,
          })),
      ];

      return { startDate, endDate, lanes, jobs };
    },
  };
}

function toScheduleJob(job, customerRepository, teamMemberRepository) {
  const customer = customerRepository.getById(job.customerId);
  const address = customer?.addresses.find((item) => item.id === job.customerAddressId) || null;
  const assignee = job.assigneeTeamMemberId ? teamMemberRepository.getById(job.assigneeTeamMemberId) : null;
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    titleOrServiceSummary: job.titleOrServiceSummary,
    scheduledStartAt: job.scheduledStartAt,
    scheduledEndAt: job.scheduledEndAt,
    customer: customer ? { id: customer.id, displayName: customer.displayName } : null,
    address,
    assigneeTeamMemberId: job.assigneeTeamMemberId,
    assignee,
    assignmentLabel: assignee?.displayName || 'Unassigned',
  };
}
