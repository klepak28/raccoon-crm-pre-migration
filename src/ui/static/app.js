import { api } from './api.js';
import {
  addDays,
  formatDateRange,
  formatDayKey,
  formatTime,
  localToday,
  listDays,
  monthGridEnd,
  monthGridStart,
  jobDayKeys,
  parseDayKey,
  shortDayLabel,
  startOfMonth,
  startOfWeek,
  stepAnchorDay,
  toDateTimeLocal,
  toIso,
  viewRange,
  weekdayLabel,
  formatRangeLabel,
} from './date-utils.js';
import { badge, chips, consumeFlash, emptyState, escapeHtml, formatAddress, setFlash, statusMessage } from './ui.js';

const app = document.getElementById('app');
const state = {
  teamMembers: [],
  flash: consumeFlash(),
};

boot().catch(renderFatal);

async function boot() {
  state.teamMembers = await api.listTeamMembers();
  await renderRoute();
}

async function renderRoute() {
  const pathname = location.pathname;
  if (pathname === '/' || pathname === '/app/customers/list') {
    await renderCustomersListPage();
    return;
  }

  const customerMatch = pathname.match(/^\/app\/customers\/([^/]+)$/);
  if (customerMatch) {
    await renderCustomerDetailPage(customerMatch[1]);
    return;
  }

  const jobMatch = pathname.match(/^\/app\/jobs\/([^/]+)$/);
  if (jobMatch) {
    await renderJobDetailPage(jobMatch[1]);
    return;
  }

  if (pathname === '/app/calendar_new') {
    await renderSchedulerPage();
    return;
  }

  renderShell({
    title: 'Not found',
    nav: 'customers',
    content: `<section class="surface-card">${emptyState('Page not found', 'This V1 route does not exist.')}</section>`,
  });
}

