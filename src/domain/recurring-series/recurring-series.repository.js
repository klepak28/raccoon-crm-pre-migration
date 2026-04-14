function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createRecurringSeriesRepository(store) {
  return {
    create(input) {
      const timestamp = new Date().toISOString();
      const series = {
        id: store.nextRecurringSeriesId(),
        sourceJobId: input.sourceJobId,
        recurrenceEnabled: true,
        recurrenceFrequency: input.recurrenceFrequency,
        recurrenceInterval: input.recurrenceInterval,
        recurrenceDayOfWeek: input.recurrenceDayOfWeek || [],
        recurrenceDayOfMonth: input.recurrenceDayOfMonth || null,
        recurrenceOrdinal: input.recurrenceOrdinal || null,
        recurrenceMonthOfYear: input.recurrenceMonthOfYear || null,
        recurrenceEndMode: input.recurrenceEndMode,
        recurrenceOccurrenceCount: input.recurrenceOccurrenceCount || null,
        recurrenceEndDate: input.recurrenceEndDate || null,
        recurrenceRuleVersion: 1,
        materializationHorizonUntil: null,
        lastExtendedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      store.recurringSeries.push(series);
      return clone(series);
    },
    getById(seriesId) {
      const series = store.recurringSeries.find((item) => item.id === seriesId);
      return series ? clone(series) : null;
    },
    list() {
      return clone(store.recurringSeries);
    },
    update(seriesId, mutate) {
      const series = store.recurringSeries.find((item) => item.id === seriesId);
      if (!series) return null;
      mutate(series);
      series.updatedAt = new Date().toISOString();
      return clone(series);
    },
  };
}
