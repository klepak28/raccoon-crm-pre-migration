export function buildSchedulerUrl({ view, date, filter = '' }) {
  const params = new URLSearchParams({ view, date });
  if (filter) params.set('filter', filter);
  return `/app/calendar_new?${params.toString()}`;
}

export function buildDayUrl(day, filter = '') {
  return buildSchedulerUrl({ view: 'day', date: day, filter });
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
