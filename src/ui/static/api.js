export async function getJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Request failed');
  }
  return payload;
}

export async function sendJson(url, payload, method = 'POST') {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || 'Request failed');
  }
  return result;
}

export const api = {
  listTeamMembers: async () => (await getJson('/api/team-members')).items,
  createTeamMember: async (payload) => (await sendJson('/api/team-members', payload)).item,
  updateTeamMember: async (teamMemberId, payload) => (await sendJson(`/api/team-members/${teamMemberId}`, payload, 'PATCH')).item,
  listCustomers: async () => (await getJson('/api/customers')).items,
  listJobs: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.scheduleState) params.set('scheduleState', filters.scheduleState);
    if (filters.customerId) params.set('customerId', filters.customerId);
    const query = params.toString();
    return (await getJson(`/api/jobs${query ? `?${query}` : ''}`)).items;
  },
  getCustomer: async (customerId) => (await getJson(`/api/customers/${customerId}`)).item,
  createCustomer: async (payload) => (await sendJson('/api/customers', payload)).item,
  updateCustomer: async (customerId, payload) => (await sendJson(`/api/customers/${customerId}`, payload, 'PATCH')).item,
  createJob: async (customerId, payload) => (await sendJson(`/api/customers/${customerId}/jobs`, payload)).item,
  getJob: async (jobId) => (await getJson(`/api/jobs/${jobId}`)).item,
  updateJob: async (jobId, payload) => (await sendJson(`/api/jobs/${jobId}`, payload, 'PATCH')).item,
  scheduleJob: async (jobId, payload) => (await sendJson(`/api/jobs/${jobId}/schedule`, payload)).item,
  unscheduleJob: async (jobId) => (await sendJson(`/api/jobs/${jobId}/unschedule`, {})).item,
  assignJob: async (jobId, teamMemberId) => (await sendJson(`/api/jobs/${jobId}/assign`, { teamMemberId })).item,
  unassignJob: async (jobId) => (await sendJson(`/api/jobs/${jobId}/unassign`, {})).item,
  getDaySchedule: async (date) => (await getJson(`/api/schedule/day?date=${encodeURIComponent(date)}`)).item,
  getScheduleRange: async (startDate, endDate) => (
    await getJson(`/api/schedule/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`)
  ).item,
  // Recurring jobs
  createRecurringJob: async (payload) => (await sendJson('/api/recurring-jobs', payload)).item,
  enableRecurrence: async (jobId, recurrenceRule) => (await sendJson(`/api/jobs/${jobId}/recurrence`, recurrenceRule)).item,
  getSeriesDetail: async (seriesId) => (await getJson(`/api/recurring-series/${seriesId}`)).item,
  getSeriesForJob: async (jobId) => (await getJson(`/api/jobs/${jobId}/series`)).item,
  editOccurrence: async (jobId, scope, changes, recurrenceRule) => (
    await sendJson(`/api/jobs/${jobId}/occurrence-edit`, { scope, changes, recurrenceRule })
  ).item,
  deleteOccurrence: async (jobId, scope) => (
    await sendJson(`/api/jobs/${jobId}/occurrence-delete`, { scope })
  ).item,
};
