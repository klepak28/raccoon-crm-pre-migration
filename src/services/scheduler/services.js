import { httpError } from '../../lib/http.js';
import { compareDateTimes, intersectsDay, isIsoDate } from '../../lib/time.js';

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
        const customer = customerRepository.getById(job.customerId);
        const address = customer?.addresses.find((item) => item.id === job.customerAddressId) || null;
        lane.jobs.push({
          id: job.id,
          jobNumber: job.jobNumber,
          titleOrServiceSummary: job.titleOrServiceSummary,
          scheduledStartAt: job.scheduledStartAt,
          scheduledEndAt: job.scheduledEndAt,
          customer: customer ? { id: customer.id, displayName: customer.displayName } : null,
          address,
          assigneeTeamMemberId: job.assigneeTeamMemberId,
        });
      }

      return { date, lanes };
    },
  };
}
