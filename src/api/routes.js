import { readJsonBody, sendJson, sendHtml, matchRoute } from '../lib/http.js';
import { validateCustomerInput } from '../validation/customers/customer-input.validator.js';
import { validateAssignJobInput } from '../validation/jobs/assign-job.validator.js';
import { validateJobInput } from '../validation/jobs/job-input.validator.js';
import { validateScheduleJobInput } from '../validation/jobs/schedule-job.validator.js';
import { assertNoUnsupportedV1Fields } from '../lib/validation.js';

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

  if (req.method === 'GET' && (url.pathname === '/app/customers/list' || url.pathname === '/app/calendar_new' || matchRoute(req.method, url.pathname, '/app/jobs/:jobId'))) {
    sendHtml(res, 200, renderAppShell('CRM V1'));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/team-members') {
    sendJson(res, 200, { items: services.teamMembers.listActiveTeamMembers() });
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
    sendJson(res, 200, { item: services.jobs.unassignJob(unassignParams.jobId) });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/schedule/day') {
    sendJson(res, 200, { item: services.scheduler.getDaySchedule(url.searchParams.get('date')) });
    return true;
  }

  return false;
}