function renderShell({ title, subtitle = '', nav = 'customers', breadcrumbs = [], actions = '', content = '' }) {
  const flashHtml = state.flash ? statusMessage(state.flash.message, state.flash.tone) : '';
  state.flash = null;

  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div>
          <div class="brand-kicker">CRM Prototype</div>
          <div class="brand-title">V1 Operations</div>
          <p class="brand-copy">Customers, one-time jobs, and a real scheduler for the current build slice.</p>
        </div>
        <nav class="nav-stack">
          <a class="nav-link ${nav === 'customers' ? 'active' : ''}" href="/app/customers/list">Customers</a>
          <a class="nav-link ${nav === 'scheduler' ? 'active' : ''}" href="/app/calendar_new">Scheduler</a>
        </nav>
        <div class="sidebar-note">Unsupported in V1: recurrence, invoicing, billing, and bulk actions.</div>
      </aside>
      <main class="main-column">
        <header class="page-frame top-frame">
          <div class="page-frame-main">
            <div class="breadcrumbs">${breadcrumbs.length ? breadcrumbs.join('<span> / </span>') : ''}</div>
            <h1>${escapeHtml(title)}</h1>
            ${subtitle ? `<p class="page-subtitle">${escapeHtml(subtitle)}</p>` : ''}
          </div>
          ${actions ? `<div class="page-actions">${actions}</div>` : ''}
        </header>
        ${flashHtml}
        <div id="page-content">${content}</div>
        <div id="modal-root"></div>
      </main>
    </div>
  `;
}

async function renderCustomersListPage() {
  renderShell({
    title: 'Customers',
    subtitle: 'Find customers quickly, open full records, and create one-time jobs from customer context.',
    nav: 'customers',
    actions: `
      <button class="button button-primary" id="open-create-customer">Add customer</button>
    `,
    content: `
      <section class="surface-card stack-gap-lg">
        <div class="toolbar toolbar-between">
          <div>
            <h2 class="section-title">Customer directory</h2>
            <p class="section-copy">Practical V1 list with contact clues, address summary, and status badges.</p>
          </div>
          <label class="search-field">
            <span>Search</span>
            <input id="customer-search" placeholder="Name, company, phone, email, or tag" />
          </label>
        </div>
        <div id="customers-table-region" class="stack-gap"></div>
      </section>
    `,
  });

  const customers = await api.listCustomers();
  const region = document.getElementById('customers-table-region');
  const searchInput = document.getElementById('customer-search');

  const renderTable = () => {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = customers.filter((customer) => {
      if (!query) return true;
      return [
        customer.displayName,
        customer.customerType,
        customer.primaryPhone,
        customer.primaryEmail,
        customer.primaryAddressSummary,
        ...(customer.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    region.innerHTML = filtered.length
      ? `
        <div class="table-shell">
          <table class="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Address</th>
                <th>Tags / status</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((customer) => `
                <tr data-href="/app/customers/${customer.id}" class="clickable-row">
                  <td>
                    <div class="table-title">${escapeHtml(customer.displayName)}</div>
                    <div class="table-meta">Created ${new Date(customer.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td>${escapeHtml(customer.customerType)}</td>
                  <td>
                    <div>${escapeHtml(customer.primaryPhone || customer.primaryEmail || 'No primary contact')}</div>
                    <div class="table-meta">${escapeHtml(customer.primaryEmail && customer.primaryPhone ? customer.primaryEmail : '')}</div>
                  </td>
                  <td>${escapeHtml(customer.primaryAddressSummary || 'No address')}</td>
                  <td>
                    <div class="chip-row-inline">
                      ${customer.doNotService ? badge('Do not service', 'danger') : badge('Active', 'success')}
                    </div>
                    ${chips(customer.tags || [])}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
      : emptyState(
        query ? 'No matching customers' : 'No customers yet',
        query ? 'Try a broader search or clear the filter.' : 'Create the first customer to start the V1 flow.',
        `<button class="button button-primary" id="empty-create-customer">Add customer</button>`,
      );

    for (const row of region.querySelectorAll('.clickable-row')) {
      row.addEventListener('click', () => {
        location.href = row.dataset.href;
      });
    }

    document.getElementById('empty-create-customer')?.addEventListener('click', openCreateCustomerModal);
  };

  searchInput.addEventListener('input', renderTable);
  document.getElementById('open-create-customer').addEventListener('click', openCreateCustomerModal);
  renderTable();
}

async function renderCustomerDetailPage(customerId) {
  const customer = await api.getCustomer(customerId);
  const schedulerContext = getSchedulerContext();
  renderShell({
    title: customer.displayName,
    subtitle: `${customer.customerType}${customer.doNotService ? ' • Do not service' : ''}`,
    nav: 'customers',
    breadcrumbs: [
      `<a href="/app/customers/list">Customers</a>`,
      escapeHtml(customer.displayName),
    ],
    actions: `
      <button class="button" id="edit-customer-button">Edit</button>
      <button class="button button-primary" id="new-job-button">New job</button>
      <a class="button button-ghost" href="${escapeHtml(schedulerContext || '/app/calendar_new')}">Scheduler</a>
    `,
    content: `
      <section class="detail-grid">
        <div class="stack-gap-lg">
          <div class="surface-card stack-gap">
            <div class="section-header">
              <h2 class="section-title">Customer profile</h2>
              <div class="chip-row-inline">
                ${badge(customer.customerType, 'neutral')}
                ${customer.doNotService ? badge('Do not service', 'danger') : badge('Can schedule', 'success')}
                ${customer.sendNotifications ? badge('Notifications on', 'neutral') : badge('Notifications off', 'warning')}
              </div>
            </div>
            <div class="profile-grid">
              <div>
                <div class="label">Primary phone</div>
                <div>${escapeHtml(customer.phones[0]?.value || 'None')}</div>
              </div>
              <div>
                <div class="label">Primary email</div>
                <div>${escapeHtml(customer.emails[0]?.value || 'None')}</div>
              </div>
              <div>
                <div class="label">Company</div>
                <div>${escapeHtml(customer.companyName || 'None')}</div>
              </div>
              <div>
                <div class="label">Role</div>
                <div>${escapeHtml(customer.role || 'None')}</div>
              </div>
            </div>
            <div>
              <div class="label">Address</div>
              <div>${escapeHtml(formatAddress(customer.addresses[0]) || 'No address')}</div>
            </div>
            <div>
              <div class="label">Tags</div>
              ${chips(customer.tags)}
            </div>
            <div>
              <div class="label">Notes</div>
              <p>${escapeHtml(customer.customerNotes || 'No notes recorded.')}</p>
            </div>
            <div class="profile-grid">
              <div>
                <div class="label">Lead source</div>
                <div>${escapeHtml(customer.leadSource || 'None')}</div>
              </div>
              <div>
                <div class="label">Referred by</div>
                <div>${escapeHtml(customer.referredBy || 'None')}</div>
              </div>
            </div>
          </div>
          <div class="surface-card stack-gap">
            <div class="section-header">
              <h2 class="section-title">Related jobs</h2>
              <button class="button button-primary" id="new-job-inline-button">Create one-time job</button>
            </div>
            <div id="customer-jobs-region"></div>
          </div>
        </div>
        <aside class="stack-gap-lg">
          <div class="surface-card stack-gap">
            <h2 class="section-title">Quick facts</h2>
            <div class="stat-row"><span>Jobs</span><strong>${customer.jobs.length}</strong></div>
            <div class="stat-row"><span>Scheduled jobs</span><strong>${customer.jobs.filter((job) => job.scheduleState === 'scheduled').length}</strong></div>
            <div class="stat-row"><span>Unscheduled jobs</span><strong>${customer.jobs.filter((job) => job.scheduleState !== 'scheduled').length}</strong></div>
          </div>
          <div class="surface-card stack-gap">
            <h2 class="section-title">V1 scope reminder</h2>
            <p class="muted">This screen handles one-time jobs only. Recurrence, invoicing, and billing remain intentionally unsupported.</p>
          </div>
        </aside>
      </section>
    `,
  });

  renderCustomerJobs(customer.jobs);
  document.getElementById('edit-customer-button').addEventListener('click', () => openCustomerFormModal({ mode: 'edit', customer }));
  document.getElementById('new-job-button').addEventListener('click', () => openCreateJobModal(customer));
  document.getElementById('new-job-inline-button').addEventListener('click', () => openCreateJobModal(customer));
}

function renderCustomerJobs(jobs) {
  const region = document.getElementById('customer-jobs-region');
  if (!jobs.length) {
    region.innerHTML = emptyState('No jobs yet', 'Create the first one-time job from this customer record.');
    return;
  }

  region.innerHTML = `
    <div class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Service</th>
            <th>Schedule</th>
            <th>Assignee</th>
          </tr>
        </thead>
        <tbody>
          ${jobs.map((job) => `
            <tr data-href="/app/jobs/${job.id}" class="clickable-row">
              <td>${escapeHtml(job.jobNumber)}</td>
              <td>${escapeHtml(job.titleOrServiceSummary)}</td>
              <td>${job.scheduleState === 'scheduled' ? escapeHtml(formatDateRange(job.scheduledStartAt, job.scheduledEndAt)) : badge('Unscheduled', 'warning')}</td>
              <td>${escapeHtml(job.assigneeTeamMemberId || 'Unassigned')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  for (const row of region.querySelectorAll('.clickable-row')) {
    row.addEventListener('click', () => {
      location.href = row.dataset.href;
    });
  }
}

async function renderJobDetailPage(jobId) {
  const job = await api.getJob(jobId);
  const customer = await api.getCustomer(job.customer.id);
  const schedulerContext = getSchedulerContext();
  renderShell({
    title: `${job.jobNumber} • ${job.titleOrServiceSummary}`,
    subtitle: `${job.scheduleState === 'scheduled' ? 'Scheduled' : 'Unscheduled'} • ${job.assignee?.displayName || 'Unassigned'}`,
    nav: 'scheduler',
    breadcrumbs: [
      `<a href="/app/customers/list">Customers</a>`,
      `<a href="/app/customers/${job.customer.id}">${escapeHtml(job.customer.displayName)}</a>`,
      escapeHtml(job.jobNumber),
    ],
    actions: `
      <button class="button" id="edit-job-button">Edit job</button>
      <button class="button" id="schedule-job-button">${job.scheduleState === 'scheduled' ? 'Reschedule' : 'Schedule'}</button>
      <button class="button" id="edit-team-button">${job.assignmentState === 'assigned' ? 'Edit team' : 'Assign'}</button>
      <button class="button button-danger" id="unschedule-job-button" ${job.scheduleState === 'scheduled' ? '' : 'disabled'}>Undo schedule</button>
      <a class="button button-ghost" href="${escapeHtml(schedulerContext || '/app/calendar_new')}">Back to scheduler</a>
    `,
    content: `
      <section class="detail-grid">
        <div class="stack-gap-lg">
          <div class="surface-card stack-gap">
            <div class="section-header">
              <h2 class="section-title">Job overview</h2>
              <div class="chip-row-inline">
                ${job.scheduleState === 'scheduled' ? badge('Scheduled', 'success') : badge('Unscheduled', 'warning')}
                ${job.assignee?.displayName ? badge(job.assignee.displayName, 'neutral') : badge('Unassigned', 'warning')}
              </div>
            </div>
            <div class="profile-grid">
              <div>
                <div class="label">Customer</div>
                <div><a href="/app/customers/${job.customer.id}">${escapeHtml(job.customer.displayName)}</a></div>
              </div>
              <div>
                <div class="label">Address</div>
                <div>${escapeHtml(formatAddress(job.address) || 'No address')}</div>
              </div>
              <div>
                <div class="label">Lead source</div>
                <div>${escapeHtml(job.leadSource || 'None')}</div>
              </div>
              <div>
                <div class="label">Tags</div>
                ${chips(job.tags)}
              </div>
            </div>
            <div>
              <div class="label">Private notes</div>
              <p>${escapeHtml(job.privateNotes || 'No private notes.')}</p>
            </div>
          </div>
          <div class="surface-card stack-gap">
            <h2 class="section-title">Schedule and assignment</h2>
            <div class="status-panel-grid">
              <div class="status-panel">
                <div class="label">Schedule state</div>
                <strong>${job.scheduleState === 'scheduled' ? escapeHtml(formatDateRange(job.scheduledStartAt, job.scheduledEndAt)) : 'Unscheduled'}</strong>
              </div>
              <div class="status-panel">
                <div class="label">Assignee</div>
                <strong>${escapeHtml(job.assignee?.displayName || 'Unassigned')}</strong>
              </div>
            </div>
            ${job.customer.doNotService ? statusMessage('This customer is flagged as do not service, so scheduling remains blocked in V1.', 'warning') : ''}
          </div>
        </div>
        <aside class="stack-gap-lg">
          <div class="surface-card stack-gap">
            <h2 class="section-title">Context</h2>
            <p class="muted">Use this page to keep one-time job details accurate, then jump back into the scheduler for day, week, or month planning.</p>
            <a class="button button-ghost" href="/app/customers/${job.customer.id}">Back to customer</a>
          </div>
        </aside>
      </section>
    `,
  });

  document.getElementById('edit-job-button').addEventListener('click', () => openEditJobModal(job, customer));
  document.getElementById('schedule-job-button').addEventListener('click', () => openScheduleModal(job));
  document.getElementById('edit-team-button').addEventListener('click', () => openTeamModal(job));
  document.getElementById('unschedule-job-button').addEventListener('click', async () => {
    if (!confirm('Undo the current schedule for this job?')) return;
    try {
      await api.unscheduleJob(job.id);
      setFlash('Job unscheduled.', 'success');
      location.reload();
    } catch (error) {
      showTransientPageNotice(error.message, 'danger');
    }
  });
}

async function renderSchedulerPage() {
  const params = new URLSearchParams(location.search);
  const view = ['day', 'week', 'month'].includes(params.get('view')) ? params.get('view') : 'day';
  const date = params.get('date') || localToday();
  const range = viewRange(view, date);
  const schedule = await api.getScheduleRange(range.startDate, range.endDate);
  const rangeLabel = formatRangeLabel(view, date);

  renderShell({
    title: 'Scheduler',
    subtitle: `One-time jobs only. ${rangeLabel}`,
    nav: 'scheduler',
    breadcrumbs: [escapeHtml('Scheduler')],
    actions: `
      <div class="scheduler-actions">
        <div class="view-switcher">
          ${schedulerViewButton('day', view, date)}
          ${schedulerViewButton('week', view, date)}
          ${schedulerViewButton('month', view, date)}
        </div>
      </div>
    `,
    content: `
      <section class="surface-card stack-gap-lg">
        <div class="toolbar toolbar-between scheduler-toolbar">
          <div class="inline-actions">
            <a class="button" href="${buildSchedulerUrl({ view, date: stepAnchorDay(view, date, -1) })}">Previous</a>
            <a class="button" href="${buildSchedulerUrl({ view, date: localToday() })}">Today</a>
            <a class="button" href="${buildSchedulerUrl({ view, date: stepAnchorDay(view, date, 1) })}">Next</a>
          </div>
          <form id="scheduler-jump-form" class="inline-actions compact-form">
            <label>
              <span class="label-inline">Focus date</span>
              <input type="date" name="date" value="${escapeHtml(date)}" />
            </label>
            <input type="hidden" name="view" value="${escapeHtml(view)}" />
            <button class="button button-primary" type="submit">Go</button>
          </form>
        </div>
        <div class="range-pill">${escapeHtml(rangeLabel)}</div>
        <div id="scheduler-region">${renderSchedulerView({ view, date, schedule })}</div>
      </section>
    `,
  });

  document.getElementById('scheduler-jump-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    location.href = buildSchedulerUrl({ view: form.get('view'), date: form.get('date') });
  });

  bindSchedulerQuickActions();
}

function renderSchedulerView({ view, date, schedule }) {
  if (view === 'day') {
    return renderDaySchedulerView(date, schedule);
  }
  if (view === 'week') {
    return renderWeekSchedulerView(date, schedule);
  }
  return renderMonthSchedulerView(date, schedule);
}

function renderDaySchedulerView(date, schedule) {
  const jobsByLane = new Map(schedule.lanes.map((lane) => [lane.id, []]));
  for (const job of schedule.jobs) {
    if (jobDayKeys(job, date, date).includes(date)) {
      const laneId = job.assigneeTeamMemberId || 'unassigned';
      jobsByLane.get(laneId)?.push(job);
    }
  }

  return `
    <div class="lane-board">
      ${schedule.lanes.map((lane) => `
        <section class="lane-column ${lane.id === 'unassigned' ? 'lane-column-unassigned' : ''}">
          <div class="lane-header">
            <div>
              <h3>${escapeHtml(lane.label)}</h3>
              <p>${lane.id === 'unassigned' ? 'Visible bucket for scheduled work with no assignee yet.' : 'Assigned lane for scheduled work.'}</p>
            </div>
            ${lane.initials ? `<span class="lane-avatar">${escapeHtml(lane.initials)}</span>` : badge('Needs team', 'warning')}
          </div>
          <div class="lane-body">
            ${(jobsByLane.get(lane.id) || []).length ? (jobsByLane.get(lane.id) || []).sort(compareJobs).map((job) => schedulerCard(job)).join('') : `<div class="empty-lane">No scheduled jobs</div>`}
          </div>
        </section>
      `).join('')}
    </div>
  `;
}

function renderWeekSchedulerView(date, schedule) {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const days = listDays(start, end);
  const jobsByDay = groupJobsByDay(schedule.jobs, start, end);

  return `
    <div class="week-grid">
      ${days.map((day) => `
        <section class="week-column ${day === formatDayKey(parseDayKey(localToday())) ? 'is-today' : ''}">
          <div class="week-header">
            <div class="week-weekday">${escapeHtml(weekdayLabel(day))}</div>
            <div class="week-date">${escapeHtml(shortDayLabel(day))}</div>
          </div>
          <div class="week-body">
            ${(jobsByDay.get(day) || []).length ? (jobsByDay.get(day) || []).sort(compareJobs).map((job) => schedulerCard(job, { compact: true })).join('') : `<div class="empty-lane">No jobs</div>`}
          </div>
        </section>
      `).join('')}
    </div>
  `;
}

function renderMonthSchedulerView(date, schedule) {
  const start = monthGridStart(date);
  const end = monthGridEnd(date);
  const days = listDays(start, end);
  const jobsByDay = groupJobsByDay(schedule.jobs, start, end);
  const activeMonth = startOfMonth(date).slice(0, 7);

  return `
    <div class="month-grid month-grid-head">
      ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => `<div class="month-head-cell">${label}</div>`).join('')}
    </div>
    <div class="month-grid">
      ${days.map((day) => {
        const dayJobs = (jobsByDay.get(day) || []).sort(compareJobs);
        return `
          <section class="month-cell ${day.startsWith(activeMonth) ? '' : 'is-muted-month'} ${day === localToday() ? 'is-today' : ''}">
            <div class="month-day-top">
              <strong>${parseDayKey(day).getDate()}</strong>
              <span>${dayJobs.length ? `${dayJobs.length} job${dayJobs.length === 1 ? '' : 's'}` : ''}</span>
            </div>
            <div class="month-day-body">
              ${dayJobs.length ? dayJobs.slice(0, 3).map((job) => schedulerCard(job, { compact: true, month: true })).join('') : '<div class="empty-lane">No jobs</div>'}
              ${dayJobs.length > 3 ? `<div class="more-count">+${dayJobs.length - 3} more jobs</div>` : ''}
            </div>
          </section>
        `;
      }).join('')}
    </div>
  `;
}

function groupJobsByDay(jobs, start, end) {
  const map = new Map();
  for (const day of listDays(start, end)) {
    map.set(day, []);
  }
  for (const job of jobs) {
    for (const day of jobDayKeys(job, start, end)) {
      map.get(day)?.push(job);
    }
  }
  return map;
}

function schedulerCard(job, options = {}) {
  return `
    <article class="scheduler-card ${options.compact ? 'compact' : ''}">
      <div class="scheduler-card-top">
        <a class="scheduler-card-link" href="${buildJobUrl(job.id)}"><strong>${escapeHtml(job.jobNumber)}</strong></a>
        ${job.assigneeTeamMemberId ? badge(job.assignmentLabel, 'neutral') : badge('Unassigned', 'warning')}
      </div>
      <div class="scheduler-card-body">
        <div class="scheduler-card-title">${escapeHtml(job.titleOrServiceSummary)}</div>
        <div class="scheduler-card-meta">${escapeHtml(job.customer?.displayName || 'Unknown customer')}</div>
        <div class="scheduler-card-meta">${escapeHtml(formatTime(job.scheduledStartAt))} to ${escapeHtml(formatTime(job.scheduledEndAt))}</div>
      </div>
      <div class="scheduler-card-actions">
        <a class="button button-small button-ghost" href="${buildJobUrl(job.id)}">Open</a>
        <button class="button button-small" data-action="schedule" data-job-id="${job.id}">Reschedule</button>
        <button class="button button-small" data-action="assign" data-job-id="${job.id}">${job.assigneeTeamMemberId ? 'Reassign' : 'Assign'}</button>
        ${job.assigneeTeamMemberId ? `<button class="button button-small button-ghost" data-action="unassign" data-job-id="${job.id}">Unassign</button>` : ''}
        <button class="button button-small button-danger" data-action="unschedule" data-job-id="${job.id}">Unschedule</button>
      </div>
    </article>
  `;
}

function bindSchedulerQuickActions() {
  for (const button of document.querySelectorAll('[data-action][data-job-id]')) {
    button.addEventListener('click', async (event) => {
      const { action, jobId } = event.currentTarget.dataset;
      const job = await api.getJob(jobId);
      if (action === 'schedule') {
        openScheduleModal(job);
        return;
      }
      if (action === 'assign') {
        openTeamModal(job);
        return;
      }
      if (action === 'unassign') {
        try {
          await api.unassignJob(jobId);
          setFlash('Job set to unassigned.', 'success');
          location.reload();
        } catch (error) {
          showTransientPageNotice(error.message, 'danger');
        }
        return;
      }
      if (action === 'unschedule') {
        if (!confirm('Unschedule this job from the calendar?')) return;
        try {
          await api.unscheduleJob(jobId);
          setFlash('Job unscheduled from scheduler.', 'success');
          location.reload();
        } catch (error) {
          showTransientPageNotice(error.message, 'danger');
        }
      }
    });
  }
}

function openCreateCustomerModal() {
  openCustomerFormModal({ mode: 'create' });
}

function openCustomerFormModal({ mode, customer = null }) {
  openModal({
    title: mode === 'create' ? 'Add customer' : `Edit ${customer.displayName}`,
    body: `
      <form id="customer-modal-form" class="stack-gap modal-form">
        ${customerFormHtml(customer)}
        <div id="customer-modal-status"></div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
          <button type="submit" class="button button-primary">${mode === 'create' ? 'Create customer' : 'Save changes'}</button>
        </div>
      </form>
    `,
  });

  document.getElementById('close-modal-button').addEventListener('click', closeModal);
  document.getElementById('customer-modal-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = customerPayloadFromForm(event.currentTarget);
      const saved = mode === 'create'
        ? await api.createCustomer(payload)
        : await api.updateCustomer(customer.id, payload);
      setFlash(mode === 'create' ? 'Customer created.' : 'Customer saved.', 'success');
      location.href = `/app/customers/${saved.id}`;
    } catch (error) {
      document.getElementById('customer-modal-status').innerHTML = statusMessage(error.message, 'danger');
    }
  });
}

function openCreateJobModal(customer) {
  openModal({
    title: `Create one-time job for ${customer.displayName}`,
    body: `
      <form id="create-job-form" class="stack-gap modal-form">
        <label>
          <span>Service summary</span>
          <input name="titleOrServiceSummary" required />
        </label>
        <label>
          <span>Address</span>
          <select name="customerAddressId" required>
            ${customer.addresses.map((address) => `<option value="${address.id}">${escapeHtml(formatAddress(address))}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>Lead source</span>
          <input name="leadSource" />
        </label>
        <label>
          <span>Tags</span>
          <input name="tags" placeholder="comma separated" />
        </label>
        <label>
          <span>Private notes</span>
          <textarea name="privateNotes"></textarea>
        </label>
        <div id="job-modal-status"></div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
          <button type="submit" class="button button-primary">Create job</button>
        </div>
      </form>
    `,
  });
  document.getElementById('close-modal-button').addEventListener('click', closeModal);
  document.getElementById('create-job-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = jobPayloadFromForm(event.currentTarget);
      const job = await api.createJob(customer.id, payload);
      setFlash('Job created.', 'success');
      location.href = buildJobUrl(job.id);
    } catch (error) {
      document.getElementById('job-modal-status').innerHTML = statusMessage(error.message, 'danger');
    }
  });
}

