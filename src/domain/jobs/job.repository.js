function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createJobRepository(store) {
  return {
    create(input) {
      const timestamp = new Date().toISOString();
      const job = {
        id: store.nextJobId(),
        jobNumber: `J-${String(store.jobs.length + 1).padStart(4, '0')}`,
        customerId: input.customerId,
        customerAddressId: input.customerAddressId,
        titleOrServiceSummary: input.titleOrServiceSummary,
        leadSource: input.leadSource,
        privateNotes: input.privateNotes,
        tags: input.tags,
        scheduleState: 'unscheduled',
        scheduledStartAt: null,
        scheduledEndAt: null,
        assigneeTeamMemberId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      store.jobs.push(job);
      return clone(job);
    },
    getById(jobId) {
      const job = store.jobs.find((item) => item.id === jobId);
      return job ? clone(job) : null;
    },
    listByCustomerId(customerId) {
      return clone(store.jobs.filter((job) => job.customerId === customerId));
    },
    listScheduled() {
      return clone(store.jobs.filter((job) => job.scheduleState === 'scheduled'));
    },
    update(jobId, mutate) {
      const job = store.jobs.find((item) => item.id === jobId);
      if (!job) return null;
      mutate(job);
      job.updatedAt = new Date().toISOString();
      return clone(job);
    },
  };
}
