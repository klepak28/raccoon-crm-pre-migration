import test from 'node:test';
import assert from 'node:assert/strict';
import {
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

test('buildDayUrl creates a focused day route', () => {
  assert.equal(
    buildDayUrl('2026-04-15', 'vip'),
    '/app/calendar_new?view=day&date=2026-04-15&filter=vip',
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

test('buildJobUrl carries scheduler return context into job detail links', () => {
  assert.equal(
    buildJobUrl('job_123', '/app/calendar_new', '?view=week&date=2026-04-13&filter=vip'),
    '/app/jobs/job_123?returnTo=%2Fapp%2Fcalendar_new%3Fview%3Dweek%26date%3D2026-04-13%26filter%3Dvip',
  );
});
