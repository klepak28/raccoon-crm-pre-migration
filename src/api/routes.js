import { readJsonBody, sendJson, sendHtml, matchRoute } from '../lib/http.js';
import { validateCustomerInput } from '../validation/customers/customer-input.validator.js';
import { validateAssignJobInput } from '../validation/jobs/assign-job.validator.js';
import { validateJobInput } from '../validation/jobs/job-input.validator.js';
import { validateJobListFilters } from '../validation/jobs/job-list-filters.validator.js';
import { validateScheduleJobInput } from '../validation/jobs/schedule-job.validator.js';
import { validateTeamMemberInput } from '../validation/team-members/team-member-input.validator.js';
import { assertNoMultiAssigneeFields, assertNoUnsupportedV1Fields } from '../lib/validation.js';
import {
  validateRecurrenceInput,
  validateRecurringJobInput,
  validateOccurrenceEditInput,
  validateEditScope,
  validateDeleteScope,
} from '../validation/recurring-jobs/recurring-job-input.validator.js';

function renderAppShell(title) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/static/app.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/static/app.js"></script>
  </body>
</html>`;
}

export async function handleRoute({ req, res, url, context }) {
  const { services } = context;

  if (req.method === 'GET' && url.pathname === '/') {
    sendHtml(res, 200, renderAppShell('CRM V1'));
    return true;
  }

  if (req.method === 'GET' && (
    url.pathname === '/app/customers/list' ||
    url.pathname === '/app/calendar_new' ||
    url.pathname === '/app/settings' ||
    url.pathname === '/app/jobs/new' ||
    url.pathname === '/app/recurring_jobs/new' ||
    matchRoute(req.method, url.pathname, '/app/jobs/:jobId') ||
    matchRoute(req.method, url.pathname, '/app/jobs/:jobId/schedule') ||
    matchRoute(req.method, url.pathname, '/app/customers/:customerId')
  )) {
    sendHtml(res, 200, renderAppShell('CRM V1'));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/team-members') {
    sendJson(res, 200, { items: services.teamMembers.listTeamMembers() });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/team-members') {
    const body = await readJsonBody(req);
    const input = validateTeamMemberInput(body);
    sendJson(res, 201, { item: services.teamMembers.createTeamMember(input) });
    return true;
  }

  const teamMemberParams = matchRoute(req.method, url.pathname, '/api/team-members/:teamMemberId');
  if (teamMemberParams && req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const input = validateTeamMemberInput(body, { partial: true });
    sendJson(res, 200, { item: services.teamMembers.updateTeamMember(teamMemberParams.teamMemberId, input) });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/customers') {
    sendJson(res, 200, { items: services.customers.listCustomers() });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/customers') {
    const body = await readJsonBody(req);
    const input = validateCustomerInput(body);
    const customer = services.customers.createCustomer(input);
    sendJson(res, 201, { item: customer });
    return true;
  }

  const customerParams = matchRoute(req.method, url.pathname, '/api/customers/:customerId');
  if (customerParams && req.method === 'GET') {
    sendJson(res, 200, { item: services.customers.getCustomerDetail(customerParams.customerId) });
    return true;
  }

  if (customerParams && req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const input = validateCustomerInput(body, { partial: true });
    sendJson(res, 200, { item: services.customers.updateCustomerBasic(customerParams.customerId, input) });
    return true;
  }

  const customerJobsGetParams = matchRoute(req.method, url.pathname, '/api/customers/:customerId/jobs');
  if (customerJobsGetParams && req.method === 'GET') {
    const detail = services.customers.getCustomerDetail(customerJobsGetParams.customerId);
    sendJson(res, 200, { items: detail.jobs });
    return true;
  }

  const customerJobsPostParams = matchRoute(req.method, url.pathname, '/api/customers/:customerId/jobs');
  if (customerJobsPostParams && req.method === 'POST') {
    const body = await readJsonBody(req);
    const input = validateJobInput(body);
    const job = services.jobs.createOneTimeJob(customerJobsPostParams.customerId, input);
    sendJson(res, 201, { item: job });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/jobs') {
    const filters = validateJobListFilters(url.searchParams);
    sendJson(res, 200, {
      items: services.jobs.listJobs(filters),
    });
    return true;
  }

  const jobParams = matchRoute(req.method, url.pathname, '/api/jobs/:jobId');
  if (jobParams && req.method === 'GET') {
    sendJson(res, 200, { item: services.jobs.getJobDetail(jobParams.jobId) });
    return true;
  }

  if (jobParams && req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const input = validateJobInput(body);
    sendJson(res, 200, { item: services.jobs.updateJobBasic(jobParams.jobId, input) });
    return true;
  }

  const scheduleParams = matchRoute(req.method, url.pathname, '/api/jobs/:jobId/schedule');
  if (scheduleParams && req.method === 'POST') {
    const body = await readJsonBody(req);
    const input = validateScheduleJobInput(body);
    sendJson(res, 200, { item: services.jobs.scheduleJob(scheduleParams.jobId, input) });
    return true;
  }

  const unscheduleParams = matchRoute(req.method, url.pathname, '/api/jobs/:jobId/unschedule');
  if (unscheduleParams && req.method === 'POST') {
    const body = await readJsonBody(req);
    assertNoUnsupportedV1Fields(body);
    assertNoMultiAssigneeFields(body);
    sendJson(res, 200, { item: services.jobs.unscheduleJob(unscheduleParams.jobId) });
    return true;
  }

  const assignParams = matchRoute(req.method, url.pathname, '/api/jobs/:jobId/assign');
  if (assignParams && req.method === 'POST') {
    const body = await readJsonBody(req);
    const input = validateAssignJobInput(body);
    sendJson(res, 200, { item: services.jobs.assignJob(assignParams.jobId, input.teamMemberId) });
    return true;
  }

  const unassignParams = matchRoute(req.method, url.pathname, '/api/jobs/:jobId/unassign');
  if (unassignParams && req.method === 'POST') {
    const body = await readJsonBody(req);
    assertNoUnsupportedV1Fields(body);
    assertNoMultiAssigneeFields(body);
    sendJson(res, 200, { item: services.jobs.unassignJob(unassignParams.jobId) });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/schedule/day') {
    sendJson(res, 200, { item: services.scheduler.getDaySchedule(url.searchParams.get('date')) });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/schedule/range') {
    sendJson(res, 200, {
      item: services.scheduler.getScheduleRange(
        url.searchParams.get('startDate'),
        url.searchParams.get('endDate'),
      ),
    });
    return true;
  }

  // ── Recurring Jobs API ──

  // POST /api/recurring-jobs — create from scratch (dedicated flow)
  if (req.method === 'POST' && url.pathname === '/api/recurring-jobs') {
    const body = await readJsonBody(req);
    const jobInput = validateRecurringJobInput(body.job || body);
    const scheduleInput = validateScheduleJobInput(body.schedule || body);
    const recurrenceInput = validateRecurrenceInput(body.recurrence || body);
    const customerId = body.customerId;
    if (!customerId) {
      sendJson(res, 400, { error: { code: 'CUSTOMER_ID_REQUIRED', message: 'customerId is required' } });
      return true;
    }
    const result = services.recurringJobs.createRecurringJobFromScratch(
      customerId, jobInput, scheduleInput, recurrenceInput,
    );
    sendJson(res, 201, { item: result });
    return true;
  }

  // POST /api/jobs/:jobId/recurrence — enable recurrence on existing job
  const recurrenceParams = matchRoute(req.method, url.pathname, '/api/jobs/:jobId/recurrence');
  if (recurrenceParams && req.method === 'POST') {
    const body = await readJsonBody(req);
    const recurrenceInput = validateRecurrenceInput(body);
    const result = services.recurringJobs.createRecurringSeries(recurrenceParams.jobId, recurrenceInput);
    sendJson(res, 201, { item: result });
    return true;
  }

  // GET /api/recurring-series/:seriesId — series detail with occurrences
  const seriesDetailParams = matchRoute(req.method, url.pathname, '/api/recurring-series/:seriesId');
  if (seriesDetailParams && req.method === 'GET') {
    sendJson(res, 200, { item: services.recurringJobs.getSeriesDetail(seriesDetailParams.seriesId) });
    return true;
  }

  // GET /api/jobs/:jobId/series — get series info for a job
  const jobSeriesParams = matchRoute(req.method, url.pathname, '/api/jobs/:jobId/series');
  if (jobSeriesParams && req.method === 'GET') {
    const series = services.recurringJobs.getSeriesForJob(jobSeriesParams.jobId);
    sendJson(res, 200, { item: series });
    return true;
  }

  // POST /api/jobs/:jobId/occurrence-edit — edit occurrence with scope
  const occEditParams = matchRoute(req.method, url.pathname, '/api/jobs/:jobId/occurrence-edit');
  if (occEditParams && req.method === 'POST') {
    const body = await readJsonBody(req);
    const scope = validateEditScope(body);
    const changes = validateOccurrenceEditInput(body.changes || {});
    const newRecurrenceRule = body.recurrenceRule
      ? validateRecurrenceInput(body.recurrenceRule)
      : null;

    if (scope === 'this') {
      if (newRecurrenceRule) {
        sendJson(res, 400, {
          error: {
            code: 'RECURRENCE_SCOPE_REQUIRES_FUTURE',
            message: 'Changing the recurrence rule requires "this_and_future" scope',
          },
        });
        return true;
      }
      const result = services.recurringJobs.editSingleOccurrence(occEditParams.jobId, changes);
      sendJson(res, 200, { item: result });
    } else {
      const result = services.recurringJobs.editThisAndFutureOccurrences(
        occEditParams.jobId, changes, newRecurrenceRule,
      );
      sendJson(res, 200, { item: result });
    }
    return true;
  }

  // POST /api/jobs/:jobId/occurrence-delete — delete occurrence with scope
  const occDeleteParams = matchRoute(req.method, url.pathname, '/api/jobs/:jobId/occurrence-delete');
  if (occDeleteParams && req.method === 'POST') {
    const body = await readJsonBody(req);
    const scope = validateDeleteScope(body);

    if (scope === 'this') {
      const result = services.recurringJobs.deleteThisOccurrence(occDeleteParams.jobId);
      sendJson(res, 200, { item: result });
    } else {
      const result = services.recurringJobs.deleteThisAndFutureOccurrences(occDeleteParams.jobId);
      sendJson(res, 200, { item: result });
    }
    return true;
  }

  return false;
}