function openEditJobModal(job, customer) {
  openModal({
    title: `Edit ${job.jobNumber}`,
    body: `
      <form id="edit-job-form" class="stack-gap modal-form">
        <label>
          <span>Service summary</span>
          <input name="titleOrServiceSummary" value="${escapeHtml(job.titleOrServiceSummary)}" required />
        </label>
        <label>
          <span>Address</span>
          <select name="customerAddressId" required>
            ${customer.addresses.map((address) => `
              <option value="${address.id}" ${job.customerAddressId === address.id ? 'selected' : ''}>${escapeHtml(formatAddress(address))}</option>
            `).join('')}
          </select>
        </label>
        <label>
          <span>Lead source</span>
          <input name="leadSource" value="${escapeHtml(job.leadSource || '')}" />
        </label>
        <label>
          <span>Tags</span>
          <input name="tags" value="${escapeHtml((job.tags || []).join(', '))}" />
        </label>
        <label>
          <span>Private notes</span>
          <textarea name="privateNotes">${escapeHtml(job.privateNotes || '')}</textarea>
        </label>
        <div id="edit-job-status"></div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
          <button type="submit" class="button button-primary">Save job</button>
        </div>
      </form>
    `,
  });

  document.getElementById('close-modal-button').addEventListener('click', closeModal);
  document.getElementById('edit-job-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api.updateJob(job.id, jobPayloadFromForm(event.currentTarget));
      setFlash('Job saved.', 'success');
      location.reload();
    } catch (error) {
      document.getElementById('edit-job-status').innerHTML = statusMessage(error.message, 'danger');
    }
  });
}

