import { api } from './api.js';
import {
  addDays,
  formatDateRange,
  formatDateTime,
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
import {
  buildCustomerUrl,
  buildDayUrl,
  buildJobScheduleUrl,
  buildJobUrl,
  buildNewJobUrl,
  buildSchedulerUrl,
  getSchedulerContext,
} from './scheduler-links.js';

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

  if (pathname === '/app/jobs/new') {
    await renderNewJobPage();
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

  const jobScheduleMatch = pathname.match(/^\/app\/jobs\/([^/]+)\/schedule$/);
  if (jobScheduleMatch) {
    await renderJobSchedulePage(jobScheduleMatch[1]);
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
  const schedulerContext = getSchedulerContext(location.search);
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
      <a class="button button-primary" id="new-job-button" href="${buildNewJobUrl({ customerId: customer.id, pathname: location.pathname, search: location.search })}">New job</a>
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
              <a class="button button-primary" id="new-job-inline-button" href="${buildNewJobUrl({ customerId: customer.id, pathname: location.pathname, search: location.search })}">Create one-time job</a>
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

  renderCustomerJobs(customer, customer.jobs);
  document.getElementById('edit-customer-button').addEventListener('click', () => openCustomerFormModal({ mode: 'edit', customer }));
}

function renderCustomerJobs(customer, jobs) {
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
            <th>Address</th>
            <th>Schedule</th>
            <th>Assignee</th>
          </tr>
        </thead>
        <tbody>
          ${jobs.map((job) => `
            <tr data-href="${buildJobUrl(job.id, location.pathname, location.search)}" class="clickable-row">
              <td>
                <div class="table-title">${escapeHtml(job.jobNumber)}</div>
                <div class="table-meta">${job.scheduleState === 'scheduled' ? 'Scheduled job' : 'Ready to schedule'}</div>
              </td>
              <td>
                <div>${escapeHtml(job.titleOrServiceSummary)}</div>
                <div class="table-meta">${job.scheduleState === 'scheduled' ? 'Open detail to reschedule or change team' : 'Open detail to schedule or assign'}</div>
              </td>
              <td>${escapeHtml(formatAddress(job.address) || formatAddress(customer.addresses[0]) || 'No address')}</td>
              <td>${job.scheduleState === 'scheduled' ? escapeHtml(formatDateRange(job.scheduledStartAt, job.scheduledEndAt)) : badge('Unscheduled', 'warning')}</td>
              <td>${job.assigneeDisplayName ? escapeHtml(job.assigneeDisplayName) : badge('Unassigned', 'warning')}</td>
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

async function renderNewJobPage() {
  const params = new URLSearchParams(location.search);
  const customerId = params.get('customerId');
  const seededDate = params.get('date') || localToday();
  const returnTo = getSchedulerContext(location.search);

  if (!customerId) {
    const customers = await api.listCustomers();
    renderShell({
      title: 'New job',
      subtitle: 'Choose a customer first, then continue in the dedicated one-time job workspace.',
      nav: returnTo ? 'scheduler' : 'customers',
      breadcrumbs: ['<a href="/app/customers/list">Customers</a>', 'New job'],
      actions: returnTo ? `<a class="button button-ghost" href="${escapeHtml(returnTo)}">Back to scheduler</a>` : '',
      content: `
        <div class="job-workspace-grid">
          <section class="surface-card stack-gap-lg">
            <div class="section-header">
              <div>
                <h2 class="section-title">Customer</h2>
                <p class="section-copy">Search by name, company, phone, email, or tag. This keeps customer lookup inside the create-job flow.</p>
              </div>
              <button type="button" class="button button-small button-ghost" id="new-job-customer-button">+ New customer</button>
            </div>
            <label class="search-field customer-picker-search">
              <span>Find customer</span>
              <input id="new-job-customer-search" placeholder="Name, phone, email, company, or tag" />
            </label>
            <div id="new-job-customer-list" class="customer-picker-list">
              ${customers.map((candidate) => `
                <a
                  class="customer-picker-row"
                  href="${buildNewJobUrl({ customerId: candidate.id, pathname: location.pathname, search: location.search, date: seededDate })}"
                  data-customer-search="${escapeHtml([
                    candidate.displayName,
                    candidate.companyName,
                    candidate.phones?.map((phone) => phone.value).join(' '),
                    candidate.emails?.map((email) => email.value).join(' '),
                    (candidate.tags || []).join(' '),
                    formatAddress(candidate.addresses?.[0]),
                  ].filter(Boolean).join(' ').toLowerCase())}"
                >
                  <div class="customer-picker-main">
                    <strong>${escapeHtml(candidate.displayName)}</strong>
                    <span>${escapeHtml(candidate.companyName || formatAddress(candidate.addresses?.[0]) || 'No address')}</span>
                  </div>
                  <div class="customer-picker-meta">
                    <span>${escapeHtml(candidate.phones?.[0]?.value || candidate.emails?.[0]?.value || 'No contact')}</span>
                    ${candidate.doNotService ? badge('Do not service', 'danger') : badge(candidate.customerType || 'Customer', 'neutral')}
                  </div>
                </a>
              `).join('')}
            </div>
            <div id="new-job-customer-empty" class="empty-state" hidden>
              <h3>No matching customers</h3>
              <p>Try a different search, or create the customer inline and come right back to this job flow.</p>
            </div>
          </section>

          <section class="surface-card stack-gap-lg">
            <div class="section-header">
              <h2 class="section-title">Next step</h2>
              <div class="chip-row-inline">
                ${badge('New job', 'neutral')}
                ${badge('Customer required', 'warning')}
              </div>
            </div>
            ${statusMessage('Select a customer to unlock schedule, private notes, and line items.', 'warning')}
            <div class="stat-summary-card">
              <div class="stat-row"><span>Schedule panel</span><strong>Waiting for customer</strong></div>
              <div class="stat-row"><span>Private notes</span><strong>Waiting for customer</strong></div>
              <div class="stat-row"><span>Line items</span><strong>Waiting for customer</strong></div>
            </div>
            <div class="table-meta">This route now works from Scheduler too, instead of forcing you back out to a customer record first.</div>
          </section>
        </div>
      `,
    });

    document.getElementById('new-job-customer-button').addEventListener('click', () => {
      openCreateCustomerModal({
        onSave(savedCustomer) {
          setFlash('Customer created. Continue building the job.', 'success');
          location.href = buildNewJobUrl({
            customerId: savedCustomer.id,
            pathname: location.pathname,
            search: location.search,
            date: seededDate,
          });
        },
      });
    });

    const searchInput = document.getElementById('new-job-customer-search');
    const rows = Array.from(document.querySelectorAll('.customer-picker-row'));
    const emptyStateNode = document.getElementById('new-job-customer-empty');
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      let visible = 0;
      for (const row of rows) {
        const matches = !query || row.dataset.customerSearch.includes(query);
        row.hidden = !matches;
        if (matches) visible += 1;
      }
      emptyStateNode.hidden = visible > 0;
    });
    return;
  }

  const customer = await api.getCustomer(customerId);
  const defaultStart = `${seededDate}T09:00`;
  const defaultEnd = `${seededDate}T10:00`;
  const hasAddresses = Boolean(customer.addresses?.length);

  renderShell({
    title: 'New job',
    subtitle: 'Dedicated one-time job workspace with customer context, optional scheduling, and V1-safe operational fields.',
    nav: returnTo ? 'scheduler' : 'customers',
    breadcrumbs: [
      '<a href="/app/customers/list">Customers</a>',
      `<a href="${buildCustomerUrl(customer.id, location.pathname, location.search)}">${escapeHtml(customer.displayName)}</a>`,
      'New job',
    ],
    actions: `
      <a class="button button-ghost" href="${escapeHtml(returnTo || `/app/customers/${customer.id}`)}">${escapeHtml(returnTo ? 'Back to scheduler' : 'Back to customer')}</a>
    `,
    content: `
      <form id="new-job-page-form" class="job-workspace-grid">
        <div class="stack-gap-lg">
          <section class="surface-card stack-gap">
            <div class="section-header">
              <h2 class="section-title">Customer</h2>
              <button type="button" class="button button-small button-ghost" id="new-job-customer-button">+ New customer</button>
            </div>
            <label>
              <span>Name, email, phone, or address</span>
              <input value="${escapeHtml(customer.displayName)}" disabled />
            </label>
            <div class="profile-grid">
              <div>
                <div class="label">Primary phone</div>
                <div>${escapeHtml(customer.phones?.[0]?.value || 'None')}</div>
              </div>
              <div>
                <div class="label">Primary email</div>
                <div>${escapeHtml(customer.emails?.[0]?.value || 'None')}</div>
              </div>
            </div>
            <div>
              <div class="label">Address</div>
              <div>${escapeHtml(formatAddress(customer.addresses?.[0]) || 'No address')}</div>
            </div>
          </section>

          <section class="surface-card stack-gap">
            <div class="section-header">
              <h2 class="section-title">Schedule</h2>
              <div class="chip-row-inline">
                ${customer.doNotService ? badge('Do not service', 'danger') : badge('Scheduling allowed', 'success')}
              </div>
            </div>
            <div class="form-grid two-columns">
              <label>
                <span>From</span>
                <input name="scheduledStartAt" type="datetime-local" value="${escapeHtml(defaultStart)}" />
              </label>
              <label>
                <span>To</span>
                <input name="scheduledEndAt" type="datetime-local" value="${escapeHtml(defaultEnd)}" />
              </label>
            </div>
            <div class="inline-actions check-row">
              <label><input type="checkbox" name="skipSchedule" /> Create unscheduled</label>
              <label><input type="checkbox" name="notifyCustomer" ${customer.sendNotifications ? 'checked' : ''} disabled /> Notify customer</label>
            </div>
            <label>
              <span>Edit team</span>
              <select name="teamMemberId">
                <option value="">Unassigned</option>
                ${state.teamMembers.map((member) => `<option value="${member.id}">${escapeHtml(member.displayName)}</option>`).join('')}
              </select>
            </label>
            ${customer.doNotService ? statusMessage('This customer is marked do not service. You can create the job, but the schedule save step will be skipped.', 'warning') : '<div class="table-meta">Leave the team blank to keep the job in the Unassigned lane after scheduling.</div>'}
          </section>
        </div>

        <div class="stack-gap-lg">
          <section class="surface-card stack-gap">
            <div class="section-header">
              <h2 class="section-title">Private notes</h2>
              <div class="segmented-pill">
                <span class="is-active">This job</span>
                <span>Customer</span>
              </div>
            </div>
            <label>
              <span>Private notes</span>
              <textarea name="privateNotes" placeholder="Add a private note here"></textarea>
            </label>
          </section>

          <section class="surface-card stack-gap">
            <div class="section-header">
              <h2 class="section-title">Line items</h2>
              <div class="chip-row-inline">
                ${badge('One-time job', 'neutral')}
                ${badge('V1-safe fields only', 'warning')}
              </div>
            </div>
            <label>
              <span>Service summary</span>
              <input name="titleOrServiceSummary" required placeholder="Home Cleaning" />
            </label>
            <div class="form-grid two-columns">
              <label>
                <span>Address</span>
                <select name="customerAddressId" required ${hasAddresses ? '' : 'disabled'}>
                  ${customer.addresses.map((address) => `<option value="${address.id}">${escapeHtml(formatAddress(address))}</option>`).join('')}
                </select>
              </label>
              <label>
                <span>Lead source</span>
                <input name="leadSource" value="${escapeHtml(customer.leadSource || '')}" />
              </label>
            </div>
            ${hasAddresses ? '' : statusMessage('This customer does not have an address yet. Add an address on the customer record before creating a job.', 'warning')}
            <label>
              <span>Tags</span>
              <input name="tags" placeholder="comma separated" value="${escapeHtml((customer.tags || []).join(', '))}" />
            </label>
            <div class="stat-summary-card">
              <div class="stat-row"><span>Subtotal</span><strong>$0.00</strong></div>
              <div class="stat-row"><span>Tax rate</span><strong>$0.00</strong></div>
              <div class="stat-row"><span>Total</span><strong>$0.00</strong></div>
            </div>
            <div class="table-meta">This pass keeps line items as a service-summary-first V1 workflow. Invoicing and billing remain out of scope.</div>
          </section>

          <section class="surface-card stack-gap">
            <div id="new-job-page-status"></div>
            <div class="modal-actions split-actions">
              <div class="inline-actions">
                <a class="button button-ghost" href="${escapeHtml(returnTo || `/app/customers/${customer.id}`)}">Cancel</a>
              </div>
              <div class="inline-actions">
                <button type="submit" class="button button-primary" ${hasAddresses ? '' : 'disabled'}>Save job</button>
              </div>
            </div>
          </section>
        </div>
      </form>
    `,
  });

  document.getElementById('new-job-customer-button').addEventListener('click', () => {
    openCreateCustomerModal({
      onSave(savedCustomer) {
        setFlash('Customer created. Continue building the job.', 'success');
        location.href = buildNewJobUrl({
          customerId: savedCustomer.id,
          pathname: location.pathname,
          search: location.search,
          date: seededDate,
        });
      },
    });
  });
  document.getElementById('new-job-page-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const statusRegion = document.getElementById('new-job-page-status');
    try {
      const payload = jobPayloadFromForm(form);
      const created = await api.createJob(customer.id, payload);

      const skipSchedule = form.querySelector('[name="skipSchedule"]').checked;
      const start = form.querySelector('[name="scheduledStartAt"]').value;
      const end = form.querySelector('[name="scheduledEndAt"]').value;
      const teamMemberId = form.querySelector('[name="teamMemberId"]').value;

      if (!skipSchedule && start && end && !customer.doNotService) {
        await api.scheduleJob(created.id, {
          scheduledStartAt: toIso(start),
          scheduledEndAt: toIso(end),
        });
      }

      if (teamMemberId) {
        await api.assignJob(created.id, teamMemberId);
      }

      setFlash('Job created.', 'success');
      location.href = buildJobUrl(created.id, location.pathname, location.search);
    } catch (error) {
      statusRegion.innerHTML = statusMessage(error.message, 'danger');
    }
  });
}

async function renderJobSchedulePage(jobId) {
  const params = new URLSearchParams(location.search);
  const job = await api.getJob(jobId);
  const focusDate = params.get('date') || formatDayKey(new Date(job.scheduledStartAt || new Date()));
  const [schedule] = await Promise.all([
    api.getScheduleRange(focusDate, focusDate),
  ]);
  const returnTo = getSchedulerContext(location.search);

  renderShell({
    title: `Schedule ${job.jobNumber}`,
    subtitle: `${job.titleOrServiceSummary} • ${job.customer.displayName}`,
    nav: returnTo ? 'scheduler' : 'customers',
    breadcrumbs: [
      '<a href="/app/customers/list">Customers</a>',
      `<a href="${buildCustomerUrl(job.customer.id, location.pathname, location.search)}">${escapeHtml(job.customer.displayName)}</a>`,
      `<a href="${buildJobUrl(job.id, location.pathname, location.search)}">${escapeHtml(job.jobNumber)}</a>`,
      'Schedule',
    ],
    actions: `
      <a class="button button-ghost" href="${escapeHtml(buildJobUrl(job.id, location.pathname, location.search))}">Back to job</a>
      <a class="button button-ghost" href="${escapeHtml(returnTo || '/app/calendar_new')}">${escapeHtml(returnTo ? 'Back to scheduler' : 'Open scheduler')}</a>
    `,
    content: `
      <div class="job-workspace-grid">
        <form id="schedule-route-form" class="surface-card stack-gap">
          <div class="section-header">
            <h2 class="section-title">Schedule a time for job</h2>
            <div class="chip-row-inline">
              ${job.scheduleState === 'scheduled' ? badge('Scheduled', 'success') : badge('Unscheduled', 'warning')}
              ${job.assignee?.displayName ? badge(job.assignee.displayName, 'neutral') : badge('Unassigned', 'warning')}
            </div>
          </div>
          <div class="form-grid two-columns">
            <label>
              <span>From</span>
              <input name="scheduledStartAt" type="datetime-local" value="${job.scheduledStartAt ? escapeHtml(toDateTimeLocal(job.scheduledStartAt)) : `${escapeHtml(focusDate)}T09:00`}" required />
            </label>
            <label>
              <span>To</span>
              <input name="scheduledEndAt" type="datetime-local" value="${job.scheduledEndAt ? escapeHtml(toDateTimeLocal(job.scheduledEndAt)) : `${escapeHtml(focusDate)}T10:00`}" required />
            </label>
          </div>
          <div class="inline-actions check-row">
            <label><input type="checkbox" name="notifyCustomer" ${job.customer.sendNotifications ? 'checked' : ''} disabled /> Notify customer</label>
          </div>
          <label>
            <span>Edit team</span>
            <select name="teamMemberId">
              <option value="">Unassigned</option>
              ${state.teamMembers.map((member) => `<option value="${member.id}" ${job.assigneeTeamMemberId === member.id ? 'selected' : ''}>${escapeHtml(member.displayName)}</option>`).join('')}
            </select>
          </label>
          <div class="profile-grid">
            <div>
              <div class="label">Customer</div>
              <div>${escapeHtml(job.customer.displayName)}</div>
            </div>
            <div>
              <div class="label">Primary phone</div>
              <div>${escapeHtml(job.customer.primaryPhone || 'None')}</div>
            </div>
            <div>
              <div class="label">Address</div>
              <div>${escapeHtml(formatAddress(job.address) || 'No address')}</div>
            </div>
            <div>
              <div class="label">Service summary</div>
              <div>${escapeHtml(job.titleOrServiceSummary)}</div>
            </div>
          </div>
          ${job.customer.doNotService ? statusMessage('This customer is marked do not service. Scheduling save is blocked, but assignment changes remain allowed.', 'warning') : '<div class="table-meta">Scheduling and assignment remain separate in V1. Saving here can update one or both.</div>'}
          <div id="schedule-route-status"></div>
          <div class="modal-actions split-actions">
            <div class="inline-actions">
              ${job.scheduleState === 'scheduled' ? '<button type="button" class="button button-danger" id="schedule-route-unschedule">Unschedule</button>' : ''}
            </div>
            <div class="inline-actions">
              <a class="button button-ghost" href="${escapeHtml(buildJobUrl(job.id, location.pathname, location.search))}">Cancel</a>
              <button type="submit" class="button button-primary">Save</button>
            </div>
          </div>
        </form>

        <section class="surface-card stack-gap scheduler-embedded-panel">
          <div class="section-header">
            <h2 class="section-title">Day board</h2>
            <div class="inline-actions">
              <a class="button button-small button-ghost" href="${buildDayUrl(focusDate)}">Open full day</a>
            </div>
          </div>
          <div class="table-meta">Place this visit with the live day context visible. The focused day is ${escapeHtml(shortDayLabel(focusDate))}.</div>
          ${renderDaySchedulerView(focusDate, schedule, '')}
        </section>
      </div>
    `,
  });

  bindSchedulerQuickActions();

  document.getElementById('schedule-route-unschedule')?.addEventListener('click', async () => {
    if (!confirm('Undo the current schedule for this job?')) return;
    try {
      await api.unscheduleJob(job.id);
      setFlash('Job unscheduled.', 'success');
      location.href = buildJobUrl(job.id, location.pathname, location.search);
    } catch (error) {
      document.getElementById('schedule-route-status').innerHTML = statusMessage(error.message, 'danger');
    }
  });

  document.getElementById('schedule-route-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const statusRegion = document.getElementById('schedule-route-status');
    try {
      const start = form.querySelector('[name="scheduledStartAt"]').value;
      const end = form.querySelector('[name="scheduledEndAt"]').value;
      const teamMemberId = form.querySelector('[name="teamMemberId"]').value;

      if (!job.customer.doNotService) {
        await api.scheduleJob(job.id, {
          scheduledStartAt: toIso(start),
          scheduledEndAt: toIso(end),
        });
      }

      if (teamMemberId) {
        await api.assignJob(job.id, teamMemberId);
      } else if (job.assigneeTeamMemberId) {
        await api.unassignJob(job.id);
      }

      setFlash('Schedule updated.', 'success');
      location.href = buildJobUrl(job.id, location.pathname, location.search);
    } catch (error) {
      statusRegion.innerHTML = statusMessage(error.message, 'danger');
    }
  });
}

async function renderJobDetailPage(jobId) {
  const job = await api.getJob(jobId);
  const customer = await api.getCustomer(job.customer.id);
  const schedulerContext = getSchedulerContext(location.search);
  const returnLabel = schedulerContext ? 'Back to scheduler' : 'Back to customer';
  const returnHref = schedulerContext || `/app/customers/${job.customer.id}`;
  renderShell({
    title: `${job.jobNumber} • ${job.titleOrServiceSummary}`,
    subtitle: `${job.scheduleState === 'scheduled' ? 'Scheduled' : 'Unscheduled'} • ${job.assignee?.displayName || 'Unassigned'}`,
    nav: schedulerContext ? 'scheduler' : 'customers',
    breadcrumbs: [
      `<a href="/app/customers/list">Customers</a>`,
      `<a href="${buildCustomerUrl(job.customer.id, location.pathname, location.search)}">${escapeHtml(job.customer.displayName)}</a>`,
      escapeHtml(job.jobNumber),
    ],
    actions: `
      <button class="button" id="edit-job-button">Edit job</button>
      <a class="button button-primary" id="schedule-job-button" href="${buildJobScheduleUrl(job.id, location.pathname, location.search)}">${job.scheduleState === 'scheduled' ? 'Reschedule' : 'Schedule'}</a>
      <button class="button" id="edit-team-button">${job.assignmentState === 'assigned' ? 'Reassign' : 'Assign'}</button>
      <button class="button button-danger" id="unschedule-job-button" ${job.scheduleState === 'scheduled' ? '' : 'disabled'}>Unschedule</button>
      <a class="button button-ghost" href="${escapeHtml(returnHref)}">${escapeHtml(returnLabel)}</a>
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
                ${job.customer.doNotService ? badge('Do not service', 'danger') : ''}
              </div>
            </div>
            <div class="profile-grid">
              <div>
                <div class="label">Customer</div>
                <div><a href="${buildCustomerUrl(job.customer.id, location.pathname, location.search)}">${escapeHtml(job.customer.displayName)}</a></div>
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
            <div class="section-header">
              <h2 class="section-title">Schedule and assignment</h2>
              <div class="chip-row-inline">
                ${job.scheduleState === 'scheduled' ? badge('Visit placed', 'success') : badge('Needs schedule', 'warning')}
                ${job.assignee ? badge('Team set', 'success') : badge('Needs team', 'warning')}
              </div>
            </div>
            <div class="status-panel-grid">
              <div class="status-panel">
                <div class="label">Schedule state</div>
                <strong>${job.scheduleState === 'scheduled' ? escapeHtml(formatDateRange(job.scheduledStartAt, job.scheduledEndAt)) : 'Unscheduled'}</strong>
                <div class="table-meta">${job.scheduleState === 'scheduled' ? 'Use Reschedule to move the visit without leaving this page.' : 'Schedule this one-time job to place it on the calendar.'}</div>
              </div>
              <div class="status-panel">
                <div class="label">Assignee</div>
                <strong>${escapeHtml(job.assignee?.displayName || 'Unassigned')}</strong>
                <div class="table-meta">${job.assignee ? 'Assignment is independent from scheduling in V1.' : 'You can keep the job scheduled while still unassigned.'}</div>
              </div>
            </div>
            <div class="inline-actions">
              <a class="button button-primary" id="schedule-job-inline-button" href="${buildJobScheduleUrl(job.id, location.pathname, location.search)}">${job.scheduleState === 'scheduled' ? 'Reschedule visit' : 'Schedule visit'}</a>
              <button class="button" id="edit-team-inline-button">${job.assignmentState === 'assigned' ? 'Change team' : 'Assign team'}</button>
              ${job.assignmentState === 'assigned' ? '<button class="button button-ghost" id="unassign-job-inline-button">Set unassigned</button>' : ''}
            </div>
            ${job.customer.doNotService ? statusMessage('This customer is flagged as do not service, so scheduling remains blocked in V1.', 'warning') : ''}
          </div>
        </div>
        <aside class="stack-gap-lg">
          <div class="surface-card stack-gap">
            <h2 class="section-title">Next step</h2>
            <p class="muted">${escapeHtml(job.scheduleState === 'scheduled'
              ? (job.assignee ? 'This visit is placed and staffed. Use the scheduler for day, week, or month coordination.' : 'This visit is on the calendar but still needs a team assignment.')
              : 'This job is still unscheduled. Place it on the calendar, then adjust assignment if needed.')}</p>
            <div class="inline-actions">
              <a class="button button-ghost" href="${buildCustomerUrl(job.customer.id, location.pathname, location.search)}">Customer record</a>
              <a class="button button-ghost" href="${escapeHtml(schedulerContext || '/app/calendar_new')}">Scheduler</a>
            </div>
          </div>
          <div class="surface-card stack-gap">
            <h2 class="section-title">Operational context</h2>
            <div class="stat-row"><span>Primary phone</span><strong>${escapeHtml(job.customer.primaryPhone || job.customer.phones?.[0]?.value || 'None')}</strong></div>
            <div class="stat-row"><span>Address</span><strong>${escapeHtml(formatAddress(job.address) || 'No address')}</strong></div>
            <div class="stat-row"><span>Last updated</span><strong>${escapeHtml(formatDateTime(job.updatedAt))}</strong></div>
          </div>
        </aside>
      </section>
    `,
  });

  document.getElementById('edit-job-button').addEventListener('click', () => openEditJobModal(job, customer));
  document.getElementById('edit-team-button').addEventListener('click', () => openTeamModal(job));
  document.getElementById('edit-team-inline-button').addEventListener('click', () => openTeamModal(job));
  document.getElementById('unassign-job-inline-button')?.addEventListener('click', async () => {
    try {
      await api.unassignJob(job.id);
      setFlash('Assignment updated.', 'success');
      location.reload();
    } catch (error) {
      showTransientPageNotice(error.message, 'danger');
    }
  });
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
  const filter = params.get('filter') || '';
  const range = viewRange(view, date);
  const [schedule, unscheduledJobs] = await Promise.all([
    api.getScheduleRange(range.startDate, range.endDate),
    api.listJobs({ scheduleState: 'unscheduled' }),
  ]);
  const filteredSchedule = filterSchedule(schedule, filter);
  const filteredUnscheduledJobs = filterJobs(unscheduledJobs, filter);
  const rangeLabel = formatRangeLabel(view, date);
  const summary = summarizeSchedule(filteredSchedule, range.startDate, range.endDate);

  renderShell({
    title: 'Scheduler',
    subtitle: `One-time jobs only. ${rangeLabel}`,
    nav: 'scheduler',
    breadcrumbs: [escapeHtml('Scheduler')],
    actions: `
      <div class="scheduler-actions">
        <a class="button button-primary" href="${buildNewJobUrl({ pathname: location.pathname, search: location.search, date })}">New job</a>
        <div class="view-switcher">
          ${schedulerViewButton('day', view, date, filter)}
          ${schedulerViewButton('week', view, date, filter)}
          ${schedulerViewButton('month', view, date, filter)}
        </div>
      </div>
    `,
    content: `
      <section class="surface-card stack-gap-lg scheduler-surface">
        <div class="scheduler-context-bar">
          <div class="context-primary">
            <div class="range-pill range-pill-strong">${escapeHtml(rangeLabel)}</div>
            <div class="context-meta">Focused ${escapeHtml(shortDayLabel(date))} in ${escapeHtml(capitalize(view))} view</div>
          </div>
          <div class="context-stats">
            <div class="context-stat"><span>Jobs in range</span><strong>${summary.totalJobs}</strong></div>
            <div class="context-stat"><span>Unassigned</span><strong>${summary.unassignedJobs}</strong></div>
            <div class="context-stat"><span>Active days</span><strong>${summary.daysWithJobs}</strong></div>
          </div>
        </div>
        <div class="toolbar toolbar-between scheduler-toolbar">
          <div class="inline-actions">
            <a class="button" href="${buildSchedulerUrl({ view, date: stepAnchorDay(view, date, -1), filter })}">Previous</a>
            <a class="button" href="${buildSchedulerUrl({ view, date: localToday(), filter })}">Today</a>
            <a class="button" href="${buildSchedulerUrl({ view, date: stepAnchorDay(view, date, 1), filter })}">Next</a>
          </div>
          <form id="scheduler-jump-form" class="inline-actions compact-form">
            <label>
              <span class="label-inline">Focus date</span>
              <input type="date" name="date" value="${escapeHtml(date)}" />
            </label>
            <input type="hidden" name="view" value="${escapeHtml(view)}" />
            <input type="hidden" name="filter" value="${escapeHtml(filter)}" />
            <button class="button button-primary" type="submit">Go</button>
          </form>
        </div>
        <div class="scheduler-layout">
          <aside class="scheduler-rail">
            <div class="rail-card stack-gap">
              <h2 class="section-title">Scheduler focus</h2>
              <div class="rail-focus-date">${escapeHtml(formatRangeLabel('day', date))}</div>
              <div class="rail-copy">Drill into day view, scan the range, or filter by customer, service, or tag.</div>
              <a class="button button-primary" href="${buildDayUrl(date, filter)}">Open focused day</a>
            </div>
            <div class="rail-card stack-gap">
              <h2 class="section-title">Filter by name or tag</h2>
              <form id="scheduler-filter-form" class="stack-gap compact-form">
                <label>
                  <span class="label-inline">Filter</span>
                  <input name="filter" value="${escapeHtml(filter)}" placeholder="Customer, service, or tag" />
                </label>
                <input type="hidden" name="view" value="${escapeHtml(view)}" />
                <input type="hidden" name="date" value="${escapeHtml(date)}" />
                <div class="inline-actions">
                  <button class="button button-primary" type="submit">Apply</button>
                  ${filter ? `<a class="button button-ghost" href="${buildSchedulerUrl({ view, date })}">Clear</a>` : ''}
                </div>
              </form>
            </div>
            <div class="rail-card stack-gap">
              <h2 class="section-title">Range guide</h2>
              ${renderRangeGuide(view, date, filteredSchedule, filter)}
            </div>
            <div class="rail-card stack-gap">
              <h2 class="section-title">Needs scheduling</h2>
              ${renderSchedulerBacklog(filteredUnscheduledJobs, {
                emptyTitle: 'No unscheduled jobs',
                emptyBody: filter ? 'Nothing in the unscheduled queue matches this filter.' : 'Every current V1 job has a schedule.',
                actionLabel: 'Schedule',
              })}
            </div>
            <div class="rail-card stack-gap">
              <h2 class="section-title">Needs assignment in range</h2>
              ${renderSchedulerBacklog(filteredSchedule.jobs.filter((job) => !job.assigneeTeamMemberId), {
                emptyTitle: 'No unassigned scheduled jobs',
                emptyBody: filter ? 'Nothing in this range matches the filter.' : 'All scheduled jobs in range already have a team.',
                actionLabel: 'Assign',
                sourceView: view,
                sourceDate: date,
                sourceFilter: filter,
              })}
            </div>
          </aside>
          <div class="scheduler-main">
            ${summary.totalJobs === 0 ? statusMessage(filter ? 'No jobs match the current filter in this range.' : 'No jobs are scheduled in this range yet.', 'warning') : ''}
            <div id="scheduler-region">${renderSchedulerView({ view, date, schedule: filteredSchedule, filter })}</div>
          </div>
        </div>
      </section>
    `,
  });

  document.getElementById('scheduler-jump-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    location.href = buildSchedulerUrl({ view: form.get('view'), date: form.get('date'), filter: form.get('filter') });
  });

  document.getElementById('scheduler-filter-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    location.href = buildSchedulerUrl({ view: form.get('view'), date: form.get('date'), filter: form.get('filter') });
  });

  bindSchedulerQuickActions();
}

function renderSchedulerView({ view, date, schedule, filter }) {
  if (view === 'day') {
    return renderDaySchedulerView(date, schedule, filter);
  }
  if (view === 'week') {
    return renderWeekSchedulerView(date, schedule, filter);
  }
  return renderMonthSchedulerView(date, schedule, filter);
}

function renderDaySchedulerView(date, schedule, filter) {
  const jobsByLane = new Map(schedule.lanes.map((lane) => [lane.id, []]));
  for (const job of schedule.jobs) {
    if (jobDayKeys(job, date, date).includes(date)) {
      const laneId = job.assigneeTeamMemberId || 'unassigned';
      jobsByLane.get(laneId)?.push(job);
    }
  }

  return `
    <div class="lane-board">
      ${schedule.lanes.map((lane) => {
        const laneJobs = (jobsByLane.get(lane.id) || []).sort(compareJobs);
        return `
          <section class="lane-column ${lane.id === 'unassigned' ? 'lane-column-unassigned' : ''}">
            <div class="lane-header">
              <div>
                <h3>${escapeHtml(lane.label)}</h3>
                <p>${lane.id === 'unassigned' ? 'Scheduled work waiting for team assignment.' : 'Scheduled work assigned to this team member.'}</p>
              </div>
              ${lane.initials ? `<span class="lane-avatar">${escapeHtml(lane.initials)}</span>` : badge('Unassigned lane', 'warning')}
            </div>
            <div class="lane-summary">
              <span>${laneJobs.length} job${laneJobs.length === 1 ? '' : 's'}</span>
              ${lane.id === 'unassigned' ? '<span>Assign from the card or job page</span>' : '<span>Open any job for full detail</span>'}
            </div>
            <div class="lane-body">
              ${laneJobs.length ? laneJobs.map((job) => schedulerCard(job, { view: 'day', filter })).join('') : `<div class="empty-lane">No scheduled jobs in this lane for the focused day.</div>`}
            </div>
          </section>
        `;
      }).join('')}
    </div>
  `;
}

function renderWeekSchedulerView(date, schedule, filter) {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const days = listDays(start, end);
  const jobsByDay = groupJobsByDay(schedule.jobs, start, end);

  return `
    <div class="week-grid">
      ${days.map((day) => {
        const dayJobs = (jobsByDay.get(day) || []).sort(compareJobs);
        const daySummary = summarizeDayJobs(dayJobs);
        return `
          <section class="week-column ${day === localToday() ? 'is-today' : ''} ${day === date ? 'is-focused-day' : ''}">
            <div class="week-header week-header-strong">
              <div>
                <div class="week-weekday">${escapeHtml(weekdayLabel(day))}</div>
                <div class="week-date">${escapeHtml(shortDayLabel(day))}</div>
              </div>
              <a class="button button-small button-ghost" href="${buildDayUrl(day, filter)}">Open day</a>
            </div>
            <div class="week-summary-row">
              <span>${daySummary.total} job${daySummary.total === 1 ? '' : 's'}</span>
              <span>${daySummary.unassigned} unassigned</span>
            </div>
            <div class="week-body">
              ${dayJobs.length ? dayJobs.slice(0, 4).map((job) => schedulerCard(job, { compact: true, view: 'week', filter })).join('') : `<div class="empty-lane">No jobs on this day</div>`}
              ${dayJobs.length > 4 ? `<a class="more-link" href="${buildDayUrl(day, filter)}">Open day to view ${dayJobs.length - 4} more</a>` : ''}
            </div>
          </section>
        `;
      }).join('')}
    </div>
  `;
}

function renderMonthSchedulerView(date, schedule, filter) {
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
        const daySummary = summarizeDayJobs(dayJobs);
        return `
          <section class="month-cell ${day.startsWith(activeMonth) ? '' : 'is-muted-month'} ${day === localToday() ? 'is-today' : ''} ${day === date ? 'is-focused-day' : ''}">
            <div class="month-day-top">
              <a class="month-day-link" href="${buildDayUrl(day, filter)}"><strong>${parseDayKey(day).getDate()}</strong></a>
              <span>${daySummary.total ? `${daySummary.total} job${daySummary.total === 1 ? '' : 's'}` : 'Open day'}</span>
            </div>
            <div class="month-day-summary ${daySummary.unassigned ? 'has-unassigned' : ''}">
              <span>${daySummary.unassigned ? `${daySummary.unassigned} unassigned` : 'All assigned or empty'}</span>
            </div>
            <div class="month-day-body">
              ${dayJobs.length ? dayJobs.slice(0, 2).map((job) => schedulerCard(job, { compact: true, month: true, filter })).join('') : '<div class="empty-lane">No jobs</div>'}
              ${dayJobs.length > 2 ? `<a class="more-link" href="${buildDayUrl(day, filter)}">Open day to view ${dayJobs.length - 2} more</a>` : ''}
            </div>
          </section>
        `;
      }).join('')}
    </div>
  `;
}

function renderRangeGuide(view, date, schedule, filter = '') {
  const range = viewRange(view, date);
  const days = listDays(range.startDate, range.endDate);
  const jobsByDay = groupJobsByDay(schedule.jobs, range.startDate, range.endDate);
  return `
    <div class="range-guide-list">
      ${days.slice(0, view === 'month' ? 14 : days.length).map((day) => {
        const dayJobs = jobsByDay.get(day) || [];
        return `
          <a class="range-guide-row ${day === date ? 'is-active' : ''}" href="${buildDayUrl(day, filter)}">
            <span>${escapeHtml(shortDayLabel(day))}</span>
            <strong>${dayJobs.length}</strong>
          </a>
        `;
      }).join('')}
      ${view === 'month' && days.length > 14 ? '<div class="table-meta">Open any month cell to drill into the day.</div>' : ''}
    </div>
  `;
}

function filterSchedule(schedule, rawFilter) {
  const filter = String(rawFilter || '').trim().toLowerCase();
  if (!filter) return schedule;
  const jobs = filterJobs(schedule.jobs, filter);
  return { ...schedule, jobs };
}

function renderSchedulerBacklog(jobs, options = {}) {
  if (!jobs.length) {
    return emptyState(options.emptyTitle || 'Nothing here', options.emptyBody || 'No jobs match the current view.');
  }

  return `
    <div class="scheduler-backlog-list">
      ${jobs.slice(0, 6).map((job) => `
        <article class="backlog-card ${!job.assigneeTeamMemberId ? 'backlog-card-warning' : ''}">
          <div class="scheduler-card-top">
            <a class="scheduler-card-link scheduler-card-main-link" href="${buildJobUrl(job.id, location.pathname, location.search)}"><strong>${escapeHtml(job.jobNumber)}</strong></a>
            ${job.scheduleState === 'scheduled'
              ? `<span class="time-pill">${escapeHtml(formatTime(job.scheduledStartAt))} to ${escapeHtml(formatTime(job.scheduledEndAt))}</span>`
              : badge('Unscheduled', 'warning')}
          </div>
          <div class="scheduler-card-title">${escapeHtml(job.titleOrServiceSummary)}</div>
          <div class="scheduler-card-meta">${escapeHtml(job.customer?.displayName || 'Unknown customer')}</div>
          <div class="scheduler-card-meta">${escapeHtml(formatAddress(job.address) || 'No address')}</div>
          <div class="scheduler-card-actions compact">
            <a class="button button-small button-ghost" href="${buildJobUrl(job.id, location.pathname, location.search)}">Open</a>
            ${options.actionLabel === 'Assign'
              ? `<button class="button button-small" data-action="assign" data-job-id="${job.id}">Assign</button>`
              : `<a class="button button-small" href="${buildJobScheduleUrl(job.id, location.pathname, location.search)}">${escapeHtml(options.actionLabel || 'Schedule')}</a>`}
          </div>
        </article>
      `).join('')}
      ${jobs.length > 6 ? `<div class="table-meta">Showing 6 of ${jobs.length} matching jobs. Open a record for the full workflow.</div>` : ''}
    </div>
  `;
}

function summarizeSchedule(schedule, start, end) {
  const activeDays = new Set();
  for (const job of schedule.jobs) {
    for (const day of jobDayKeys(job, start, end)) {
      activeDays.add(day);
    }
  }
  return {
    totalJobs: schedule.jobs.length,
    unassignedJobs: schedule.jobs.filter((job) => !job.assigneeTeamMemberId).length,
    daysWithJobs: activeDays.size,
  };
}

function filterJobs(jobs, rawFilter) {
  const filter = String(rawFilter || '').trim().toLowerCase();
  if (!filter) return jobs;
  return jobs.filter((job) => [
    job.jobNumber,
    job.titleOrServiceSummary,
    job.customer?.displayName,
    job.customer?.primaryPhone,
    job.assignmentLabel,
    job.assignee?.displayName,
    job.leadSource,
    formatAddress(job.address),
    ...(job.tags || []),
    ...(job.customer?.tags || []),
  ].filter(Boolean).join(' ').toLowerCase().includes(filter));
}

function summarizeDayJobs(jobs) {
  return {
    total: jobs.length,
    unassigned: jobs.filter((job) => !job.assigneeTeamMemberId).length,
  };
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
    <article class="scheduler-card ${options.compact ? 'compact' : ''} ${!job.assigneeTeamMemberId ? 'scheduler-card-unassigned' : ''}">
      <div class="scheduler-card-top">
        <a class="scheduler-card-link scheduler-card-main-link" href="${buildJobUrl(job.id, location.pathname, location.search)}"><strong>${escapeHtml(job.jobNumber)}</strong></a>
        <div class="chip-row-inline">
          <span class="time-pill">${escapeHtml(formatTime(job.scheduledStartAt))} to ${escapeHtml(formatTime(job.scheduledEndAt))}</span>
          ${job.assigneeTeamMemberId ? badge(job.assignmentLabel, 'neutral') : badge('Unassigned', 'warning')}
        </div>
      </div>
      <div class="scheduler-card-body">
        <div class="scheduler-card-title">${escapeHtml(job.titleOrServiceSummary)}</div>
        <div class="scheduler-card-meta-row">
          <span class="scheduler-card-meta strong">${escapeHtml(job.customer?.displayName || 'Unknown customer')}</span>
          <span class="scheduler-card-meta">${escapeHtml(options.view === 'month' ? shortDayLabel(formatDayKey(new Date(job.scheduledStartAt))) : formatDurationMinutes(job.scheduledStartAt, job.scheduledEndAt))}</span>
        </div>
        <div class="scheduler-card-meta-row">
          <span class="scheduler-card-meta">${escapeHtml(formatAddress(job.address) || 'No address')}</span>
          <span class="scheduler-card-meta">${escapeHtml(job.customer?.primaryPhone || 'No phone')}</span>
        </div>
        <div class="scheduler-card-meta-row">
          <span class="scheduler-card-meta">${escapeHtml(job.assigneeTeamMemberId ? 'Assigned and ready' : 'Needs assignment')}</span>
          <span class="scheduler-card-meta">${escapeHtml(job.customer?.doNotService ? 'Customer blocked for new scheduling' : 'Open job or customer from here')}</span>
        </div>
        ${!options.compact && (job.tags?.length || job.customer?.tags?.length) ? `
          <div class="chip-row-inline">
            ${(job.tags || []).slice(0, 2).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')}
            ${(job.customer?.tags || []).slice(0, 2).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="scheduler-card-actions ${options.compact ? 'compact' : ''}">
        <a class="button button-small button-ghost" href="${buildJobUrl(job.id, location.pathname, location.search)}">Open</a>
        <a class="button button-small button-ghost" href="${buildCustomerUrl(job.customer?.id, location.pathname, location.search)}">Customer</a>
        <a class="button button-small" href="${buildJobScheduleUrl(job.id, location.pathname, location.search)}">${job.scheduleState === 'scheduled' ? 'Reschedule' : 'Schedule'}</a>
        <button class="button button-small" data-action="assign" data-job-id="${job.id}">${job.assigneeTeamMemberId ? 'Reassign' : 'Assign'}</button>
        ${job.assigneeTeamMemberId ? `<button class="button button-small button-ghost" data-action="unassign" data-job-id="${job.id}">Set unassigned</button>` : ''}
        ${job.scheduleState === 'scheduled' ? `<button class="button button-small button-danger" data-action="unschedule" data-job-id="${job.id}">Unschedule</button>` : ''}
      </div>
    </article>
  `;
}

function bindSchedulerQuickActions() {
  for (const button of document.querySelectorAll('[data-action][data-job-id]')) {
    button.addEventListener('click', async (event) => {
      const { action, jobId } = event.currentTarget.dataset;
      const job = await api.getJob(jobId);
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
        if (!confirm('Undo the current schedule for this job from the calendar?')) return;
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

function openCreateCustomerModal(options = {}) {
  openCustomerFormModal({ mode: 'create', ...options });
}

function openCustomerFormModal({ mode, customer = null, onSave = null }) {
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
      if (typeof onSave === 'function') {
        onSave(saved);
        return;
      }
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
      location.href = buildJobUrl(job.id, location.pathname, location.search);
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
          <span>Find team member</span>
          <input id="team-member-search" placeholder="Search active team members" />
        </label>
        <label>
          <span>Active team member</span>
          <select name="teamMemberId" id="team-member-select">
            ${state.teamMembers.map((member) => `<option value="${member.id}" ${job.assigneeTeamMemberId === member.id ? 'selected' : ''}>${escapeHtml(member.displayName)}</option>`).join('')}
          </select>
        </label>
        <div class="table-meta">Only active team members are available in V1. Use Set unassigned to move this job back to the Unassigned lane.</div>
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

  const searchInput = document.getElementById('team-member-search');
  const select = document.getElementById('team-member-select');
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    for (const option of select.options) {
      option.hidden = query ? !option.textContent.toLowerCase().includes(query) : false;
    }
    const firstVisible = [...select.options].find((option) => !option.hidden);
    if (firstVisible && select.options[select.selectedIndex]?.hidden) {
      select.value = firstVisible.value;
    }
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

function schedulerViewButton(targetView, activeView, date, filter = '') {
  return `<a class="button ${targetView === activeView ? 'button-primary' : ''}" href="${buildSchedulerUrl({ view: targetView, date, filter })}">${escapeHtml(capitalize(targetView))}</a>`;
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

function formatDurationMinutes(startAt, endAt) {
  const minutes = Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
