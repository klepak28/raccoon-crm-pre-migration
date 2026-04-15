import { api } from './api.js';
import {
  addDays,
  formatDateRange,
  formatDateTime,
  formatDayKey,
  formatCompactDayLabel,
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
  globalNewMenuCleanup: null,
  schedulerFilterCleanup: null,
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

  if (pathname === '/app/settings') {
    await renderSettingsPage();
    return;
  }

  if (pathname === '/app/jobs/new') {
    await renderNewJobPage();
    return;
  }

  if (pathname === '/app/recurring_jobs/new') {
    await renderNewRecurringJobPage();
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

function renderShell({ title, subtitle = '', nav = 'customers', breadcrumbs = [], actions = '', content = '', showHero = true }) {
  const flashHtml = state.flash ? statusMessage(state.flash.message, state.flash.tone) : '';
  state.flash = null;
  const globalNewJobHref = buildGlobalNewJobHref();

  state.schedulerFilterCleanup?.();
  state.schedulerFilterCleanup = null;

  app.innerHTML = `
    <div class="shell">
      <header class="app-topbar page-frame">
        <div class="app-topbar-left">
          <div>
            <div class="brand-kicker">CRM Prototype</div>
            <div class="app-brand">V1 Operations</div>
          </div>
          <nav class="top-nav">
            <button class="top-nav-link" type="button" data-shell-action="home">Home</button>
            <button class="top-nav-link" type="button" data-shell-action="inbox">Inbox</button>
            <a class="top-nav-link ${nav === 'scheduler' ? 'active' : ''}" href="/app/calendar_new">Schedule</a>
            <a class="top-nav-link ${nav === 'customers' ? 'active' : ''}" href="/app/customers/list">Customers</a>
          </nav>
        </div>
        <div class="app-topbar-right">
          <button class="search-pill" type="button" data-shell-action="search">Search</button>
          <div class="new-menu-shell">
            <button class="button button-primary" id="global-new-toggle" type="button">New</button>
            <div class="new-menu-panel" id="global-new-menu" hidden>
              <a class="new-menu-item" href="${escapeHtml(globalNewJobHref)}" data-new-action="job">
                <strong>Job</strong>
                <span>Create a one-time job</span>
              </a>
              <a class="new-menu-item" href="/app/recurring_jobs/new" data-new-action="recurring">
                <strong>Recurring job</strong>
                <span>Create a recurring job series</span>
              </a>
              <button class="new-menu-item" type="button" data-new-action="estimate">
                <strong>Estimate</strong>
                <span>Unsupported in V1</span>
              </button>
              <button class="new-menu-item" type="button" data-new-action="event">
                <strong>Event</strong>
                <span>Unsupported in V1</span>
              </button>
            </div>
          </div>
          <button class="icon-button" type="button" data-shell-action="notifications" aria-label="Notifications">🔔</button>
          <a class="icon-button" href="/app/settings" aria-label="Settings">⚙</a>
          <div class="avatar-pill">AI</div>
        </div>
      </header>
      <main class="main-column">
        ${showHero ? `
        <header class="page-frame top-frame hero-frame">
          <div class="page-frame-main">
            <div class="breadcrumbs">${breadcrumbs.length ? breadcrumbs.join('<span> / </span>') : ''}</div>
            <div class="page-eyebrow">${nav === 'scheduler' ? 'Scheduler' : 'Customers'}</div>
            <h1>${escapeHtml(title)}</h1>
            ${subtitle ? `<p class="page-subtitle">${escapeHtml(subtitle)}</p>` : ''}
          </div>
          ${actions ? `<div class="page-actions shell-actions">${actions}</div>` : ''}
        </header>` : ''}
        ${flashHtml}
        <div id="page-content">${content}</div>
        <div id="modal-root"></div>
      </main>
    </div>
  `;

  bindShellChrome();
  bindGlobalNewMenu();
}

function bindShellChrome() {
  for (const button of document.querySelectorAll('[data-shell-action]')) {
    button.addEventListener('click', () => {
      const action = button.dataset.shellAction;
      showTransientPageNotice(`${capitalize(action)} is visible in the target shell, but remains outside the supported V1 scope.`, 'warning');
    });
  }
}

function getActiveTeamMembers() {
  return state.teamMembers.filter((member) => member.activeOnSchedule !== false);
}

function buildGlobalNewJobHref() {
  const params = new URLSearchParams(location.search);
  const date = location.pathname === '/app/calendar_new' ? params.get('date') || localToday() : '';
  return buildNewJobUrl({ pathname: location.pathname, search: location.search, date });
}

function bindGlobalNewMenu() {
  const toggle = document.getElementById('global-new-toggle');
  const panel = document.getElementById('global-new-menu');
  if (!toggle || !panel) return;

  state.globalNewMenuCleanup?.();

  panel.hidden = true;

  const hidePanel = () => {
    panel.hidden = true;
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    panel.hidden = !panel.hidden;
  });

  panel.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  const handleDocumentClick = () => hidePanel();
  const handleDocumentKeydown = (event) => {
    if (event.key === 'Escape') hidePanel();
  };

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);

  for (const item of panel.querySelectorAll('[data-new-action]')) {
    item.addEventListener('click', (event) => {
      const action = event.currentTarget.dataset.newAction;
      if (action === 'job' || action === 'recurring') {
        hidePanel();
        return;
      }

      event.preventDefault();
      hidePanel();
      showTransientPageNotice(`${capitalize(action)} is visible from the global New menu, but remains unsupported in V1.`, 'warning');
    });
  }

  state.globalNewMenuCleanup = () => {
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleDocumentKeydown);
  };
}

function bindSchedulerFilterMenu({ view, date, filter, selectedLaneIds, scale }) {
  const toggle = document.getElementById('scheduler-filter-toggle');
  const panel = document.getElementById('scheduler-filter-panel');
  const form = document.getElementById('scheduler-filter-menu-form');
  const resetButton = document.getElementById('scheduler-filter-reset');
  if (!toggle || !panel || !form || !resetButton) return;

  state.schedulerFilterCleanup?.();

  panel.hidden = true;

  const hidePanel = () => {
    panel.hidden = true;
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      form.elements.filter?.focus();
      form.elements.filter?.select?.();
    }
  });

  panel.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    location.href = buildSchedulerUrl({ view, date, filter: values.get('filter'), lanes: selectedLaneIds, scale });
  });

  resetButton.addEventListener('click', () => {
    location.href = buildSchedulerUrl({ view, date, lanes: selectedLaneIds, scale });
  });

  const handleDocumentClick = () => hidePanel();
  const handleDocumentKeydown = (event) => {
    if (event.key === 'Escape') hidePanel();
  };

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);

  state.schedulerFilterCleanup = () => {
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleDocumentKeydown);
  };
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

async function renderSettingsPage() {
  state.teamMembers = await api.listTeamMembers();
  const teamMembers = state.teamMembers;
  const activeCount = teamMembers.filter((member) => member.activeOnSchedule !== false).length;

  renderShell({
    title: 'Settings',
    subtitle: 'Employees and team colors used by the scheduler.',
    nav: 'scheduler',
    breadcrumbs: ['<a href="/app/calendar_new">Scheduler</a>', 'Settings'],
    content: `
      <section class="settings-layout">
        <aside class="surface-card settings-sidebar stack-gap">
          <div>
            <div class="brand-kicker">Settings</div>
            <h2 class="section-title">Company settings</h2>
          </div>
          <div class="settings-nav">
            <button class="settings-nav-item" type="button" data-shell-action="company profile">Company profile</button>
            <button class="settings-nav-item is-active" type="button">Employees</button>
            <button class="settings-nav-item" type="button" data-shell-action="service list">Services</button>
            <button class="settings-nav-item" type="button" data-shell-action="products">Products</button>
            <button class="settings-nav-item" type="button" data-shell-action="quotes">Quotes</button>
          </div>
        </aside>

        <div class="settings-main stack-gap-lg">
          <section class="surface-card settings-hero stack-gap-lg">
            <div class="section-header settings-hero-header">
              <div>
                <div class="page-eyebrow">Settings / Employees</div>
                <h2 class="section-title">Employees</h2>
                <p class="section-copy">Create the teams that appear in scheduler columns, assignment pickers, and colored calendar events.</p>
              </div>
              <div class="inline-actions">
                <button class="button button-primary" id="create-team-button">Add employee</button>
              </div>
            </div>
            <div class="settings-summary-grid">
              <article class="settings-summary-card">
                <span>Total teams</span>
                <strong>${teamMembers.length}</strong>
              </article>
              <article class="settings-summary-card">
                <span>Active on schedule</span>
                <strong>${activeCount}</strong>
              </article>
              <article class="settings-summary-card">
                <span>Color-coded calendar</span>
                <strong>On</strong>
              </article>
            </div>
          </section>

          <section class="surface-card stack-gap-lg settings-employees-card">
            <div class="section-header">
              <div>
                <h2 class="section-title">Team members</h2>
                <p class="section-copy">These teams power scheduler lanes and assignment dropdowns.</p>
              </div>
              <div class="chip-row-inline">
                ${badge(`${activeCount} active`, 'success')}
              </div>
            </div>
            <div id="team-members-region"></div>
          </section>
        </div>
      </section>
    `,
  });

  const renderTeamMembers = () => {
    const region = document.getElementById('team-members-region');
    if (!teamMembers.length) {
      region.innerHTML = emptyState(
        'No teams yet',
        'Create the first scheduler team, assign it a color, and it will appear in the calendar immediately.',
        '<button class="button button-primary" id="empty-create-team-button">Add team</button>',
      );
      document.getElementById('empty-create-team-button')?.addEventListener('click', () => openTeamMemberModal({ mode: 'create' }));
      return;
    }

    region.innerHTML = `
      <div class="settings-employees-list">
        ${teamMembers.map((member) => `
          <article class="settings-employee-row">
            <div class="settings-employee-main">
              <span class="settings-employee-avatar" style="background:${escapeHtml(member.color || '#5b7cff')}">${escapeHtml(member.initials || 'TM')}</span>
              <div>
                <div class="table-title">${escapeHtml(member.displayName)}</div>
                <div class="table-meta">${member.activeOnSchedule !== false ? 'Visible in scheduler and assignment menus' : 'Hidden from scheduler assignment'}</div>
              </div>
            </div>
            <div class="settings-employee-color">
              <span class="team-color-dot" style="background:${escapeHtml(member.color || '#5b7cff')}"></span>
              <code>${escapeHtml(member.color || '#5b7cff')}</code>
            </div>
            <div class="settings-employee-status">
              ${member.activeOnSchedule !== false ? badge('Active', 'success') : badge('Inactive', 'warning')}
            </div>
            <div class="settings-employee-actions inline-actions">
              <button class="button button-small" type="button" data-edit-team-id="${member.id}">Edit</button>
            </div>
          </article>
        `).join('')}
      </div>
    `;

    for (const button of region.querySelectorAll('[data-edit-team-id]')) {
      button.addEventListener('click', () => {
        const teamMember = teamMembers.find((member) => member.id === button.dataset.editTeamId);
        openTeamMemberModal({ mode: 'edit', teamMember });
      });
    }
  };

  document.getElementById('create-team-button').addEventListener('click', () => openTeamMemberModal({ mode: 'create' }));
  renderTeamMembers();
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
            <th></th>
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
              <td>
                <div class="inline-actions">
                  <button class="button button-small" type="button" data-edit-job-id="${job.id}">Edit</button>
                </div>
              </td>
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

  for (const button of region.querySelectorAll('[data-edit-job-id]')) {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const job = await api.getJob(button.dataset.editJobId);
      openEditJobModal(job, customer);
    });
  }
}