function openScheduleModal(job) {
  openModal({
    title: `${job.scheduleState === 'scheduled' ? 'Reschedule' : 'Schedule'} ${job.jobNumber}`,
    body: `
      <form id="schedule-job-form" class="stack-gap modal-form">
        <label>
          <span>Start</span>
          <input name="scheduledStartAt" type="datetime-local" value="${job.scheduledStartAt ? escapeHtml(toDateTimeLocal(job.scheduledStartAt)) : ''}" required />
        </label>
        <label>
          <span>End</span>
          <input name="scheduledEndAt" type="datetime-local" value="${job.scheduledEndAt ? escapeHtml(toDateTimeLocal(job.scheduledEndAt)) : ''}" required />
        </label>
        ${job.customer?.doNotService ? statusMessage('This customer is marked do not service. Scheduling is blocked in V1.', 'warning') : ''}
        <div id="schedule-job-status"></div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
          <button type="submit" class="button button-primary" ${job.customer?.doNotService ? 'disabled' : ''}>Save schedule</button>
        </div>
      </form>
    `,
  });
  document.getElementById('close-modal-button').addEventListener('click', closeModal);
  document.getElementById('schedule-job-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      await api.scheduleJob(job.id, {
        scheduledStartAt: toIso(form.get('scheduledStartAt')),
        scheduledEndAt: toIso(form.get('scheduledEndAt')),
      });
      setFlash('Schedule updated.', 'success');
      location.reload();
    } catch (error) {
      document.getElementById('schedule-job-status').innerHTML = statusMessage(error.message, 'danger');
    }
  });
}

