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
        recurringSeriesId: input.recurringSeriesId || null,
        occurrenceIndex: input.occurrenceIndex ?? null,
        generatedFromRuleVersion: input.generatedFromRuleVersion || null,
        isExceptionInstance: false,
        deletedFromSeriesAt: null,
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
    list() {
      return clone(store.jobs.filter((job) => !job.deletedFromSeriesAt));
    },
    listByCustomerId(customerId) {
      return clone(store.jobs.filter((job) => job.customerId === customerId && !job.deletedFromSeriesAt));
    },
    listScheduled() {
      return clone(store.jobs.filter((job) => job.scheduleState === 'scheduled' && !job.deletedFromSeriesAt));
    },
    listBySeriesId(seriesId) {
      return clone(
        store.jobs
          .filter((job) => job.recurringSeriesId === seriesId && !job.deletedFromSeriesAt)
          .sort((a, b) => (a.occurrenceIndex ?? 0) - (b.occurrenceIndex ?? 0)),
      );
    },
    listBySeriesIdIncludingDeleted(seriesId) {
      return clone(
        store.jobs
          .filter((job) => job.recurringSeriesId === seriesId)
          .sort((a, b) => (a.occurrenceIndex ?? 0) - (b.occurrenceIndex ?? 0)),
      );
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