async function renderNewJobPage() {
  const params = new URLSearchParams(location.search);
  const customerId = params.get('customerId');
  const seededDate = params.get('date') || localToday();
  const seededStart = params.get('start') || `${seededDate}T09:00`;
  const seededEnd = params.get('end') || `${seededDate}T10:00`;
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
                  href="${buildNewJobUrl({ customerId: candidate.id, pathname: location.pathname, search: location.search, date: seededDate, start: seededStart, end: seededEnd })}"
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
            start: seededStart,
            end: seededEnd,
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
      <button class="button button-ghost" type="button" id="new-job-template-button">Job Template</button>
      <button class="icon-button" type="button" id="new-job-help-button" aria-label="Help">?</button>
      <a class="button button-ghost" href="${escapeHtml(returnTo || `/app/customers/${customer.id}`)}">${escapeHtml(returnTo ? 'Back to scheduler' : 'Back to customer')}</a>
      <button class="button button-primary" form="new-job-page-form" type="submit" ${hasAddresses ? '' : 'disabled'}>Save job</button>
    `,
    content: `
      <form id="new-job-page-form" class="job-workspace-grid job-workspace-grid-strong">
        <div class="stack-gap-lg">
          <section class="surface-card stack-gap workspace-pane workspace-pane-narrow new-job-left-pane">
            <div class="section-header">
              <div>
                <div class="page-eyebrow">New job</div>
                <h2 class="section-title">Customer</h2>
              </div>
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

          <section class="surface-card stack-gap workspace-pane workspace-pane-narrow new-job-schedule-pane">
            <div class="section-header">
              <div>
                <div class="page-eyebrow">Schedule</div>
                <h2 class="section-title">Schedule</h2>
              </div>
              <div class="chip-row-inline">
                ${customer.doNotService ? badge('Do not service', 'danger') : badge('Scheduling allowed', 'success')}
              </div>
            </div>
            <div class="form-grid two-columns">
              <label>
                <span>From</span>
                <input name="scheduledStartAt" type="datetime-local" value="${escapeHtml(seededStart)}" />
              </label>
              <label>
                <span>To</span>
                <input name="scheduledEndAt" type="datetime-local" value="${escapeHtml(seededEnd)}" />
              </label>
            </div>
            <div class="inline-actions check-row">
              <label><input type="checkbox" name="skipSchedule" /> Create unscheduled</label>
              <label><input type="checkbox" name="notifyCustomer" ${customer.sendNotifications ? 'checked' : ''} disabled /> Notify customer</label>
            </div>
            <div id="recurrence-context-note" class="table-meta" hidden></div>
            <label>
              <span>Edit team</span>
              <select name="teamMemberId">
                <option value="">Unassigned</option>
                ${getActiveTeamMembers().map((member) => `<option value="${member.id}">${escapeHtml(member.displayName)}</option>`).join('')}
              </select>
            </label>
            <div class="stack-gap recurrence-toggle-panel">
              <div class="label">Recurring</div>
              <div class="inline-actions recurrence-toggle-row">
                <label class="radio-row recurrence-choice-pill"><input type="radio" name="recurrenceEnabled" value="no" checked /> No</label>
                <label class="radio-row recurrence-choice-pill"><input type="radio" name="recurrenceEnabled" value="yes" /> Yes</label>
              </div>
            </div>
            <div id="recurrence-shell" class="stack-gap recurring-inline-editor" hidden>
              <div class="recurrence-summary-card">
                <div>
                  <div class="label">Series summary</div>
                  <strong id="recurrence-summary-title">Repeats every week</strong>
                </div>
                <div class="table-meta" id="recurrence-summary-detail">Uses the scheduled day as the default repeat day.</div>
              </div>
              <div class="stack-gap-sm">
                <div class="label">Repeats</div>
                <select name="recurrencePreset" id="recurrence-preset">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom" selected>Custom</option>
                </select>
              </div>
              <div id="recurrence-custom-section">
                <div class="form-grid two-columns">
                  <label>
                    <span>Repeats every</span>
                    <input name="recurrenceInterval" type="number" value="1" min="1" max="999" />
                  </label>
                  <label>
                    <span>Unit</span>
                    <select name="recurrenceFrequency">
                      <option value="daily">Day</option>
                      <option value="weekly" selected>Week</option>
                      <option value="monthly">Month</option>
                      <option value="yearly">Year</option>
                    </select>
                  </label>
                </div>
                <div id="recurrence-weekday-chips" class="chip-row">
                  <span class="label">Repeats on</span>
                  ${['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => `<label class="chip-toggle"><input type="checkbox" name="recurrenceDayOfWeek" value="${d}" /><span>${d.slice(0,1)}</span></label>`).join('')}
                </div>
                <div id="recurrence-monthly-mode" hidden>
                  <label>
                    <span>Monthly mode</span>
                    <select name="monthlyMode">
                      <option value="dayOfMonth">Day of month</option>
                      <option value="ordinal">Ordinal weekday</option>
                    </select>
                  </label>
                  <div id="recurrence-day-of-month-section">
                    <label>
                      <span>Day of month</span>
                      <input name="recurrenceDayOfMonth" type="number" min="1" max="31" value="1" />
                    </label>
                  </div>
                  <div id="recurrence-ordinal-section" hidden>
                    <div class="form-grid two-columns">
                      <label>
                        <span>Ordinal</span>
                        <select name="recurrenceOrdinal">
                          <option value="first">First</option>
                          <option value="second">Second</option>
                          <option value="third">Third</option>
                          <option value="fourth">Fourth</option>
                          <option value="fifth">Fifth</option>
                          <option value="last">Last</option>
                        </select>
                      </label>
                      <label>
                        <span>Day</span>
                        <select name="recurrenceOrdinalDay">
                          ${['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => `<option value="${d}">${d}</option>`).join('')}
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
                <fieldset class="recurrence-ends-fieldset">
                  <legend>Ends</legend>
                  <div class="end-mode-buttons">
                    <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="never" checked /><span>Never</span></label>
                    <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="after_n_occurrences" /><span>After N</span></label>
                    <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="on_date" /><span>On date</span></label>
                  </div>
                  <div class="end-mode-detail" data-mode="after_n_occurrences">
                    <input type="number" name="recurrenceOccurrenceCount" value="10" min="1" class="inline-number" />
                    <span class="recurrence-end-copy">occurrences</span>
                  </div>
                  <div class="end-mode-detail" data-mode="on_date">
                    <input type="date" name="recurrenceEndDate" class="inline-date" />
                  </div>
                </fieldset>
              </div>
            </div>
            ${customer.doNotService ? statusMessage('This customer is marked do not service. You can create the job, but the schedule save step will be skipped.', 'warning') : '<div class="table-meta">Leave the team blank to keep the job in the Unassigned lane after scheduling.</div>'}
          </section>

          <section class="surface-card stack-gap workspace-pane workspace-pane-narrow">
            <button class="workspace-row-button" type="button" data-shell-action="checklists">
              <strong>Checklists</strong>
              <span>Visible in target UI, unsupported in V1</span>
            </button>
            <button class="workspace-row-button" type="button" data-shell-action="attachments">
              <strong>Attachments</strong>
              <span>Visible in target UI, unsupported in V1</span>
            </button>
            <button class="workspace-row-button" type="button" data-shell-action="fields">
              <strong>Fields</strong>
              <span>Visible in target UI, unsupported in V1</span>
            </button>
          </section>
        </div>

        <div class="stack-gap-lg new-job-right-column">
          <section class="surface-card stack-gap workspace-pane workspace-pane-wide new-job-summary-pane">
            <div class="section-header">
              <div>
                <div class="page-eyebrow">Pricing and notes</div>
                <h2 class="section-title">Private notes</h2>
              </div>
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

          <section class="surface-card stack-gap workspace-pane workspace-pane-wide">
            <div class="section-header">
              <div>
                <div class="page-eyebrow">Line items</div>
                <h2 class="section-title">Services and materials</h2>
              </div>
              <div class="chip-row-inline">
                <span id="new-job-type-badge">${badge('One-time job', 'neutral')}</span>
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
            <div class="line-items-grid">
              <section class="line-item-group">
                <div class="section-header">
                  <h3>Services</h3>
                  <div class="inline-actions">
                    <button class="button button-small button-ghost" type="button" data-shell-action="add service">Add service</button>
                    <button class="button button-small button-ghost" type="button" data-shell-action="service price book">Service Price Book</button>
                  </div>
                </div>
                <div class="line-item-row">
                  <div>
                    <strong>Home Cleaning</strong>
                    <div class="table-meta">Total price</div>
                  </div>
                  <strong>$0.00</strong>
                </div>
              </section>
              <section class="line-item-group">
                <div class="section-header">
                  <h3>Materials</h3>
                  <div class="inline-actions">
                    <button class="button button-small button-ghost" type="button" data-shell-action="add material">Add material</button>
                    <button class="button button-small button-ghost" type="button" data-shell-action="material price book">Material Price Book</button>
                  </div>
                </div>
                <div class="line-item-row line-item-row-muted">
                  <div>
                    <strong>No materials yet</strong>
                    <div class="table-meta">Pricing remains illustrative in V1.</div>
                  </div>
                  <strong>$0.00</strong>
                </div>
              </section>
            </div>
            <div class="stat-summary-card">
              <div class="stat-row"><span>Subtotal</span><strong>$0.00</strong></div>
              <div class="stat-row"><span>Tax rate</span><strong>$0.00</strong></div>
              <div class="stat-row"><span>Total</span><strong>$0.00</strong></div>
            </div>
            <div class="table-meta">This pass keeps line items as a service-summary-first V1 workflow. Invoicing and billing remain out of scope.</div>
          </section>

          <section class="surface-card stack-gap workspace-pane workspace-pane-wide">
            <div id="new-job-page-status"></div>
            <div class="modal-actions split-actions">
              <div class="inline-actions">
                <a class="button button-ghost" href="${escapeHtml(returnTo || `/app/customers/${customer.id}`)}">Cancel</a>
              </div>
              <div class="inline-actions">
                <button type="button" class="button button-ghost" data-shell-action="job template">Job Template</button>
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
          start: seededStart,
          end: seededEnd,
        });
      },
      });
    });
  document.getElementById('new-job-template-button')?.addEventListener('click', () => {
    showTransientPageNotice('Job templates are visible in the target UI, but remain unsupported in V1.', 'warning');
  });
  document.getElementById('new-job-help-button')?.addEventListener('click', () => {
    showTransientPageNotice('In-product help is visible in the target UI, but remains outside the supported V1 scope.', 'warning');
  });
  bindRecurrenceControls();
  document.getElementById('new-job-page-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const statusRegion = document.getElementById('new-job-page-status');
    try {
      const skipSchedule = form.querySelector('[name="skipSchedule"]').checked;
      const start = form.querySelector('[name="scheduledStartAt"]').value;
      const end = form.querySelector('[name="scheduledEndAt"]').value;
      const teamMemberId = form.querySelector('[name="teamMemberId"]').value;
      const recurrenceEnabled = form.querySelector('[name="recurrenceEnabled"]:checked')?.value === 'yes';

      if (recurrenceEnabled) {
        if (skipSchedule) {
          throw new Error('Recurring jobs must be scheduled. Turn off "Create unscheduled" to continue.');
        }
        if (!start || !end) {
          throw new Error('Recurring jobs require both start and end time.');
        }
        if (customer.doNotService) {
          throw new Error('Recurring jobs cannot be created for do-not-service customers.');
        }
      }

      const payload = jobPayloadFromForm(form);
      const created = await api.createJob(customer.id, payload);

      if (!skipSchedule && start && end && !customer.doNotService) {
        await api.scheduleJob(created.id, {
          scheduledStartAt: toIso(start),
          scheduledEndAt: toIso(end),
        });
      }

      if (teamMemberId) {
        await api.assignJob(created.id, teamMemberId);
      }

      if (recurrenceEnabled) {
        const recurrenceRule = buildRecurrencePayload(form);
        await api.enableRecurrence(created.id, recurrenceRule);
        setFlash('Recurring job created.', 'success');
      } else {
        setFlash('Job created.', 'success');
      }
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
  const [schedule, seriesInfo] = await Promise.all([
    api.getScheduleRange(focusDate, focusDate),
    job.isRecurring ? api.getSeriesForJob(jobId) : Promise.resolve(null),
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
      <button class="button button-ghost" type="button" disabled>Notify customer</button>
      <a class="button button-ghost" href="${escapeHtml(buildJobUrl(job.id, location.pathname, location.search))}">Back to job</a>
      <a class="button button-ghost" href="${escapeHtml(returnTo || '/app/calendar_new')}">${escapeHtml(returnTo ? 'Back to scheduler' : 'Open scheduler')}</a>
      <button class="button button-primary" form="schedule-route-form" type="submit">Save</button>
    `,
    content: `
      <div class="job-workspace-grid job-workspace-grid-strong">
        <form id="schedule-route-form" class="surface-card stack-gap workspace-pane workspace-pane-narrow schedule-route-pane">
          <div class="section-header schedule-route-header">
            <div>
              <div class="page-eyebrow">Schedule</div>
              <h2 class="section-title">Schedule a time for job</h2>
            </div>
            <div class="chip-row-inline">
              ${job.scheduleState === 'scheduled' ? badge('Scheduled', 'success') : badge('Unscheduled', 'warning')}
              ${job.assignee?.displayName ? badge(job.assignee.displayName, 'neutral') : badge('Unassigned', 'warning')}
            </div>
          </div>
          <div class="schedule-hero-card">
            <div>
              <div class="label">Job</div>
              <strong>${escapeHtml(job.jobNumber)} • ${escapeHtml(job.titleOrServiceSummary)}</strong>
            </div>
            <div>
              <div class="label">Customer</div>
              <strong>${escapeHtml(job.customer.displayName)}</strong>
            </div>
            <div>
              <div class="label">Timezone</div>
              <strong>CDT</strong>
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
              ${getActiveTeamMembers().map((member) => `<option value="${member.id}" ${job.assigneeTeamMemberId === member.id ? 'selected' : ''}>${escapeHtml(member.displayName)}</option>`).join('')}
            </select>
          </label>
          <label>
            <span>Arrival window</span>
            <select disabled>
              <option>Use scheduled arrival for selected team</option>
            </select>
          </label>
          <div class="stack-gap">
            <div class="label">Repeats</div>
            <select name="recurrencePreset" id="recurrence-preset">
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div id="recurrence-custom-section" hidden>
            <div class="form-grid two-columns">
              <label>
                <span>Repeats every</span>
                <input name="recurrenceInterval" type="number" value="1" min="1" max="999" />
              </label>
              <label>
                <span>Unit</span>
                <select name="recurrenceFrequency">
                  <option value="daily">Day</option>
                  <option value="weekly">Week</option>
                  <option value="monthly">Month</option>
                  <option value="yearly">Year</option>
                </select>
              </label>
            </div>
            <div id="recurrence-weekday-chips" class="chip-row" hidden>
              <span class="label">Repeats on</span>
              ${['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => `<label class="chip-toggle"><input type="checkbox" name="recurrenceDayOfWeek" value="${d}" /><span>${d}</span></label>`).join('')}
            </div>
            <div id="recurrence-monthly-mode" hidden>
              <label>
                <span>Monthly mode</span>
                <select name="monthlyMode">
                  <option value="dayOfMonth">Day of month</option>
                  <option value="ordinal">Ordinal weekday</option>
                </select>
              </label>
              <div id="recurrence-day-of-month-section">
                <label>
                  <span>Day of month</span>
                  <input name="recurrenceDayOfMonth" type="number" min="1" max="31" value="1" />
                </label>
              </div>
              <div id="recurrence-ordinal-section" hidden>
                <div class="form-grid two-columns">
                  <label>
                    <span>Ordinal</span>
                    <select name="recurrenceOrdinal">
                      <option value="first">First</option>
                      <option value="second">Second</option>
                      <option value="third">Third</option>
                      <option value="fourth">Fourth</option>
                      <option value="fifth">Fifth</option>
                      <option value="last">Last</option>
                    </select>
                  </label>
                  <label>
                    <span>Day</span>
                    <select name="recurrenceOrdinalDay">
                      ${['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => `<option value="${d}">${d}</option>`).join('')}
                    </select>
                  </label>
                </div>
              </div>
            </div>
            <fieldset class="recurrence-ends-fieldset">
              <legend>Ends</legend>
              <div class="end-mode-buttons">
                <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="never" checked /><span>Never</span></label>
                <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="after_n_occurrences" /><span>After N</span></label>
                <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="on_date" /><span>On date</span></label>
              </div>
              <div class="end-mode-detail" data-mode="after_n_occurrences">
                <input type="number" name="recurrenceOccurrenceCount" value="10" min="1" class="inline-number" />
                <span class="recurrence-end-copy">occurrences</span>
              </div>
              <div class="end-mode-detail" data-mode="on_date">
                <input type="date" name="recurrenceEndDate" class="inline-date" />
              </div>
            </fieldset>
          </div>
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

        <section class="surface-card stack-gap scheduler-embedded-panel workspace-pane workspace-pane-wide schedule-board-pane">
          <div class="section-header">
            <div>
              <div class="page-eyebrow">Live board</div>
              <h2 class="section-title">Day board</h2>
            </div>
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
  bindCalendarCreateActions();
  bindCalendarDragAndDrop();
  bindRecurrenceControls();
  if (seriesInfo) {
    populateRecurrenceForm(document.getElementById('schedule-route-form'), seriesInfo);
  }

  document.getElementById('schedule-route-unschedule')?.addEventListener('click', async () => {
    if (job.isRecurring) {
      openDeleteOccurrenceModal(job);
      return;
    }
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
      const recurrencePreset = form.querySelector('[name="recurrencePreset"]').value;
      const nextStartAt = toIso(start);
      const nextEndAt = toIso(end);

      if (job.isRecurring) {
        const recurrenceRule = buildRecurrencePayload(form);
        if (!recurrenceRule) {
          throw new Error('Recurring jobs cannot be switched to does not repeat from this screen. Use recurring delete scope actions instead.');
        }

        const changes = {};
        if (nextStartAt !== job.scheduledStartAt) changes.scheduledStartAt = nextStartAt;
        if (nextEndAt !== job.scheduledEndAt) changes.scheduledEndAt = nextEndAt;
        if (teamMemberId !== (job.assigneeTeamMemberId || '')) changes.assigneeTeamMemberId = teamMemberId || null;

        const recurrenceChanged = didRecurrenceRuleChange(seriesInfo, recurrenceRule);
        if (!Object.keys(changes).length && !recurrenceChanged) {
          setFlash('No recurring changes to save.', 'info');
          location.href = buildJobUrl(job.id, location.pathname, location.search);
          return;
        }

        const scope = await chooseRecurringEditScope({
          title: `Save changes for ${job.jobNumber}`,
          message: recurrenceChanged
            ? 'Changing the repeat rule starts a new recurrence boundary from this job forward.'
            : 'Choose whether these schedule changes affect only this occurrence or this occurrence and all future ones.',
          allowThisScope: !recurrenceChanged,
        });
        if (!scope) return;

        await api.editOccurrence(job.id, scope, changes, recurrenceChanged ? recurrenceRule : undefined);
        setFlash(scope === 'this' ? 'Occurrence updated.' : 'Recurring schedule updated from this job forward.', 'success');
        location.href = buildJobUrl(job.id, location.pathname, location.search);
        return;
      }

      if (!job.customer.doNotService) {
        await api.scheduleJob(job.id, {
          scheduledStartAt: nextStartAt,
          scheduledEndAt: nextEndAt,
        });
      }

      if (teamMemberId) {
        await api.assignJob(job.id, teamMemberId);
      } else if (job.assigneeTeamMemberId) {
        await api.unassignJob(job.id);
      }

      if (recurrencePreset !== 'none' && !job.isRecurring) {
        const recurrenceRule = buildRecurrencePayload(form);
        await api.enableRecurrence(job.id, recurrenceRule);
        setFlash('Schedule updated with recurrence.', 'success');
      } else {
        setFlash('Schedule updated.', 'success');
      }

      location.href = buildJobUrl(job.id, location.pathname, location.search);
    } catch (error) {
      statusRegion.innerHTML = statusMessage(error.message, 'danger');
    }
  });
}

async function renderJobDetailPage(jobId) {
  const job = await api.getJob(jobId);
  const customer = await api.getCustomer(job.customer.id);
  const seriesInfo = job.isRecurring ? await api.getSeriesForJob(jobId) : null;
  const schedulerContext = getSchedulerContext(location.search);
  const returnLabel = schedulerContext ? 'Back to scheduler' : 'Back to customer';
  const returnHref = schedulerContext || `/app/customers/${job.customer.id}`;
  const recurringLabel = job.isRecurring ? ` • Recurring #${job.occurrenceIndex ?? 1}` : '';
  renderShell({
    title: `${job.jobNumber} • ${job.titleOrServiceSummary}`,
    subtitle: `${job.scheduleState === 'scheduled' ? 'Scheduled' : 'Unscheduled'} • ${job.assignee?.displayName || 'Unassigned'}${recurringLabel}`,
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
                ${job.isRecurring ? badge('Recurring', 'info') : ''}
                ${job.isExceptionInstance ? badge('Exception', 'warning') : ''}
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
          ${job.isRecurring && seriesInfo ? `
          <div class="surface-card stack-gap">
            <h2 class="section-title">Recurring series</h2>
            <div class="stat-row"><span>Frequency</span><strong>${escapeHtml(describeRecurrenceRuleUI(seriesInfo))}</strong></div>
            <div class="stat-row"><span>Occurrence</span><strong>#${job.occurrenceIndex ?? 1}</strong></div>
            <div class="stat-row"><span>End mode</span><strong>${escapeHtml(seriesInfo.recurrenceEndMode === 'never' ? 'Never' : seriesInfo.recurrenceEndMode === 'after_n_occurrences' ? 'After ' + seriesInfo.recurrenceOccurrenceCount + ' occurrences' : 'On ' + seriesInfo.recurrenceEndDate)}</strong></div>
            ${job.isExceptionInstance ? '<div class="table-meta">This occurrence has been individually edited and differs from the series rule.</div>' : ''}
            <div class="inline-actions">
              <button class="button button-danger" id="delete-occurrence-button">Delete occurrence</button>
            </div>
          </div>
          ` : ''}
        </aside>
      </section>
    `,
  });

  document.getElementById('edit-job-button').addEventListener('click', () => {
    if (job.isRecurring) {
      openRecurringEditScopeModal(job, customer, seriesInfo);
    } else {
      openEditJobModal(job, customer);
    }
  });
  document.getElementById('edit-team-button').addEventListener('click', () => {
    if (job.isRecurring) {
      openRecurringTeamScopeModal(job);
    } else {
      openTeamModal(job);
    }
  });
  document.getElementById('edit-team-inline-button').addEventListener('click', () => {
    if (job.isRecurring) {
      openRecurringTeamScopeModal(job);
    } else {
      openTeamModal(job);
    }
  });
  document.getElementById('unassign-job-inline-button')?.addEventListener('click', async () => {
    if (job.isRecurring) {
      openRecurringTeamScopeModal(job, '');
      return;
    }
    try {
      await api.unassignJob(job.id);
      setFlash('Assignment updated.', 'success');
      location.reload();
    } catch (error) {
      showTransientPageNotice(error.message, 'danger');
    }
  });
  document.getElementById('unschedule-job-button').addEventListener('click', async () => {
    if (job.isRecurring) {
      openDeleteOccurrenceModal(job);
      return;
    }
    if (!confirm('Undo the current schedule for this job?')) return;
    try {
      await api.unscheduleJob(job.id);
      setFlash('Job unscheduled.', 'success');
      location.reload();
    } catch (error) {
      showTransientPageNotice(error.message, 'danger');
    }
  });
  document.getElementById('delete-occurrence-button')?.addEventListener('click', () => {
    openDeleteOccurrenceModal(job);
  });
}

async function renderSchedulerPage() {
  const params = new URLSearchParams(location.search);
  const view = ['day', 'week', 'month'].includes(params.get('view')) ? params.get('view') : 'day';
  const date = params.get('date') || localToday();
  const filter = params.get('filter') || '';
  const scale = normalizeDayScale(params.get('scale'));
  const range = viewRange(view, date);
  // Extend materialization horizons for never-ending series (fire and forget)
  api.extendHorizons().catch(() => {});

  const [schedule, unscheduledJobs] = await Promise.all([
    api.getScheduleRange(range.startDate, range.endDate),
    api.listJobs({ scheduleState: 'unscheduled' }),
  ]);
  const selectedLaneIds = normalizeSelectedLaneIds(params.getAll('lane'), schedule.lanes);
  const laneFilteredSchedule = filterScheduleByLaneSelection(schedule, selectedLaneIds);
  const filteredSchedule = filterSchedule(laneFilteredSchedule, filter);
  const filteredUnscheduledJobs = filterJobs(unscheduledJobs, filter);
  const summary = summarizeSchedule(filteredSchedule, range.startDate, range.endDate);

  renderShell({
    title: 'Scheduler',
    subtitle: '',
    nav: 'scheduler',
    breadcrumbs: [],
    actions: '',
    showHero: false,
    content: `
      <section class="surface-card stack-gap-lg scheduler-surface">
        <div class="scheduler-toolbar-shell scheduler-toolbar-shell-compact scheduler-toolbar-shell-navsplit">
          <div class="scheduler-date-nav-wrap">
            <a class="icon-button scheduler-nav-arrow" href="${buildSchedulerUrl({ view, date: stepAnchorDay(view, date, -1), filter, lanes: selectedLaneIds, scale })}" aria-label="Previous">&#x2039;</a>
            <button type="button" class="scheduler-date-trigger" id="scheduler-date-trigger">${escapeHtml(formatCompactDayLabel(date))}</button>
            <a class="icon-button scheduler-nav-arrow" href="${buildSchedulerUrl({ view, date: stepAnchorDay(view, date, 1), filter, lanes: selectedLaneIds, scale })}" aria-label="Next">&#x203A;</a>
            <input id="scheduler-date-picker" class="scheduler-date-picker" type="date" value="${escapeHtml(date)}" aria-label="Focus date" />
          </div>
          <div class="scheduler-toolbar-right-cluster">
            <div class="scheduler-filter-shell">
              <button type="button" class="button button-ghost scheduler-filter-toggle ${filter ? 'is-active' : ''}" id="scheduler-filter-toggle">Filter</button>
              <div class="scheduler-filter-panel" id="scheduler-filter-panel" hidden>
                <form id="scheduler-filter-menu-form" class="stack-gap compact-form">
                  <label>
                    <span>Search</span>
                    <input name="filter" value="${escapeHtml(filter)}" placeholder="Customer, service, or tag" aria-label="Filter jobs" />
                  </label>
                  <div class="inline-actions scheduler-filter-actions">
                    <button class="button button-primary" type="submit">Apply</button>
                    <button class="button button-ghost" type="button" id="scheduler-filter-reset">Reset</button>
                  </div>
                </form>
              </div>
            </div>
            <div class="view-switcher view-switcher-strong scheduler-view-switcher-inline">
              ${schedulerViewButton('day', view, date, filter, selectedLaneIds, scale)}
              ${schedulerViewButton('week', view, date, filter, selectedLaneIds, scale)}
              ${schedulerViewButton('month', view, date, filter, selectedLaneIds, scale)}
            </div>
          </div>
        </div>
        <div class="scheduler-layout">
          <aside class="scheduler-rail">
            <div class="rail-card stack-gap rail-card-compact">
              <div class="rail-card-head"><h2 class="section-title">Teams</h2><a class="table-meta" href="/app/settings">Manage</a></div>
              <form id="scheduler-lane-filter-form" class="stack-gap compact-form lane-filter-list-compact">
                ${renderLaneFilterOptions(schedule, selectedLaneIds)}
              </form>
            </div>
            <div class="rail-card stack-gap">
              <h2 class="section-title">Range</h2>
              ${renderRangeGuide(view, date, filteredSchedule, filter, selectedLaneIds, scale)}
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
            <div id="scheduler-region">${renderSchedulerView({ view, date, schedule: filteredSchedule, filter, lanes: selectedLaneIds, scale })}</div>
          </div>
        </div>
      </section>
    `,
  });

  document.getElementById('scheduler-date-trigger')?.addEventListener('click', () => {
    const picker = document.getElementById('scheduler-date-picker');
    if (!picker) return;
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }
    picker.focus();
    picker.click();
  });

  document.getElementById('scheduler-date-picker')?.addEventListener('change', (event) => {
    const nextDate = event.currentTarget.value;
    if (!nextDate) return;
    location.href = buildSchedulerUrl({ view, date: nextDate, filter, lanes: selectedLaneIds, scale });
  });

  bindSchedulerFilterMenu({ view, date, filter, selectedLaneIds, scale });

  document.getElementById('scheduler-lane-filter-form').addEventListener('change', (event) => {
    const form = new FormData(event.currentTarget);
    const selected = normalizeSelectedLaneIds(form.getAll('lane'), schedule.lanes);
    const nextLanes = selected.length === schedule.lanes.length ? [] : selected;
    location.href = buildSchedulerUrl({ view, date, filter, lanes: nextLanes, scale });
  });

  bindSchedulerQuickActions();
  bindCalendarCreateActions();
  bindCalendarDragAndDrop();
}

function renderSchedulerView({ view, date, schedule, filter, lanes = [], scale = '15' }) {
  if (view === 'day') {
    return renderDaySchedulerView(date, schedule, filter, lanes, scale);
  }
  if (view === 'week') {
    return renderWeekSchedulerView(date, schedule, filter, lanes, scale);
  }
  return renderMonthSchedulerView(date, schedule, filter, lanes, scale);
}

function renderDaySchedulerView(date, schedule, filter, lanes = [], scale = '15') {
  const visibleHours = Array.from({ length: 11 }, (_, index) => index + 7);
  const { slotMinutes, slotHeight } = getDayScaleConfig(scale);
  const startHour = visibleHours[0];
  const totalMinutes = visibleHours.length * 60;
  const laneJobs = new Map(schedule.lanes.map((lane) => [lane.id, []]));
  const currentTimeLine = renderCurrentTimeLine(date, visibleHours, schedule.lanes.length, slotHeight, slotMinutes);

  for (const job of schedule.jobs) {
    if (jobDayKeys(job, date, date).includes(date)) {
      const laneId = job.assigneeTeamMemberId || 'unassigned';
      laneJobs.get(laneId)?.push(job);
    }
  }

  const quarterSlots = [];
  for (const hour of visibleHours) {
    for (let minute = 0; minute < 60; minute += slotMinutes) {
      quarterSlots.push({ hour, minute, label: minute === 0 ? formatHourLabel(hour) : '' });
    }
  }

  return `
    <div class="calendar-day-grid-shell">
      <div class="calendar-day-grid-wrap">
        <div class="calendar-day-board" style="grid-template-columns: 88px repeat(${schedule.lanes.length}, minmax(180px, 1fr));">
          <div class="calendar-corner-cell">
            <div class="timezone-pill">GMT-05</div>
          </div>
          ${schedule.lanes.map((lane) => {
            const jobs = (laneJobs.get(lane.id) || []).sort(compareJobs);
            return `
              <div class="calendar-lane-header ${lane.id === 'unassigned' ? 'is-unassigned' : ''}" ${colorStyleAttr(lane.color, '--team-color')}>
                <div>
                  <strong>${escapeHtml(lane.label)}</strong>
                  <div class="table-meta">${jobs.length} job${jobs.length === 1 ? '' : 's'}</div>
                </div>
                ${lane.initials ? `<span class="lane-avatar" ${colorStyleAttr(lane.color, '--team-color')}>${escapeHtml(lane.initials)}</span>` : badge('Unassigned', 'warning')}
              </div>
            `;
          }).join('')}

          <div class="calendar-time-axis" style="--slot-height:${slotHeight}px;">
            ${quarterSlots.map((slot) => `
              <div class="calendar-time-tick ${slot.minute === 0 ? 'is-hour' : 'is-quarter'}">
                ${slot.label ? `<span>${escapeHtml(slot.label)}</span>` : ''}
              </div>
            `).join('')}
          </div>

          ${schedule.lanes.map((lane) => {
            const jobs = (laneJobs.get(lane.id) || []).sort(compareJobs);
            const eventLayouts = buildDayLaneEventLayouts(jobs, { visibleStartMinute: startHour * 60, visibleEndMinute: (visibleHours.at(-1) + 1) * 60 });
            return `
              <div class="calendar-day-column ${lane.id === 'unassigned' ? 'is-unassigned' : ''}" style="--slot-height:${slotHeight}px; --day-height:${quarterSlots.length * slotHeight}px;" data-day-column-lane-id="${escapeHtml(lane.id)}">
                <div class="calendar-slot-grid" style="grid-template-rows: repeat(${quarterSlots.length}, ${slotHeight}px);">
                  ${quarterSlots.map((slot) => `
                    <button
                      class="calendar-slot-segment ${slot.minute === 0 ? 'is-hour' : 'is-quarter'}"
                      type="button"
                      data-empty-slot
                      data-calendar-drop-slot
                      data-slot-date="${escapeHtml(date)}"
                      data-slot-hour="${slot.hour}"
                      data-slot-minute="${slot.minute}"
                      data-slot-lane-id="${escapeHtml(lane.id)}"
                      aria-label="Create new job"
                      title="Create new job"
                    ></button>
                  `).join('')}
                </div>
                <div class="calendar-events-layer">
                  ${jobs.map((job) => renderDayEventCard(job, { startHour, slotHeight, slotMinutes, totalMinutes, layout: eventLayouts.get(job.id) })).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${currentTimeLine}
      </div>
      ${schedule.jobs.some((job) => !job.assigneeTeamMemberId)
        ? '<div class="table-meta">Unassigned jobs stay in their own column until a team is selected.</div>'
        : ''}
    </div>
  `;
}

function renderWeekSchedulerView(date, schedule, filter, lanes = [], scale = '15') {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const days = listDays(start, end);
  const jobsByDay = groupJobsByDay(schedule.jobs, start, end);

  return `
    <div class="week-grid-shell">
      <div class="week-grid week-grid-strong">
        ${days.map((day) => {
          const dayJobs = (jobsByDay.get(day) || []).sort(compareJobs);
          const daySummary = summarizeDayJobs(dayJobs);
          return `
            <section class="week-column ${day === localToday() ? 'is-today' : ''} ${day === date ? 'is-focused-day' : ''}">
              <div class="week-header week-header-strong">
                <div>
                  <div class="week-weekday">${escapeHtml(weekdayLabel(day).toUpperCase())}</div>
                  <div class="week-date">${escapeHtml(shortDayLabel(day))}</div>
                </div>
                <a class="button button-small button-ghost" href="${buildDayUrl(day, filter, lanes, scale)}">Open day</a>
              </div>
              <div class="week-summary-row week-summary-row-strong">
                <span>${daySummary.total} job${daySummary.total === 1 ? '' : 's'}</span>
                <span>${daySummary.unassigned} unassigned</span>
              </div>
              <div class="week-body week-body-strong">
                ${dayJobs.length ? dayJobs.slice(0, 5).map((job) => schedulerCard(job, { compact: true, view: 'week', filter })).join('') : `<div class="empty-lane week-empty-lane">No jobs on this day</div>`}
                ${dayJobs.length > 5 ? `<a class="more-link" href="${buildDayUrl(day, filter, lanes, scale)}">Open day to view ${dayJobs.length - 5} more</a>` : ''}
              </div>
            </section>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderMonthSchedulerView(date, schedule, filter, lanes = [], scale = '15') {
  const start = monthGridStart(date);
  const end = monthGridEnd(date);
  const days = listDays(start, end);
  const jobsByDay = groupJobsByDay(schedule.jobs, start, end);
  const activeMonth = startOfMonth(date).slice(0, 7);

  return `
    <div class="month-grid month-grid-head">
      ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => `<div class="month-head-cell">${label}</div>`).join('')}
    </div>
    <div class="month-grid">
      ${days.map((day) => {
        const dayJobs = (jobsByDay.get(day) || []).sort(compareJobs);
        const daySummary = summarizeDayJobs(dayJobs);
        return `
          <section class="month-cell ${day.startsWith(activeMonth) ? '' : 'is-muted-month'} ${day === localToday() ? 'is-today' : ''} ${day === date ? 'is-focused-day' : ''}" data-empty-day="${escapeHtml(day)}">
            <div class="month-day-top">
              <a class="month-day-link" href="${buildDayUrl(day, filter, lanes, scale)}"><strong>${parseDayKey(day).getDate()}</strong></a>
              <span>${daySummary.total ? `${daySummary.total} job${daySummary.total === 1 ? '' : 's'}` : 'Open day'}</span>
            </div>
            <div class="month-day-summary ${daySummary.unassigned ? 'has-unassigned' : ''}">
              <span>${daySummary.unassigned ? `${daySummary.unassigned} unassigned` : 'All assigned or empty'}</span>
            </div>
            <div class="month-day-body">
              ${dayJobs.length ? dayJobs.slice(0, 4).map((job) => renderMonthEventBar(job)).join('') : `<button class="empty-lane month-empty-action" type="button" data-empty-day-action="${escapeHtml(day)}">Create new job</button>`}
              ${dayJobs.length > 4 ? `<a class="more-link" href="${buildDayUrl(day, filter, lanes, scale)}">Open day to view ${dayJobs.length - 4} more</a>` : ''}
            </div>
          </section>
        `;
      }).join('')}
    </div>
  `;
}

function renderRangeGuide(view, date, schedule, filter = '', lanes = [], scale = '15') {
  const range = viewRange(view, date);
  const days = listDays(range.startDate, range.endDate);
  const jobsByDay = groupJobsByDay(schedule.jobs, range.startDate, range.endDate);
  return `
    <div class="range-guide-list">
      ${days.slice(0, view === 'month' ? 14 : days.length).map((day) => {
        const dayJobs = jobsByDay.get(day) || [];
        return `
          <a class="range-guide-row ${day === date ? 'is-active' : ''}" href="${buildDayUrl(day, filter, lanes, scale)}">
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

function normalizeSelectedLaneIds(selectedLaneIds, lanes = []) {
  const allowed = new Set(lanes.map((lane) => lane.id));
  return selectedLaneIds.filter((laneId) => allowed.has(laneId));
}

function filterScheduleByLaneSelection(schedule, selectedLaneIds) {
  if (!selectedLaneIds.length) return schedule;
  const visible = new Set(selectedLaneIds);
  return {
    ...schedule,
    lanes: schedule.lanes.filter((lane) => visible.has(lane.id)),
    jobs: schedule.jobs.filter((job) => visible.has(job.assigneeTeamMemberId || 'unassigned')),
  };
}

function renderMiniMonthRail({ view, date, filter = '', selectedLaneIds = [], scale = '15' }) {
  const monthStart = startOfMonth(date);
  const gridStart = monthGridStart(date);
  const gridEnd = monthGridEnd(date);
  const activeMonth = monthStart.slice(0, 7);
  return `
    <div class="mini-month-card stack-gap">
      <div class="mini-month-header">
        <a class="button button-small button-ghost" href="${buildSchedulerUrl({ view, date: stepAnchorDay('month', date, -1), filter, lanes: selectedLaneIds, scale })}">Previous</a>
        <strong>${escapeHtml(formatRangeLabel('month', date))}</strong>
        <a class="button button-small button-ghost" href="${buildSchedulerUrl({ view, date: stepAnchorDay('month', date, 1), filter, lanes: selectedLaneIds, scale })}">Next</a>
      </div>
      <div class="mini-month-weekdays">
        ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label) => `<span>${label}</span>`).join('')}
      </div>
      <div class="mini-month-grid">
        ${listDays(gridStart, gridEnd).map((day) => `
          <a class="mini-month-day ${day === date ? 'is-active' : ''} ${day === localToday() ? 'is-today' : ''} ${day.startsWith(activeMonth) ? '' : 'is-muted-month'}" href="${buildSchedulerUrl({ view, date: day, filter, lanes: selectedLaneIds, scale })}">${parseDayKey(day).getDate()}</a>
        `).join('')}
      </div>
    </div>
  `;
}

function renderLaneFilterOptions(schedule, selectedLaneIds = []) {
  const counts = new Map(schedule.lanes.map((lane) => [lane.id, 0]));
  for (const job of schedule.jobs) {
    const laneId = job.assigneeTeamMemberId || 'unassigned';
    counts.set(laneId, (counts.get(laneId) || 0) + 1);
  }
  const active = selectedLaneIds.length ? new Set(selectedLaneIds) : new Set(schedule.lanes.map((lane) => lane.id));

  return schedule.lanes.map((lane) => `
    <label class="lane-filter-row">
      <span class="lane-filter-main">
        <input type="checkbox" name="lane" value="${lane.id}" ${active.has(lane.id) ? 'checked' : ''} />
        <span class="team-color-dot" style="background:${escapeHtml(lane.color || '#5b7cff')}"></span>
        <span>${escapeHtml(lane.label)}</span>
      </span>
      <strong>${counts.get(lane.id) || 0}</strong>
    </label>
  `).join('');
}

function renderSchedulerBacklog(jobs, options = {}) {
  if (!jobs.length) {
    return emptyState(options.emptyTitle || 'Nothing here', options.emptyBody || 'No jobs match the current view.');
  }

  return `
    <div class="scheduler-backlog-list">
      ${jobs.slice(0, 6).map((job) => `
        <article class="backlog-card draggable-job ${!job.assigneeTeamMemberId ? 'backlog-card-warning' : ''}" draggable="true" data-calendar-job-id="${job.id}">
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

function bindCalendarCreateActions() {
  for (const button of document.querySelectorAll('[data-empty-slot]')) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const { slotDate, slotHour, slotMinute } = event.currentTarget.dataset;
      openCalendarCreateMenu({ date: slotDate, hour: Number(slotHour), minute: Number(slotMinute || 0) });
    });
  }

  for (const button of document.querySelectorAll('[data-empty-day-action]')) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      openCalendarCreateMenu({ date: event.currentTarget.dataset.emptyDayAction });
    });
  }
}

function bindCalendarDragAndDrop() {
  for (const card of document.querySelectorAll('[data-calendar-job-id]')) {
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card.dataset.calendarJobId);
      card.classList.add('is-dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      clearCalendarDropTargets();
    });
  }

  for (const slot of document.querySelectorAll('[data-calendar-drop-slot]')) {
    slot.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      slot.classList.add('is-drop-target');
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('is-drop-target');
    });

    slot.addEventListener('drop', async (event) => {
      event.preventDefault();
      slot.classList.remove('is-drop-target');
      const jobId = event.dataTransfer.getData('text/plain');
      if (!jobId) return;

      try {
        await moveJobToCalendarSlot({
          jobId,
          date: slot.dataset.slotDate,
          hour: Number(slot.dataset.slotHour),
          minute: Number(slot.dataset.slotMinute || 0),
          laneId: slot.dataset.slotLaneId,
        });
      } catch (error) {
        showTransientPageNotice(error.message, 'danger');
      }
    });
  }
}

async function moveJobToCalendarSlot({ jobId, date, hour, minute = 0, laneId }) {
  const job = await api.getJob(jobId);
  const durationMinutes = Math.max(15, getJobDurationMinutes(job));
  const startLocal = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const endLocal = addMinutesToLocalDateTime(startLocal, durationMinutes);
  const scheduledStartAt = toIso(startLocal);
  const scheduledEndAt = toIso(endLocal);
  const nextAssigneeTeamMemberId = laneId === 'unassigned' ? null : (laneId || null);
  const hasScheduleChange = job.scheduledStartAt !== scheduledStartAt || job.scheduledEndAt !== scheduledEndAt;
  const hasAssignmentChange = (job.assigneeTeamMemberId || null) !== nextAssigneeTeamMemberId;

  if (!hasScheduleChange && !hasAssignmentChange) return;

  if (job.recurringSeriesId) {
    const scope = await chooseRecurringEditScope({
      title: 'Move recurring job',
      message: 'This job is part of a recurring series. Apply the drag-and-drop move only to this job or to this job and all future jobs?',
      allowThisScope: true,
    });
    if (!scope) return;

    const changes = {};
    if (hasScheduleChange) {
      changes.scheduledStartAt = scheduledStartAt;
      changes.scheduledEndAt = scheduledEndAt;
    }
    if (hasAssignmentChange) {
      changes.assigneeTeamMemberId = nextAssigneeTeamMemberId;
    }

    await api.editOccurrence(jobId, scope, changes);
    setFlash(
      scope === 'this'
        ? `Recurring job moved for ${shortDayLabel(date)} at ${formatTime(scheduledStartAt)}.`
        : `Recurring job moved for this and future occurrences from ${shortDayLabel(date)} at ${formatTime(scheduledStartAt)}.`,
      'success',
    );
    await renderRoute();
    return;
  }

  await api.scheduleJob(jobId, { scheduledStartAt, scheduledEndAt });

  if (nextAssigneeTeamMemberId === null) {
    if (job.assigneeTeamMemberId) {
      await api.unassignJob(jobId);
    }
  } else {
    await api.assignJob(jobId, nextAssigneeTeamMemberId);
  }

  setFlash(`Job moved to ${shortDayLabel(date)} at ${formatTime(scheduledStartAt)}.`, 'success');
  await renderRoute();
}

function clearCalendarDropTargets() {
  for (const slot of document.querySelectorAll('.calendar-slot-segment.is-drop-target')) {
    slot.classList.remove('is-drop-target');
  }
}

function getJobDurationMinutes(job) {
  if (!job.scheduledStartAt || !job.scheduledEndAt) return 60;
  const minutes = Math.round((new Date(job.scheduledEndAt).getTime() - new Date(job.scheduledStartAt).getTime()) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 60;
}

function addMinutesToLocalDateTime(localDateTime, minutes) {
  const date = new Date(localDateTime);
  date.setMinutes(date.getMinutes() + minutes);
  return toDateTimeLocal(date.toISOString());
}

function openCalendarCreateMenu({ date, hour = 9, minute = 0 }) {
  const start = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const end = addMinutesToLocalDateTime(start, 60);
  const createHref = buildNewJobUrl({ pathname: location.pathname, search: location.search, date, start, end });

  openModal({
    title: `Create on ${shortDayLabel(date)}`,
    body: `
      <div class="stack-gap modal-form">
        <div class="table-meta">Choose the next action for this empty calendar slot.</div>
        <div class="modal-actions split-actions">
          <div class="inline-actions">
            <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
          </div>
          <div class="inline-actions">
            <a class="button button-primary" href="${escapeHtml(createHref)}">Create new job</a>
          </div>
        </div>
      </div>
    `,
  });

  document.getElementById('close-modal-button').addEventListener('click', closeModal);
}

function openCreateCustomerModal(options = {}) {
  openCustomerFormModal({ mode: 'create', ...options });
}

function openTeamMemberModal({ mode, teamMember = null }) {
  openModal({
    title: mode === 'create' ? 'Add team' : `Edit ${teamMember.displayName}`,
    body: `
      <form id="team-member-form" class="stack-gap modal-form team-member-modal-form">
        <div class="form-grid two-columns">
          <label>
            <span>Employee / team name</span>
            <input name="displayName" value="${escapeHtml(teamMember?.displayName || '')}" required />
          </label>
          <label>
            <span>Status</span>
            <select name="activeOnSchedule">
              <option value="true" ${teamMember?.activeOnSchedule === false ? '' : 'selected'}>Active on schedule</option>
              <option value="false" ${teamMember?.activeOnSchedule === false ? 'selected' : ''}>Inactive</option>
            </select>
          </label>
        </div>
        <section class="team-member-color-card">
          <div>
            <div class="label">Color</div>
            <div class="table-meta">Used for scheduler headers, badges, and calendar cards.</div>
          </div>
          <div class="color-input-row">
            <input name="color" type="color" value="${escapeHtml(teamMember?.color || '#5b7cff')}" />
            <input name="colorText" value="${escapeHtml(teamMember?.color || '#5b7cff')}" />
            <span class="settings-employee-avatar is-large" id="team-member-color-preview" style="background:${escapeHtml(teamMember?.color || '#5b7cff')}">${escapeHtml(teamMember?.initials || 'TM')}</span>
          </div>
        </section>
        <div id="team-member-status"></div>
        <div class="modal-actions split-actions">
          <div class="inline-actions">
            <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
          </div>
          <div class="inline-actions">
            <button type="submit" class="button button-primary">${mode === 'create' ? 'Create team' : 'Save team'}</button>
          </div>
        </div>
      </form>
    `,
  });

  const form = document.getElementById('team-member-form');
  const colorPicker = form.querySelector('[name="color"]');
  const colorText = form.querySelector('[name="colorText"]');
  const preview = document.getElementById('team-member-color-preview');

  const syncPreview = () => {
    preview.style.background = colorPicker.value;
    preview.textContent = deriveInitials(form.querySelector('[name="displayName"]').value || teamMember?.displayName || 'TM');
  };

  colorPicker.addEventListener('input', () => {
    colorText.value = colorPicker.value;
    syncPreview();
  });
  colorText.addEventListener('input', () => {
    if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorText.value)) {
      colorPicker.value = colorText.value;
      syncPreview();
    }
  });
  form.querySelector('[name="displayName"]').addEventListener('input', syncPreview);
  syncPreview();

  document.getElementById('close-modal-button').addEventListener('click', closeModal);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = new FormData(form);
      const payload = {
        displayName: data.get('displayName'),
        color: data.get('colorText'),
        activeOnSchedule: data.get('activeOnSchedule') !== 'false',
      };
      const saved = mode === 'create'
        ? await api.createTeamMember(payload)
        : await api.updateTeamMember(teamMember.id, payload);
      state.teamMembers = await api.listTeamMembers();
      setFlash(mode === 'create' ? 'Team created.' : 'Team saved.', 'success');
      closeModal();
      if (location.pathname === '/app/settings') {
        await renderSettingsPage();
      } else {
        await renderRoute();
      }
      return saved;
    } catch (error) {
      document.getElementById('team-member-status').innerHTML = statusMessage(error.message, 'danger');
    }
  });
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
      location.href = buildCustomerUrl(saved.id, location.pathname, location.search);
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
  const activeTeamMembers = getActiveTeamMembers();
  openModal({
    title: `${job.assignee?.displayName ? 'Reassign' : 'Assign'} ${job.jobNumber}`,
    body: `
      <form id="team-job-form" class="stack-gap modal-form">
        <label>
          <span>Find team member</span>
          <input id="team-member-search" placeholder="Search active team members" ${activeTeamMembers.length ? '' : 'disabled'} />
        </label>
        <label>
          <span>Active team member</span>
          <select name="teamMemberId" id="team-member-select" ${activeTeamMembers.length ? '' : 'disabled'}>
            ${activeTeamMembers.length
              ? activeTeamMembers.map((member) => `<option value="${member.id}" ${job.assigneeTeamMemberId === member.id ? 'selected' : ''}>${escapeHtml(member.displayName)}</option>`).join('')
              : '<option value="">Create a team in Settings first</option>'}
          </select>
        </label>
        <div class="table-meta">Only active team members are available in V1. Use Set unassigned to move this job back to the Unassigned lane.</div>
        ${activeTeamMembers.length ? '' : '<a class="button button-ghost" href="/app/settings">Open settings</a>'}
        <div id="team-job-status"></div>
        <div class="modal-actions split-actions">
          <div class="inline-actions">
            ${job.assigneeTeamMemberId ? '<button type="button" class="button button-ghost" id="unassign-team-button">Set unassigned</button>' : ''}
          </div>
          <div class="inline-actions">
            <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
            <button type="submit" class="button button-primary" ${activeTeamMembers.length ? '' : 'disabled'}>Save team</button>
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

function schedulerViewButton(targetView, activeView, date, filter = '', lanes = [], scale = '15') {
  return `<a class="button ${targetView === activeView ? 'button-primary' : ''}" href="${buildSchedulerUrl({ view: targetView, date, filter, lanes, scale: targetView === 'day' ? scale : '' })}">${escapeHtml(capitalize(targetView))}</a>`;
}

function compareJobs(left, right) {
  return new Date(left.scheduledStartAt).getTime() - new Date(right.scheduledStartAt).getTime();
}

function renderDayEventCard(job, { startHour, slotHeight, slotMinutes, totalMinutes, layout = null }) {
  const recurringIcon = job.isRecurring ? '<span class="recurring-icon" title="Recurring">&#x1f501;</span>' : '';
  const startParts = localDateTimePartsFromIso(job.scheduledStartAt);
  const minutesFromStart = Math.max(0, ((startParts.hour - startHour) * 60) + startParts.minute);
  const durationMinutes = Math.max(15, getLocalDurationMinutes(job.scheduledStartAt, job.scheduledEndAt));
  const top = (minutesFromStart / slotMinutes) * slotHeight;
  const height = Math.max(slotHeight, (durationMinutes / slotMinutes) * slotHeight);
  const clampedHeight = Math.max(slotHeight, Math.min(height, ((totalMinutes - minutesFromStart) / slotMinutes) * slotHeight));
  const widthPercent = layout?.totalColumns > 1 ? 100 / layout.totalColumns : null;
  const styleAttr = buildStyleAttr([
    colorStyleDeclaration(job.assignmentColor, '--team-color'),
    `top:${top}px`,
    `height:${clampedHeight}px`,
    widthPercent ? `left:calc(${(layout.columnIndex || 0) * widthPercent}% + 6px)` : '',
    widthPercent ? `width:calc(${widthPercent}% - 8px)` : '',
    widthPercent ? 'right:auto' : '',
  ]);
  return `
    <a class="calendar-event draggable-job ${!job.assigneeTeamMemberId ? 'is-unassigned' : ''}" draggable="true" data-calendar-job-id="${job.id}" ${styleAttr} href="${buildJobUrl(job.id, location.pathname, location.search)}">
      <div class="calendar-event-time">${escapeHtml(formatTime(job.scheduledStartAt))} to ${escapeHtml(formatTime(job.scheduledEndAt))} ${recurringIcon}</div>
      <div class="calendar-event-title-row">
        <div class="calendar-event-title">${escapeHtml(job.titleOrServiceSummary)}</div>
        <span class="calendar-event-chip">${escapeHtml(job.assigneeTeamMemberId ? (job.assignmentLabel || 'Assigned') : 'Unassigned')}</span>
      </div>
      <div class="calendar-event-meta">${escapeHtml(job.customer?.displayName || 'Unknown customer')}</div>
      <div class="calendar-event-meta">${escapeHtml(formatAddress(job.address) || 'No address')}</div>
    </a>
  `;
}

function renderMonthEventBar(job) {
  const recurringIcon = job.isRecurring ? ' &#x1f501;' : '';
  return `
    <a class="month-event-bar ${!job.assigneeTeamMemberId ? 'is-unassigned' : ''}" ${colorStyleAttr(job.assignmentColor, '--team-color')} href="${buildJobUrl(job.id, location.pathname, location.search)}">
      <span class="month-event-time">${escapeHtml(formatTime(job.scheduledStartAt))}</span>
      <span class="month-event-label">${escapeHtml(job.titleOrServiceSummary)}${recurringIcon}</span>
      ${!job.assigneeTeamMemberId ? '<span class="month-event-dot"></span>' : ''}
    </a>
  `;
}

function formatHourLabel(hour) {
  const suffix = hour >= 12 ? 'pm' : 'am';
  const normalized = hour % 12 || 12;
  return `${normalized}${suffix}`;
}

function colorStyleDeclaration(color, variableName = '--team-color') {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(color || '')) ? `${variableName}:${color}` : `${variableName}:#5b7cff`;
}

function buildStyleAttr(declarations = []) {
  const safeDeclarations = declarations.filter(Boolean).join(';');
  return safeDeclarations ? `style="${safeDeclarations}"` : '';
}

function colorStyleAttr(color, variableName = '--team-color') {
  return buildStyleAttr([colorStyleDeclaration(color, variableName)]);
}

function normalizeDayScale(scale) {
  return ['60', '30', '15', '10'].includes(String(scale || '')) ? String(scale) : '15';
}

function getDayScaleConfig(scale) {
  const normalized = normalizeDayScale(scale);
  switch (normalized) {
    case '60': return { slotMinutes: 60, slotHeight: 52 };
    case '30': return { slotMinutes: 30, slotHeight: 26 };
    case '10': return { slotMinutes: 10, slotHeight: 10 };
    case '15':
    default:
      return { slotMinutes: 15, slotHeight: 15 };
  }
}

function renderCurrentTimeLine(date, visibleHours, laneCount, slotHeight = 24, slotMinutes = 15) {
  if (date !== localToday()) return '';
  const now = new Date();
  const startHour = visibleHours[0];
  const endHour = visibleHours[visibleHours.length - 1] + 1;
  const hourValue = now.getHours() + (now.getMinutes() / 60);
  if (hourValue < startHour || hourValue > endHour) return '';
  const headerHeight = 60;
  const top = headerHeight + (((hourValue - startHour) * 60) / slotMinutes) * slotHeight;
  return `<div class="calendar-now-line" style="top:${top}px; left:76px; width:calc(100% - 76px);"><span class="calendar-now-dot"></span></div>`;
}

function localDateTimePartsFromIso(iso) {
  const local = toDateTimeLocal(iso);
  const [datePart = '', timePart = '00:00'] = local.split('T');
  const [hour, minute] = timePart.split(':').map((value) => Number(value || 0));
  return { datePart, hour, minute };
}

function getLocalDurationMinutes(startIso, endIso) {
  if (!startIso || !endIso) return 60;
  const start = localDateTimePartsFromIso(startIso);
  const end = localDateTimePartsFromIso(endIso);
  const startDay = start.datePart ? new Date(`${start.datePart}T00:00`) : null;
  const endDay = end.datePart ? new Date(`${end.datePart}T00:00`) : null;
  const dayOffsetMinutes = startDay && endDay
    ? Math.round((endDay.getTime() - startDay.getTime()) / 60000)
    : 0;
  const minuteDelta = ((end.hour * 60) + end.minute) - ((start.hour * 60) + start.minute);
  const total = dayOffsetMinutes + minuteDelta;
  return Number.isFinite(total) && total > 0 ? total : getJobDurationMinutes({ scheduledStartAt: startIso, scheduledEndAt: endIso });
}

function getLocalMinutesSinceMidnight(iso) {
  const parts = localDateTimePartsFromIso(iso);
  return (parts.hour * 60) + parts.minute;
}

function buildDayLaneEventLayouts(jobs, { visibleStartMinute, visibleEndMinute }) {
  const intervals = jobs.map((job) => {
    const actualStartMinute = getLocalMinutesSinceMidnight(job.scheduledStartAt);
    const actualEndMinute = actualStartMinute + getLocalDurationMinutes(job.scheduledStartAt, job.scheduledEndAt);
    const startMinute = Math.max(visibleStartMinute, actualStartMinute);
    const endMinute = Math.min(visibleEndMinute, actualEndMinute);
    return {
      jobId: job.id,
      startMinute,
      endMinute: Math.max(startMinute + 1, endMinute),
    };
  }).sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute);

  const layouts = new Map();
  let cluster = [];
  let clusterEnd = -Infinity;

  for (const interval of intervals) {
    if (cluster.length && interval.startMinute >= clusterEnd) {
      flushOverlapCluster(cluster, layouts);
      cluster = [];
      clusterEnd = -Infinity;
    }
    cluster.push(interval);
    clusterEnd = Math.max(clusterEnd, interval.endMinute);
  }

  if (cluster.length) {
    flushOverlapCluster(cluster, layouts);
  }

  return layouts;
}

function flushOverlapCluster(cluster, layouts) {
  const columns = [];
  let maxColumns = 0;

  for (const interval of cluster) {
    let columnIndex = columns.findIndex((endMinute) => endMinute <= interval.startMinute);
    if (columnIndex === -1) {
      columnIndex = columns.length;
      columns.push(interval.endMinute);
    } else {
      columns[columnIndex] = interval.endMinute;
    }
    interval.columnIndex = columnIndex;
    maxColumns = Math.max(maxColumns, columns.length);
  }

  for (const interval of cluster) {
    layouts.set(interval.jobId, {
      columnIndex: interval.columnIndex,
      totalColumns: maxColumns,
    });
  }
}

function deriveInitials(displayName) {
  const parts = String(displayName || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return (parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'TM').slice(0, 2);
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

// ── Recurring Jobs UI ──

async function renderNewRecurringJobPage() {
  const [customers] = await Promise.all([api.listCustomers()]);
  renderShell({
    title: 'New recurring job',
    nav: 'scheduler',
    breadcrumbs: ['<a href="/app/calendar_new">Scheduler</a>', 'New recurring job'],
    actions: `
      <a class="button button-ghost" href="/app/calendar_new">Cancel</a>
      <button class="button button-primary" form="recurring-job-form" type="submit">Save recurring job</button>
    `,
    content: `
      <form id="recurring-job-form" class="surface-card stack-gap modal-form">
        <h2 class="section-title">Customer and service</h2>
        <label>
          <span>Customer</span>
          <select name="customerId" id="recurring-customer-select" required>
            <option value="">Select customer</option>
            ${customers.map((c) => `<option value="${c.id}">${escapeHtml(c.displayName)}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>Address</span>
          <select name="customerAddressId" id="recurring-address-select" required disabled>
            <option value="">Select customer first</option>
          </select>
        </label>
        <label>
          <span>Service summary</span>
          <input name="titleOrServiceSummary" required placeholder="e.g., Home Cleaning" />
        </label>
        <label>
          <span>Lead source</span>
          <input name="leadSource" />
        </label>
        <label>
          <span>Tags</span>
          <input name="tags" placeholder="tag1, tag2" />
        </label>
        <label>
          <span>Private notes</span>
          <textarea name="privateNotes"></textarea>
        </label>

        <h2 class="section-title">Schedule</h2>
        <div class="form-grid two-columns">
          <label>
            <span>From</span>
            <input name="scheduledStartAt" type="datetime-local" required />
          </label>
          <label>
            <span>To</span>
            <input name="scheduledEndAt" type="datetime-local" required />
          </label>
        </div>
        <label>
          <span>Team member</span>
          <select name="assigneeTeamMemberId">
            <option value="">Unassigned</option>
            ${getActiveTeamMembers().map((m) => `<option value="${m.id}">${escapeHtml(m.displayName)}</option>`).join('')}
          </select>
        </label>

        <h2 class="section-title">Recurrence</h2>
        <select name="recurrencePreset" id="recurrence-preset">
          <option value="daily">Daily</option>
          <option value="weekly" selected>Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom</option>
        </select>
        <div id="recurrence-custom-section" hidden>
          <div class="form-grid two-columns">
            <label>
              <span>Repeats every</span>
              <input name="recurrenceInterval" type="number" value="1" min="1" max="999" />
            </label>
            <label>
              <span>Unit</span>
              <select name="recurrenceFrequency">
                <option value="daily">Day</option>
                <option value="weekly">Week</option>
                <option value="monthly">Month</option>
                <option value="yearly">Year</option>
              </select>
            </label>
          </div>
          <div id="recurrence-weekday-chips" class="chip-row" hidden>
            <span class="label">Repeats on</span>
            ${['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => `<label class="chip-toggle"><input type="checkbox" name="recurrenceDayOfWeek" value="${d}" /><span>${d}</span></label>`).join('')}
          </div>
          <div id="recurrence-monthly-mode" hidden>
            <label>
              <span>Monthly mode</span>
              <select name="monthlyMode">
                <option value="dayOfMonth">Day of month</option>
                <option value="ordinal">Ordinal weekday</option>
              </select>
            </label>
            <div id="recurrence-day-of-month-section">
              <label>
                <span>Day of month</span>
                <input name="recurrenceDayOfMonth" type="number" min="1" max="31" value="1" />
              </label>
            </div>
            <div id="recurrence-ordinal-section" hidden>
              <div class="form-grid two-columns">
                <label>
                  <span>Ordinal</span>
                  <select name="recurrenceOrdinal">
                    <option value="first">First</option>
                    <option value="second">Second</option>
                    <option value="third">Third</option>
                    <option value="fourth">Fourth</option>
                    <option value="fifth">Fifth</option>
                    <option value="last">Last</option>
                  </select>
                </label>
                <label>
                  <span>Day</span>
                  <select name="recurrenceOrdinalDay">
                    ${['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => `<option value="${d}">${d}</option>`).join('')}
                  </select>
                </label>
              </div>
            </div>
          </div>
          <fieldset class="recurrence-ends-fieldset">
            <legend>Ends</legend>
            <div class="end-mode-buttons">
              <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="never" checked /><span>Never</span></label>
              <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="after_n_occurrences" /><span>After N</span></label>
              <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="on_date" /><span>On date</span></label>
            </div>
            <div class="end-mode-detail" data-mode="after_n_occurrences">
              <input type="number" name="recurrenceOccurrenceCount" value="10" min="1" class="inline-number" />
              <span class="recurrence-end-copy">occurrences</span>
            </div>
            <div class="end-mode-detail" data-mode="on_date">
              <input type="date" name="recurrenceEndDate" class="inline-date" />
            </div>
          </fieldset>
        </div>

        <div id="recurring-job-status"></div>
        <div class="modal-actions">
          <a class="button button-ghost" href="/app/calendar_new">Cancel</a>
          <button type="submit" class="button button-primary">Save recurring job</button>
        </div>
      </form>
    `,
  });

  bindRecurrenceControls();

  // Customer -> address cascade
  const customerSelect = document.getElementById('recurring-customer-select');
  const addressSelect = document.getElementById('recurring-address-select');
  customerSelect.addEventListener('change', async () => {
    const customerId = customerSelect.value;
    if (!customerId) {
      addressSelect.innerHTML = '<option value="">Select customer first</option>';
      addressSelect.disabled = true;
      return;
    }
    try {
      const customer = await api.getCustomer(customerId);
      addressSelect.innerHTML = customer.addresses.map((a) =>
        `<option value="${a.id}">${escapeHtml(formatAddress(a))}</option>`
      ).join('');
      addressSelect.disabled = false;
    } catch {
      addressSelect.innerHTML = '<option value="">Error loading addresses</option>';
    }
  });

  document.getElementById('recurring-job-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const statusRegion = document.getElementById('recurring-job-status');
    try {
      const data = new FormData(form);
      const recurrenceRule = buildRecurrencePayload(form);
      const payload = {
        customerId: data.get('customerId'),
        job: {
          titleOrServiceSummary: data.get('titleOrServiceSummary'),
          customerAddressId: data.get('customerAddressId'),
          leadSource: data.get('leadSource'),
          privateNotes: data.get('privateNotes'),
          tags: splitTags(data.get('tags')),
        },
        schedule: {
          scheduledStartAt: toIso(data.get('scheduledStartAt')),
          scheduledEndAt: toIso(data.get('scheduledEndAt')),
          assigneeTeamMemberId: data.get('assigneeTeamMemberId') || undefined,
        },
        recurrence: recurrenceRule,
      };
      const result = await api.createRecurringJob(payload);
      setFlash(`Recurring job created. ${result.generatedCount} occurrences generated.`, 'success');
      location.href = buildJobUrl(result.sourceJob.id, location.pathname, location.search);
    } catch (error) {
      statusRegion.innerHTML = statusMessage(error.message, 'danger');
    }
  });
}

function bindRecurrenceControls() {
  const preset = document.getElementById('recurrence-preset');
  const customSection = document.getElementById('recurrence-custom-section');
  if (!preset || !customSection) return;

  const recurrenceShell = document.getElementById('recurrence-shell');
  const recurrenceEnabledInputs = Array.from(document.querySelectorAll('[name="recurrenceEnabled"]'));
  const freqSelect = customSection.querySelector('[name="recurrenceFrequency"]');
  const weekdayChips = document.getElementById('recurrence-weekday-chips');
  const monthlyMode = document.getElementById('recurrence-monthly-mode');
  const monthlyModeSelect = customSection.querySelector('[name="monthlyMode"]');
  const dayOfMonthSection = document.getElementById('recurrence-day-of-month-section');
  const ordinalSection = document.getElementById('recurrence-ordinal-section');
  const startInput = document.querySelector('[name="scheduledStartAt"]');
  const skipScheduleInput = document.querySelector('[name="skipSchedule"]');
  const recurrenceContextNote = document.getElementById('recurrence-context-note');
  const recurrenceSummaryTitle = document.getElementById('recurrence-summary-title');
  const recurrenceSummaryDetail = document.getElementById('recurrence-summary-detail');
  const jobTypeBadge = document.getElementById('new-job-type-badge');

  function syncEnabled() {
    if (!recurrenceShell || recurrenceEnabledInputs.length === 0) return;
    const enabled = recurrenceEnabledInputs.some((input) => input.checked && input.value === 'yes');
    recurrenceShell.hidden = !enabled;
    if (enabled && preset.value === 'none') {
      preset.value = 'custom';
    }
    if (skipScheduleInput) {
      skipScheduleInput.disabled = enabled;
      if (enabled) skipScheduleInput.checked = false;
    }
    if (recurrenceContextNote) {
      recurrenceContextNote.hidden = !enabled;
      recurrenceContextNote.textContent = enabled
        ? 'Recurring jobs must be scheduled when they are created, so "Create unscheduled" is turned off while recurring is enabled.'
        : '';
    }
    if (jobTypeBadge) {
      jobTypeBadge.innerHTML = enabled ? badge('Recurring job', 'info') : badge('One-time job', 'neutral');
    }
    if (enabled) {
      ensureRecurringDefaults();
      syncPreset();
    }
    syncSummary();
  }

  function ensureRecurringDefaults() {
    const freq = freqSelect?.value || (preset.value === 'custom' ? 'weekly' : preset.value);
    if (freqSelect && !freqSelect.value) freqSelect.value = 'weekly';
    if (preset.value === 'custom' && freqSelect && !freqSelect.value) freqSelect.value = 'weekly';
    if (freq === 'weekly') {
      seedWeeklySelectionFromStart();
    }
    if ((freq === 'monthly' || freq === 'yearly') && monthlyModeSelect?.value !== 'ordinal') {
      const scheduledDate = startInput?.value ? new Date(startInput.value) : new Date();
      const dayOfMonth = customSection.querySelector('[name="recurrenceDayOfMonth"]');
      if (dayOfMonth && !dayOfMonth.value) {
        dayOfMonth.value = String(scheduledDate.getDate());
      }
    }
  }

  function seedWeeklySelectionFromStart() {
    const weekdayInputs = Array.from(customSection.querySelectorAll('[name="recurrenceDayOfWeek"]'));
    if (!weekdayInputs.length || weekdayInputs.some((input) => input.checked)) return;
    const weekday = weekdayTokenFromLocalDateTime(startInput?.value);
    const match = weekdayInputs.find((input) => input.value === weekday);
    if (match) match.checked = true;
  }

  function syncPreset() {
    const val = preset.value;
    if (val === 'none') {
      customSection.hidden = true;
      return;
    }
    if (val === 'custom') {
      customSection.hidden = false;
      syncFrequency();
      return;
    }
    customSection.hidden = false;
    if (freqSelect) freqSelect.value = val;
    const intervalInput = customSection.querySelector('[name="recurrenceInterval"]');
    if (intervalInput) intervalInput.value = '1';
    syncFrequency();
  }

  function syncFrequency() {
    const freq = freqSelect?.value || 'weekly';
    const isWeekly = freq === 'weekly';
    const supportsDayPattern = freq === 'monthly' || freq === 'yearly';
    if (weekdayChips) weekdayChips.hidden = !isWeekly;
    if (monthlyMode) monthlyMode.hidden = !supportsDayPattern;
    if (isWeekly) seedWeeklySelectionFromStart();
  }

  function syncMonthlyMode() {
    const mode = monthlyModeSelect?.value || 'dayOfMonth';
    if (dayOfMonthSection) dayOfMonthSection.hidden = mode !== 'dayOfMonth';
    if (ordinalSection) ordinalSection.hidden = mode !== 'ordinal';
    syncSummary();
  }

  function syncSummary() {
    const enabled = recurrenceEnabledInputs.some((input) => input.checked && input.value === 'yes');
    if (!enabled) return;
    const frequency = (preset.value && preset.value !== 'custom') ? preset.value : (freqSelect?.value || 'weekly');
    const interval = Number(customSection.querySelector('[name="recurrenceInterval"]')?.value || 1);
    const unitMap = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
    const unit = unitMap[frequency] || 'week';
    const plural = interval === 1 ? unit : `${unit}s`;
    if (recurrenceSummaryTitle) {
      recurrenceSummaryTitle.textContent = `Repeats every ${interval === 1 ? '' : `${interval} `}${plural}`.trim();
    }

    let detail = 'Uses the scheduled day as the default repeat day.';
    if (frequency === 'weekly') {
      const picked = Array.from(customSection.querySelectorAll('[name="recurrenceDayOfWeek"]:checked')).map((input) => input.value);
      detail = picked.length ? `Repeats on ${picked.join(', ')}.` : 'Pick one or more weekdays for the weekly repeat.';
    } else if (frequency === 'monthly' || frequency === 'yearly') {
      const mode = monthlyModeSelect?.value || 'dayOfMonth';
      if (mode === 'ordinal') {
        detail = `Repeats on the ${customSection.querySelector('[name="recurrenceOrdinal"]')?.value || 'first'} ${customSection.querySelector('[name="recurrenceOrdinalDay"]')?.value || 'MON'}.`;
      } else {
        detail = `Repeats on day ${customSection.querySelector('[name="recurrenceDayOfMonth"]')?.value || '1'} of the ${frequency === 'yearly' ? 'selected month' : 'month'}.`;
      }
    }

    const endMode = customSection.querySelector('[name="recurrenceEndMode"]:checked')?.value || 'never';
    if (endMode === 'after_n_occurrences') {
      detail += ` Ends after ${customSection.querySelector('[name="recurrenceOccurrenceCount"]')?.value || '10'} occurrences.`;
    } else if (endMode === 'on_date') {
      const endDate = customSection.querySelector('[name="recurrenceEndDate"]')?.value;
      detail += endDate ? ` Ends on ${endDate}.` : ' Pick an end date.';
    } else {
      detail += ' Does not end automatically.';
    }

    if (recurrenceSummaryDetail) recurrenceSummaryDetail.textContent = detail;
  }

  recurrenceEnabledInputs.forEach((input) => input.addEventListener('change', syncEnabled));
  startInput?.addEventListener('change', () => {
    ensureRecurringDefaults();
    syncSummary();
  });
  skipScheduleInput?.addEventListener('change', syncSummary);
  preset.addEventListener('change', () => {
    syncPreset();
    syncSummary();
  });
  freqSelect?.addEventListener('change', () => {
    syncFrequency();
    syncSummary();
  });
  monthlyModeSelect?.addEventListener('change', syncMonthlyMode);
  customSection.querySelectorAll('[name="recurrenceDayOfWeek"], [name="recurrenceOrdinal"], [name="recurrenceOrdinalDay"], [name="recurrenceDayOfMonth"], [name="recurrenceOccurrenceCount"], [name="recurrenceEndDate"], [name="recurrenceEndMode"], [name="recurrenceInterval"]').forEach((input) => {
    input.addEventListener('change', syncSummary);
    input.addEventListener('input', syncSummary);
  });

  syncEnabled();
  syncPreset();
  syncMonthlyMode();
  syncSummary();
}

function weekdayTokenFromLocalDateTime(value) {
  const date = value ? new Date(value) : new Date();
  return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
}

function buildRecurrencePayload(form) {
  const data = new FormData(form);
  const preset = data.get('recurrencePreset');
  if (preset === 'none') return null;

  let frequency = data.get('recurrenceFrequency') || preset;
  if (['daily', 'weekly', 'monthly', 'yearly'].includes(preset) && preset !== 'custom') {
    frequency = preset;
  }

  const interval = Number(data.get('recurrenceInterval')) || 1;
  const endMode = data.get('recurrenceEndMode') || 'never';

  const rule = {
    recurrenceFrequency: frequency,
    recurrenceInterval: interval,
    recurrenceEndMode: endMode,
  };

  if (endMode === 'after_n_occurrences') {
    rule.recurrenceOccurrenceCount = Number(data.get('recurrenceOccurrenceCount')) || 10;
  }
  if (endMode === 'on_date') {
    rule.recurrenceEndDate = data.get('recurrenceEndDate');
  }

  if (frequency === 'weekly') {
    rule.recurrenceDayOfWeek = data.getAll('recurrenceDayOfWeek');
  }

  if (frequency === 'monthly') {
    const monthlyMode = data.get('monthlyMode') || 'dayOfMonth';
    if (monthlyMode === 'ordinal') {
      rule.recurrenceOrdinal = data.get('recurrenceOrdinal');
      rule.recurrenceDayOfWeek = [data.get('recurrenceOrdinalDay')];
    } else {
      rule.recurrenceDayOfMonth = Number(data.get('recurrenceDayOfMonth')) || 1;
    }
  }

  if (frequency === 'yearly') {
    const monthlyMode = data.get('monthlyMode') || 'dayOfMonth';
    if (monthlyMode === 'ordinal') {
      rule.recurrenceOrdinal = data.get('recurrenceOrdinal');
      rule.recurrenceDayOfWeek = [data.get('recurrenceOrdinalDay')];
    } else {
      rule.recurrenceDayOfMonth = Number(data.get('recurrenceDayOfMonth')) || new Date().getDate();
    }
    const monthIndex = new Date(form.querySelector('[name="scheduledStartAt"]')?.value || Date.now()).getMonth();
    rule.recurrenceMonthOfYear = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][monthIndex];
  }

  return rule;
}

function populateRecurrenceForm(form, series) {
  if (!form || !series) return;
  const preset = form.querySelector('[name="recurrencePreset"]');
  const frequency = form.querySelector('[name="recurrenceFrequency"]');
  const interval = form.querySelector('[name="recurrenceInterval"]');
  const monthlyMode = form.querySelector('[name="monthlyMode"]');
  const dayOfMonth = form.querySelector('[name="recurrenceDayOfMonth"]');
  const ordinal = form.querySelector('[name="recurrenceOrdinal"]');
  const ordinalDay = form.querySelector('[name="recurrenceOrdinalDay"]');
  const endMode = form.querySelector(`[name="recurrenceEndMode"][value="${series.recurrenceEndMode}"]`);
  const occurrenceCount = form.querySelector('[name="recurrenceOccurrenceCount"]');
  const endDate = form.querySelector('[name="recurrenceEndDate"]');

  if (preset) {
    preset.value = series.recurrenceInterval === 1 ? series.recurrenceFrequency : 'custom';
    preset.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (frequency) {
    frequency.value = series.recurrenceFrequency;
    frequency.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (interval) interval.value = String(series.recurrenceInterval || 1);
  if (series.recurrenceOrdinal && monthlyMode) {
    monthlyMode.value = 'ordinal';
    monthlyMode.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (dayOfMonth && series.recurrenceDayOfMonth) dayOfMonth.value = String(series.recurrenceDayOfMonth);
  if (ordinal && series.recurrenceOrdinal) ordinal.value = series.recurrenceOrdinal;
  if (ordinalDay && series.recurrenceDayOfWeek?.[0]) ordinalDay.value = series.recurrenceDayOfWeek[0];
  form.querySelectorAll('[name="recurrenceDayOfWeek"]').forEach((input) => {
    input.checked = (series.recurrenceDayOfWeek || []).includes(input.value);
  });
  if (endMode) endMode.checked = true;
  if (occurrenceCount && series.recurrenceOccurrenceCount) occurrenceCount.value = String(series.recurrenceOccurrenceCount);
  if (endDate && series.recurrenceEndDate) endDate.value = series.recurrenceEndDate;
}

function didRecurrenceRuleChange(series, nextRule) {
  if (!series && !nextRule) return false;
  return JSON.stringify(normalizeRecurrenceRuleForCompare(series)) !== JSON.stringify(normalizeRecurrenceRuleForCompare(nextRule));
}

function normalizeRecurrenceRuleForCompare(rule) {
  if (!rule) return null;
  return {
    recurrenceFrequency: rule.recurrenceFrequency || null,
    recurrenceInterval: Number(rule.recurrenceInterval || 1),
    recurrenceEndMode: rule.recurrenceEndMode || 'never',
    recurrenceOccurrenceCount: rule.recurrenceOccurrenceCount ?? null,
    recurrenceEndDate: rule.recurrenceEndDate || null,
    recurrenceDayOfWeek: [...(rule.recurrenceDayOfWeek || [])].sort(),
    recurrenceDayOfMonth: rule.recurrenceDayOfMonth ?? null,
    recurrenceOrdinal: rule.recurrenceOrdinal || null,
    recurrenceMonthOfYear: rule.recurrenceMonthOfYear || null,
  };
}

function chooseRecurringEditScope({ title, message, allowThisScope = true }) {
  return new Promise((resolve) => {
    openModal({
      title,
      body: `
        <div class="stack-gap">
          <p>${escapeHtml(message)}</p>
          <div class="inline-actions scope-actions">
            ${allowThisScope ? '<button class="button button-primary" id="scope-choice-this">Only this job</button>' : ''}
            <button class="button" id="scope-choice-future">This job and all future jobs</button>
          </div>
          <div class="modal-actions">
            <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
          </div>
        </div>
      `,
    });

    document.getElementById('close-modal-button').addEventListener('click', () => {
      closeModal();
      resolve(null);
    });
    document.getElementById('scope-choice-this')?.addEventListener('click', () => {
      closeModal();
      resolve('this');
    });
    document.getElementById('scope-choice-future')?.addEventListener('click', () => {
      closeModal();
      resolve('this_and_future');
    });
  });
}

function describeRecurrenceRuleUI(series) {
  if (!series) return 'None';
  const freq = series.recurrenceFrequency;
  const interval = series.recurrenceInterval;
  switch (freq) {
    case 'daily': return interval === 1 ? 'Daily' : `Every ${interval} days`;
    case 'weekly': {
      const days = (series.recurrenceDayOfWeek || []).join(', ');
      const base = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      return days ? `${base} on ${days}` : base;
    }
    case 'monthly': {
      const base = interval === 1 ? 'Monthly' : `Every ${interval} months`;
      if (series.recurrenceOrdinal && series.recurrenceDayOfWeek?.length) {
        return `${base} on the ${series.recurrenceOrdinal} ${series.recurrenceDayOfWeek[0]}`;
      }
      if (series.recurrenceDayOfMonth) return `${base} on day ${series.recurrenceDayOfMonth}`;
      return base;
    }
    case 'yearly': return interval === 1 ? 'Yearly' : `Every ${interval} years`;
    default: return 'Custom';
  }
}

function openRecurringEditScopeModal(job, customer, seriesInfo) {
  openModal({
    title: `Edit ${job.jobNumber}`,
    body: `
      <div class="stack-gap">
        <p>This job is part of a recurring series. How would you like to apply your changes?</p>
        <div class="inline-actions scope-actions">
          <button class="button button-primary" id="edit-scope-this">Only this job</button>
          <button class="button" id="edit-scope-future">This job and all future jobs</button>
        </div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
        </div>
      </div>
    `,
  });

  document.getElementById('close-modal-button').addEventListener('click', closeModal);
  document.getElementById('edit-scope-this').addEventListener('click', () => {
    closeModal();
    openEditJobModalWithScope(job, customer, seriesInfo, 'this');
  });
  document.getElementById('edit-scope-future').addEventListener('click', () => {
    closeModal();
    openEditJobModalWithScope(job, customer, seriesInfo, 'this_and_future');
  });
}

function openEditJobModalWithScope(job, customer, seriesInfo, scope) {
  openModal({
    title: `Edit ${job.jobNumber} — ${scope === 'this' ? 'Only this job' : 'This and future jobs'}`,
    body: `
      <form id="edit-recurring-form" class="stack-gap modal-form">
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
        ${scope === 'this' ? `
        <h3>Reschedule this occurrence</h3>
        <div class="form-grid two-columns">
          <label>
            <span>Start</span>
            <input name="scheduledStartAt" type="datetime-local" value="${job.scheduledStartAt ? escapeHtml(toDateTimeLocal(job.scheduledStartAt)) : ''}" />
          </label>
          <label>
            <span>End</span>
            <input name="scheduledEndAt" type="datetime-local" value="${job.scheduledEndAt ? escapeHtml(toDateTimeLocal(job.scheduledEndAt)) : ''}" />
          </label>
        </div>
        ` : ''}
        <label>
          <span>Team member</span>
          <select name="assigneeTeamMemberId">
            <option value="">Unassigned</option>
            ${getActiveTeamMembers().map((m) => `<option value="${m.id}" ${job.assigneeTeamMemberId === m.id ? 'selected' : ''}>${escapeHtml(m.displayName)}</option>`).join('')}
          </select>
        </label>
        ${scope === 'this_and_future' ? `
        <div class="stack-gap recurring-inline-editor">
          <div class="label">Repeat rule</div>
          <select name="recurrencePreset" id="recurrence-preset">
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>
          <div id="recurrence-custom-section" hidden>
            <div class="form-grid two-columns">
              <label>
                <span>Repeats every</span>
                <input name="recurrenceInterval" type="number" value="1" min="1" max="999" />
              </label>
              <label>
                <span>Unit</span>
                <select name="recurrenceFrequency">
                  <option value="daily">Day</option>
                  <option value="weekly">Week</option>
                  <option value="monthly">Month</option>
                  <option value="yearly">Year</option>
                </select>
              </label>
            </div>
            <div id="recurrence-weekday-chips" class="chip-row" hidden>
              <span class="label">Repeats on</span>
              ${['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => `<label class="chip-toggle"><input type="checkbox" name="recurrenceDayOfWeek" value="${d}" /><span>${d}</span></label>`).join('')}
            </div>
            <div id="recurrence-monthly-mode" hidden>
              <label>
                <span>Monthly mode</span>
                <select name="monthlyMode">
                  <option value="dayOfMonth">Day of month</option>
                  <option value="ordinal">Ordinal weekday</option>
                </select>
              </label>
              <div id="recurrence-day-of-month-section">
                <label>
                  <span>Day of month</span>
                  <input name="recurrenceDayOfMonth" type="number" min="1" max="31" value="1" />
                </label>
              </div>
              <div id="recurrence-ordinal-section" hidden>
                <div class="form-grid two-columns">
                  <label>
                    <span>Ordinal</span>
                    <select name="recurrenceOrdinal">
                      <option value="first">First</option>
                      <option value="second">Second</option>
                      <option value="third">Third</option>
                      <option value="fourth">Fourth</option>
                      <option value="fifth">Fifth</option>
                      <option value="last">Last</option>
                    </select>
                  </label>
                  <label>
                    <span>Day</span>
                    <select name="recurrenceOrdinalDay">
                      ${['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => `<option value="${d}">${d}</option>`).join('')}
                    </select>
                  </label>
                </div>
              </div>
            </div>
            <fieldset class="recurrence-ends-fieldset">
              <legend>Ends</legend>
              <div class="end-mode-buttons">
                <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="never" checked /><span>Never</span></label>
                <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="after_n_occurrences" /><span>After N</span></label>
                <label class="end-mode-btn"><input type="radio" name="recurrenceEndMode" value="on_date" /><span>On date</span></label>
              </div>
              <div class="end-mode-detail" data-mode="after_n_occurrences">
                <input type="number" name="recurrenceOccurrenceCount" value="10" min="1" class="inline-number" />
                <span class="recurrence-end-copy">occurrences</span>
              </div>
              <div class="end-mode-detail" data-mode="on_date">
                <input type="date" name="recurrenceEndDate" class="inline-date" />
              </div>
            </fieldset>
          </div>
        </div>
        ` : ''}
        <div id="edit-recurring-status"></div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
          <button type="submit" class="button button-primary">Save changes</button>
        </div>
      </form>
    `,
  });

  document.getElementById('close-modal-button').addEventListener('click', closeModal);
  bindRecurrenceControls();
  if (scope === 'this_and_future' && seriesInfo) {
    populateRecurrenceForm(document.getElementById('edit-recurring-form'), seriesInfo);
  }
  document.getElementById('edit-recurring-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const statusRegion = document.getElementById('edit-recurring-status');
    try {
      const data = new FormData(form);
      const changes = {};
      const title = data.get('titleOrServiceSummary');
      if (title !== job.titleOrServiceSummary) changes.titleOrServiceSummary = title;

      const customerAddressId = data.get('customerAddressId');
      if (customerAddressId !== job.customerAddressId) changes.customerAddressId = customerAddressId;

      const leadSource = data.get('leadSource') || '';
      if (leadSource !== (job.leadSource || '')) changes.leadSource = leadSource;

      const notes = data.get('privateNotes');
      if (notes !== (job.privateNotes || '')) changes.privateNotes = notes;

      const tags = splitTags(data.get('tags'));
      if (JSON.stringify(tags) !== JSON.stringify(job.tags || [])) changes.tags = tags;

      const teamMemberId = data.get('assigneeTeamMemberId');
      if (teamMemberId !== (job.assigneeTeamMemberId || '')) {
        changes.assigneeTeamMemberId = teamMemberId || null;
      }

      let recurrenceRule;
      if (scope === 'this') {
        const start = data.get('scheduledStartAt');
        const end = data.get('scheduledEndAt');
        if (start) changes.scheduledStartAt = toIso(start);
        if (end) changes.scheduledEndAt = toIso(end);
      } else {
        const nextRule = buildRecurrencePayload(form);
        if (!nextRule) {
          throw new Error('Recurring jobs cannot be switched to does not repeat from this modal. Use delete scope actions if you need to stop future occurrences.');
        }
        recurrenceRule = didRecurrenceRuleChange(seriesInfo, nextRule) ? nextRule : undefined;
      }

      if (!Object.keys(changes).length && !recurrenceRule) {
        setFlash('No recurring changes to save.', 'info');
        closeModal();
        return;
      }

      await api.editOccurrence(job.id, scope, changes, recurrenceRule);
      setFlash(scope === 'this' ? 'Occurrence updated.' : 'This and future occurrences updated.', 'success');
      location.reload();
    } catch (error) {
      statusRegion.innerHTML = statusMessage(error.message, 'danger');
    }
  });
}

function openRecurringTeamScopeModal(job, initialTeamMemberId = job.assigneeTeamMemberId || '') {
  openModal({
    title: `${job.assignee?.displayName ? 'Reassign' : 'Assign'} ${job.jobNumber}`,
    body: `
      <div class="stack-gap">
        <p>This job is part of a recurring series. How should assignment changes apply?</p>
        <div class="inline-actions scope-actions">
          <button class="button button-primary" id="team-scope-this">Only this job</button>
          <button class="button" id="team-scope-future">This job and all future jobs</button>
        </div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
        </div>
      </div>
    `,
  });

  document.getElementById('close-modal-button').addEventListener('click', closeModal);
  document.getElementById('team-scope-this').addEventListener('click', () => {
    closeModal();
    openTeamModalWithScope(job, 'this', initialTeamMemberId);
  });
  document.getElementById('team-scope-future').addEventListener('click', () => {
    closeModal();
    openTeamModalWithScope(job, 'this_and_future', initialTeamMemberId);
  });
}

function openTeamModalWithScope(job, scope, initialTeamMemberId = job.assigneeTeamMemberId || '') {
  const activeTeamMembers = getActiveTeamMembers();
  openModal({
    title: `${job.assignee?.displayName ? 'Reassign' : 'Assign'} ${job.jobNumber} — ${scope === 'this' ? 'Only this job' : 'This and future jobs'}`,
    body: `
      <form id="team-scope-form" class="stack-gap modal-form">
        <label>
          <span>Team member</span>
          <select name="teamMemberId">
            <option value="" ${initialTeamMemberId ? '' : 'selected'}>Unassigned</option>
            ${activeTeamMembers.map((m) => `<option value="${m.id}" ${initialTeamMemberId === m.id ? 'selected' : ''}>${escapeHtml(m.displayName)}</option>`).join('')}
          </select>
        </label>
        <div id="team-scope-status"></div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
          <button type="submit" class="button button-primary">Save</button>
        </div>
      </form>
    `,
  });

  document.getElementById('close-modal-button').addEventListener('click', closeModal);
  document.getElementById('team-scope-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const teamMemberId = data.get('teamMemberId');
    try {
      await api.editOccurrence(job.id, scope, { assigneeTeamMemberId: teamMemberId || null });
      setFlash(scope === 'this' ? 'Assignment updated for this occurrence.' : 'Assignment updated for this and future occurrences.', 'success');
      location.reload();
    } catch (error) {
      document.getElementById('team-scope-status').innerHTML = statusMessage(error.message, 'danger');
    }
  });
}

function openDeleteOccurrenceModal(job) {
  openModal({
    title: `Delete occurrence ${job.jobNumber}`,
    body: `
      <div class="stack-gap">
        <p>This job is part of a recurring series. What would you like to delete?</p>
        <div class="inline-actions scope-actions">
          <button class="button button-danger" id="delete-scope-this">This Occurrence</button>
          <button class="button button-danger" id="delete-scope-future">This and Future Occurrences</button>
        </div>
        <div id="delete-occ-status"></div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" id="close-modal-button">Cancel</button>
        </div>
      </div>
    `,
  });

  document.getElementById('close-modal-button').addEventListener('click', closeModal);
  document.getElementById('delete-scope-this').addEventListener('click', async () => {
    try {
      await api.deleteOccurrence(job.id, 'this');
      setFlash('Occurrence deleted.', 'success');
      location.href = '/app/calendar_new';
    } catch (error) {
      document.getElementById('delete-occ-status').innerHTML = statusMessage(error.message, 'danger');
    }
  });
  document.getElementById('delete-scope-future').addEventListener('click', async () => {
    if (!confirm('Delete this occurrence and all future occurrences in the series?')) return;
    try {
      const result = await api.deleteOccurrence(job.id, 'this_and_future');
      setFlash(`${result.deletedCount} occurrences deleted. Series truncated.`, 'success');
      location.href = '/app/calendar_new';
    } catch (error) {
      document.getElementById('delete-occ-status').innerHTML = statusMessage(error.message, 'danger');
    }
  });
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
