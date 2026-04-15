export function buildSchedulerUrl({ view, date, filter = '', lanes = [], scale = '' }) {
  const params = new URLSearchParams({ view, date });
  if (filter) params.set('filter', filter);
  if (scale) params.set('scale', scale);
  for (const laneId of lanes || []) {
    if (laneId) params.append('lane', laneId);
  }
  return `/app/calendar_new?${params.toString()}`;
}

export function buildNewJobUrl({ customerId, pathname = '', search = '', date = '', start = '', end = '' }) {
  const params = new URLSearchParams();
  if (customerId) params.set('customerId', customerId);
  if (date) params.set('date', date);
  if (start) params.set('start', start);
  if (end) params.set('end', end);

  const schedulerQuery = getActiveSchedulerReturnTo(pathname, search) || getSchedulerContext(search);
  if (schedulerQuery) params.set('returnTo', schedulerQuery);

  const query = params.toString();
  return `/app/jobs/new${query ? `?${query}` : ''}`;
}

export function buildJobScheduleUrl(jobId, pathname = '', search = '', date = '') {
  const params = new URLSearchParams();
  if (date) params.set('date', date);

  const schedulerQuery = getActiveSchedulerReturnTo(pathname, search) || getSchedulerContext(search);
  if (schedulerQuery) params.set('returnTo', schedulerQuery);

  const query = params.toString();
  return `/app/jobs/${jobId}/schedule${query ? `?${query}` : ''}`;
}

export function buildDayUrl(day, filter = '', lanes = [], scale = '') {
  return buildSchedulerUrl({ view: 'day', date: day, filter, lanes, scale });
}

export function getSchedulerContext(search = '') {
  return new URLSearchParams(search).get('returnTo');
}

export function getActiveSchedulerReturnTo(pathname = '', search = '') {
  if (pathname === '/app/calendar_new') {
    const params = new URLSearchParams(search);
    return `/app/calendar_new?${params.toString()}`;
  }
  return getSchedulerContext(search);
}

export function buildCustomerUrl(customerId, pathname = '', search = '') {
  const schedulerQuery = getActiveSchedulerReturnTo(pathname, search);
  return `/app/customers/${customerId}${schedulerQuery ? `?returnTo=${encodeURIComponent(schedulerQuery)}` : ''}`;
}

export function buildJobUrl(jobId, pathname = '', search = '') {
  const schedulerQuery = getActiveSchedulerReturnTo(pathname, search);
  return `/app/jobs/${jobId}${schedulerQuery ? `?returnTo=${encodeURIComponent(schedulerQuery)}` : ''}`;
}
