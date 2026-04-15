import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildJobScheduleUrl,
  buildNewJobUrl,
  buildCustomerUrl,
  buildDayUrl,
  buildJobUrl,
  buildSchedulerUrl,
  getActiveSchedulerReturnTo,
  getSchedulerContext,
} from '../../../src/ui/static/scheduler-links.js';

test('buildSchedulerUrl preserves view, date, and optional filter', () => {
  assert.equal(
    buildSchedulerUrl({ view: 'week', date: '2026-04-13', filter: 'north gate' }),
    '/app/calendar_new?view=week&date=2026-04-13&filter=north+gate',
  );
});

test('buildSchedulerUrl preserves repeated lane filters', () => {
  assert.equal(
    buildSchedulerUrl({ view: 'day', date: '2026-04-14', lanes: ['unassigned', 'tm_0001'] }),
    '/app/calendar_new?view=day&date=2026-04-14&lane=unassigned&lane=tm_0001',
  );
});

test('buildSchedulerUrl preserves day scale when provided', () => {
  assert.equal(
    buildSchedulerUrl({ view: 'day', date: '2026-04-14', scale: '10' }),
    '/app/calendar_new?view=day&date=2026-04-14&scale=10',
  );
});

test('buildDayUrl creates a focused day route', () => {
  assert.equal(
    buildDayUrl('2026-04-15', 'vip', ['tm_0001']),
    '/app/calendar_new?view=day&date=2026-04-15&filter=vip&lane=tm_0001',
  );
});

test('buildDayUrl carries scale for focused day route', () => {
  assert.equal(
    buildDayUrl('2026-04-15', 'vip', ['tm_0001'], '15'),
    '/app/calendar_new?view=day&date=2026-04-15&filter=vip&scale=15&lane=tm_0001',
  );
});

test('getSchedulerContext reads returnTo from search', () => {
  assert.equal(
    getSchedulerContext('?returnTo=%2Fapp%2Fcalendar_new%3Fview%3Dmonth%26date%3D2026-04-01'),
    '/app/calendar_new?view=month&date=2026-04-01',
  );
});

test('getActiveSchedulerReturnTo preserves scheduler context when already on scheduler', () => {
  assert.equal(
    getActiveSchedulerReturnTo('/app/calendar_new', '?view=week&date=2026-04-13&filter=vip'),
    '/app/calendar_new?view=week&date=2026-04-13&filter=vip',
  );
});

test('buildCustomerUrl carries scheduler return context into customer links', () => {
  assert.equal(
    buildCustomerUrl('cust_123', '/app/calendar_new', '?view=month&date=2026-04-13&filter=vip'),
    '/app/customers/cust_123?returnTo=%2Fapp%2Fcalendar_new%3Fview%3Dmonth%26date%3D2026-04-13%26filter%3Dvip',
  );
});

test('buildJobUrl carries scheduler return context into job detail links', () => {
  assert.equal(
    buildJobUrl('job_123', '/app/calendar_new', '?view=week&date=2026-04-13&filter=vip'),
    '/app/jobs/job_123?returnTo=%2Fapp%2Fcalendar_new%3Fview%3Dweek%26date%3D2026-04-13%26filter%3Dvip',
  );
});

test('buildNewJobUrl carries customer, date, and scheduler return context', () => {
  assert.equal(
    buildNewJobUrl({
      customerId: 'cust_123',
      pathname: '/app/calendar_new',
      search: '?view=day&date=2026-04-15&filter=vip',
      date: '2026-04-15',
      start: '2026-04-15T13:00',
      end: '2026-04-15T14:00',
    }),
    '/app/jobs/new?customerId=cust_123&date=2026-04-15&start=2026-04-15T13%3A00&end=2026-04-15T14%3A00&returnTo=%2Fapp%2Fcalendar_new%3Fview%3Dday%26date%3D2026-04-15%26filter%3Dvip',
  );
});

test('buildJobScheduleUrl carries scheduler return context into schedule route', () => {
  assert.equal(
    buildJobScheduleUrl('job_123', '/app/calendar_new', '?view=month&date=2026-04-01'),
    '/app/jobs/job_123/schedule?returnTo=%2Fapp%2Fcalendar_new%3Fview%3Dmonth%26date%3D2026-04-01',
  );
});