function openTeamModal(job) {
  openModal({
    title: `${job.assignee?.displayName ? 'Reassign' : 'Assign'} ${job.jobNumber}`,
    body: `
      <form id="team-job-form" class="stack-gap modal-form">
        <label>
          <span>Active team member</span>
          <select name="teamMemberId">
            ${state.teamMembers.map((member) => `<option value="${member.id}" ${job.assigneeTeamMemberId === member.id ? 'selected' : ''}>${escapeHtml(member.displayName)}</option>`).join('')}
          </select>
        </label>
        <div id="team-job-status"></div>
        <div class="modal-actions split-actions">
          <div class="inline-actions">
            ${job.assigneeTeamMemberId ? '<button type="button" class="button button-ghost" id="unassign-team-button">Set unassigned</button>' : ''}
          </div>
          <div class="inline-actions">
            <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
            <button type="submit" class="button button-primary">Save team</button>
          </div>
        </div>
      </form>
    `,
  });

  document.getElementById('close-modal-button').addEventListener('click', closeModal);
  document.getElementById('unassign-team-button')?.addEventListener('click', async () => {
    try {
      await api.unassignJob(job.id);
      setFlash('Assignment updated.', 'success');
      location.reload();
    } catch (error) {
      document.getElementById('team-job-status').innerHTML = statusMessage(error.message, 'danger');
    }
  });
  document.getElementById('team-job-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const teamMemberId = new FormData(event.currentTarget).get('teamMemberId');
      await api.assignJob(job.id, teamMemberId);
      setFlash('Assignment updated.', 'success');
      location.reload();
    } catch (error) {
      document.getElementById('team-job-status').innerHTML = statusMessage(error.message, 'danger');
    }
  });
}

function openModal({ title, body }) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-head">
          <h2>${escapeHtml(title)}</h2>
          <button class="button button-ghost button-small" id="modal-x-button">Close</button>
        </div>
        <div class="modal-body">${body}</div>
      </div>
    </div>
  `;
  document.getElementById('modal-x-button').addEventListener('click', closeModal);
}

function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

function customerFormHtml(customer) {
  const address = customer?.addresses?.[0] || {};
  return `
    <div class="form-grid two-columns">
      <label><span>Display name</span><input name="displayName" value="${escapeHtml(customer?.displayName || '')}" /></label>
      <label><span>Customer type</span>
        <select name="customerType">
          <option value="Homeowner" ${(customer?.customerType || 'Homeowner') === 'Homeowner' ? 'selected' : ''}>Homeowner</option>
          <option value="Business" ${customer?.customerType === 'Business' ? 'selected' : ''}>Business</option>
        </select>
      </label>
      <label><span>First name</span><input name="firstName" value="${escapeHtml(customer?.firstName || '')}" /></label>
      <label><span>Last name</span><input name="lastName" value="${escapeHtml(customer?.lastName || '')}" /></label>
      <label><span>Company</span><input name="companyName" value="${escapeHtml(customer?.companyName || '')}" /></label>
      <label><span>Role</span><input name="role" value="${escapeHtml(customer?.role || '')}" /></label>
      <label><span>Primary phone</span><input name="mobilePhone" value="${escapeHtml(customer?.phones?.[0]?.value || '')}" /></label>
      <label><span>Primary email</span><input name="email" value="${escapeHtml(customer?.emails?.[0]?.value || '')}" /></label>
      <label><span>Street</span><input name="street" value="${escapeHtml(address.street || '')}" /></label>
      <label><span>Unit</span><input name="unit" value="${escapeHtml(address.unit || '')}" /></label>
      <label><span>City</span><input name="city" value="${escapeHtml(address.city || '')}" /></label>
      <label><span>State</span><input name="state" value="${escapeHtml(address.state || '')}" /></label>
      <label><span>Zip</span><input name="zip" value="${escapeHtml(address.zip || '')}" /></label>
      <label><span>Lead source</span><input name="leadSource" value="${escapeHtml(customer?.leadSource || '')}" /></label>
      <label><span>Referred by</span><input name="referredBy" value="${escapeHtml(customer?.referredBy || '')}" /></label>
      <label class="full-span"><span>Address notes</span><textarea name="addressNotes">${escapeHtml(address.notes || '')}</textarea></label>
      <label class="full-span"><span>Tags</span><input name="tags" value="${escapeHtml((customer?.tags || []).join(', '))}" placeholder="comma separated" /></label>
      <label class="full-span"><span>Customer notes</span><textarea name="customerNotes">${escapeHtml(customer?.customerNotes || '')}</textarea></label>
    </div>
    <div class="inline-actions check-row">
      <label><input type="checkbox" name="doNotService" ${customer?.doNotService ? 'checked' : ''} /> Do not service</label>
      <label><input type="checkbox" name="sendNotifications" ${customer?.sendNotifications !== false ? 'checked' : ''} /> Send notifications</label>
    </div>
  `;
}

function customerPayloadFromForm(form) {
  const data = new FormData(form);
  return {
    displayName: data.get('displayName'),
    firstName: data.get('firstName'),
    lastName: data.get('lastName'),
    companyName: data.get('companyName'),
    role: data.get('role'),
    customerType: data.get('customerType'),
    mobilePhone: data.get('mobilePhone'),
    email: data.get('email'),
    street: data.get('street'),
    unit: data.get('unit'),
    city: data.get('city'),
    state: data.get('state'),
    zip: data.get('zip'),
    addressNotes: data.get('addressNotes'),
    tags: splitTags(data.get('tags')),
    customerNotes: data.get('customerNotes'),
    leadSource: data.get('leadSource'),
    referredBy: data.get('referredBy'),
    doNotService: form.querySelector('[name="doNotService"]').checked,
    sendNotifications: form.querySelector('[name="sendNotifications"]').checked,
  };
}

function jobPayloadFromForm(form) {
  const data = new FormData(form);
  return {
    titleOrServiceSummary: data.get('titleOrServiceSummary'),
    customerAddressId: data.get('customerAddressId'),
    leadSource: data.get('leadSource'),
    tags: splitTags(data.get('tags')),
    privateNotes: data.get('privateNotes'),
  };
}

function splitTags(raw) {
  return String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function schedulerViewButton(targetView, activeView, date) {
  return `<a class="button ${targetView === activeView ? 'button-primary' : ''}" href="${buildSchedulerUrl({ view: targetView, date })}">${escapeHtml(capitalize(targetView))}</a>`;
}

function buildSchedulerUrl({ view, date }) {
  return `/app/calendar_new?view=${encodeURIComponent(view)}&date=${encodeURIComponent(date)}`;
}

function buildJobUrl(jobId) {
  const params = new URLSearchParams(location.search);
  const schedulerQuery = location.pathname === '/app/calendar_new'
    ? `?returnTo=${encodeURIComponent(`/app/calendar_new?${params.toString()}`)}`
    : (new URLSearchParams(location.search).get('returnTo') ? `?returnTo=${encodeURIComponent(new URLSearchParams(location.search).get('returnTo'))}` : '');
  return `/app/jobs/${jobId}${schedulerQuery}`;
}

function getSchedulerContext() {
  return new URLSearchParams(location.search).get('returnTo');
}

function compareJobs(left, right) {
  return new Date(left.scheduledStartAt).getTime() - new Date(right.scheduledStartAt).getTime();
}

function showTransientPageNotice(message, tone = 'info') {
  const existing = document.querySelector('.notice-inline');
  existing?.remove();
  const region = document.getElementById('page-content');
  const wrapper = document.createElement('div');
  wrapper.className = 'notice-inline';
  wrapper.innerHTML = statusMessage(message, tone);
  region.prepend(wrapper);
}

function renderFatal(error) {
  app.innerHTML = `<div class="surface-card"><h1>Something went wrong</h1><pre>${escapeHtml(error.message)}</pre></div>`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
