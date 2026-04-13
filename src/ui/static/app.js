const app = document.getElementById('app');

const state = {
  teamMembers: [],
};

boot().catch(renderFatal);

async function boot() {
  await loadTeamMembers();
  await renderRoute();
}

async function renderRoute() {
  if (location.pathname === '/' || location.pathname === '/app/customers/list') {
    await renderCustomersPage();
    return;
  }

  if (location.pathname === '/app/calendar_new') {
    await renderSchedulerPage();
    return;
  }

  const jobMatch = location.pathname.match(/^\/app\/jobs\/([^/]+)$/);
  if (jobMatch) {
    await renderJobDetailPage(jobMatch[1]);
    return;
  }

  app.innerHTML = `<div class="card"><h1>Not found</h1></div>`;
}

async function loadTeamMembers() {
  const response = await fetch('/api/team-members');
  const payload = await response.json();
  state.teamMembers = payload.items;
}

function layout(title, content) {
  app.innerHTML = `
    <nav class="topbar card">
      <strong>${title}</strong>
      <div class="topbar-links">
        <a href="/app/customers/list">Customers</a>
        <a href="/app/calendar_new">Day Scheduler</a>
      </div>
    </nav>
    ${content}
  `;
}

async function renderCustomersPage() {
  const customerId = new URLSearchParams(location.search).get('customerId');
  if (customerId) {
    await renderCustomerDetailPage(customerId);
    return;
  }

  const customers = await getJson('/api/customers');

  layout('Customers', `
    <section class="grid two-up">
      <div class="card">
        <h1>Manage your customers</h1>
        <p>Create the minimum V1 customer record with one address, optional phones/emails, and tags.</p>
        <form id="customer-form" class="stack">
          <input name="displayName" placeholder="Display name" />
          <input name="firstName" placeholder="First name" />
          <input name="lastName" placeholder="Last name" />
          <input name="companyName" placeholder="Company" />
          <select name="customerType">
            <option>Homeowner</option>
            <option>Business</option>
          </select>
          <input name="mobilePhone" placeholder="Mobile phone" />
          <input name="email" placeholder="Email" />
          <input name="street" placeholder="Street" />
          <input name="unit" placeholder="Unit" />
          <input name="city" placeholder="City" />
          <input name="state" placeholder="State (US abbr)" />
          <input name="zip" placeholder="Zip" />
          <input name="tags" placeholder="Tags, comma separated" />
          <label><input type="checkbox" name="doNotService" /> Do not service</label>
          <label><input type="checkbox" name="sendNotifications" checked /> Send notifications</label>
          <button type="submit">Create customer</button>
        </form>
        <div id="customer-form-status" class="status"></div>
      </div>
      <div class="card">
        <h2>Customer list</h2>
        <div class="stack">
          ${customers.items.length === 0 ? '<p>No customers yet.</p>' : customers.items.map((customer) => `
            <a class="list-row" href="/app/customers/list?customerId=${customer.id}">
              <strong>${escapeHtml(customer.displayName)}</strong>
              <span>${escapeHtml(customer.customerType)}</span>
            </a>`).join('')}
        </div>
      </div>
    </section>
  `);

  document.getElementById('customer-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('customer-form-status');
    try {
      const payload = formToJson(event.currentTarget);
      const result = await sendJson('/api/customers', payload);
      status.textContent = 'Customer created.';
      location.href = `/app/customers/list?customerId=${result.item.id}`;
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

async function renderCustomerDetailPage(customerId) {
  const customer = await getJson(`/api/customers/${customerId}`);

  layout('Customer detail', `
    <section class="grid two-up">
      <div class="card stack">
        <a href="/app/customers/list">← Back to customers</a>
        <h1>${escapeHtml(customer.item.displayName)}</h1>
        <p>${escapeHtml(customer.item.customerType)}${customer.item.doNotService ? ' · Do not service' : ''}</p>
        <div><strong>Phones:</strong> ${customer.item.phones.map((phone) => escapeHtml(phone.value)).join(', ') || 'None'}</div>
        <div><strong>Emails:</strong> ${customer.item.emails.map((email) => escapeHtml(email.value)).join(', ') || 'None'}</div>
        <div><strong>Addresses:</strong></div>
        <ul>
          ${customer.item.addresses.map((address) => `<li>${escapeHtml(formatAddress(address))}</li>`).join('') || '<li>No addresses</li>'}
        </ul>
        <div><strong>Tags:</strong> ${customer.item.tags.join(', ') || 'None'}</div>
      </div>
      <div class="card stack">
        <h2>Create one-time job</h2>
        <form id="job-form" class="stack">
          <input name="titleOrServiceSummary" placeholder="Service summary" required />
          <select name="customerAddressId" required>
            ${customer.item.addresses.map((address) => `<option value="${address.id}">${escapeHtml(formatAddress(address))}</option>`).join('')}
          </select>
          <input name="leadSource" placeholder="Lead source" />
          <input name="tags" placeholder="Tags, comma separated" />
          <textarea name="privateNotes" placeholder="Private notes"></textarea>
          <button type="submit">Create job</button>
        </form>
        <div id="job-form-status" class="status"></div>
      </div>
    </section>
    <section class="card stack">
      <h2>Jobs</h2>
      ${customer.item.jobs.length === 0 ? '<p>No jobs yet.</p>' : customer.item.jobs.map((job) => `
        <a class="list-row" href="/app/jobs/${job.id}">
          <strong>${escapeHtml(job.jobNumber)}</strong>
          <span>${escapeHtml(job.titleOrServiceSummary)}</span>
          <span>${job.scheduleState === 'scheduled' ? escapeHtml(formatDateRange(job.scheduledStartAt, job.scheduledEndAt)) : 'Unscheduled'}</span>
        </a>
      `).join('')}
    </section>
  `);

  document.getElementById('job-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('job-form-status');
    try {
      const payload = formToJson(event.currentTarget);
      const result = await sendJson(`/api/customers/${customerId}/jobs`, payload);
      status.textContent = 'Job created.';
      location.href = `/app/jobs/${result.item.id}`;
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

async function renderJobDetailPage(jobId) {
  const [job, teamMembers] = await Promise.all([
    getJson(`/api/jobs/${jobId}`),
    getJson('/api/team-members'),
  ]);
  const item = job.item;

  layout('Job detail', `
    <section class="grid two-up">
      <div class="card stack">
        <a href="/app/customers/list?customerId=${item.customer.id}">← Back to customer</a>
        <h1>${escapeHtml(item.jobNumber)}</h1>
        <div><strong>Customer:</strong> ${escapeHtml(item.customer.displayName)}</div>
        <div><strong>Address:</strong> ${escapeHtml(formatAddress(item.address || {}))}</div>
        <div><strong>Service:</strong> ${escapeHtml(item.titleOrServiceSummary)}</div>
        <div><strong>Schedule:</strong> ${item.scheduleState === 'scheduled' ? escapeHtml(formatDateRange(item.scheduledStartAt, item.scheduledEndAt)) : 'Unscheduled'}</div>
        <div><strong>Assignee:</strong> ${escapeHtml(item.assignee?.displayName || 'Unassigned')}</div>
      </div>
      <div class="card stack">
        <h2>Schedule job</h2>
        <form id="schedule-form" class="stack">
          <input name="scheduledStartAt" type="datetime-local" required />
          <input name="scheduledEndAt" type="datetime-local" required />
          <button type="submit">Save schedule</button>
        </form>
        <button id="unschedule-button" ${item.scheduleState !== 'scheduled' ? 'disabled' : ''}>Undo Schedule</button>
        <div id="schedule-status" class="status"></div>
      </div>
    </section>
    <section class="card stack">
      <h2>Edit team</h2>
      <form id="assign-form" class="stack">
        <select name="teamMemberId">
          ${teamMembers.items.map((member) => `<option value="${member.id}" ${item.assigneeTeamMemberId === member.id ? 'selected' : ''}>${escapeHtml(member.displayName)}</option>`).join('')}
        </select>
        <div class="inline-actions">
          <button type="submit">Assign</button>
          <button type="button" id="unassign-button">Set Unassigned</button>
        </div>
      </form>
      <div id="assign-status" class="status"></div>
    </section>
  `);

  const scheduleForm = document.getElementById('schedule-form');
  if (item.scheduledStartAt) scheduleForm.elements.scheduledStartAt.value = toDateTimeLocal(item.scheduledStartAt);
  if (item.scheduledEndAt) scheduleForm.elements.scheduledEndAt.value = toDateTimeLocal(item.scheduledEndAt);

  scheduleForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('schedule-status');
    try {
      const payload = formToJson(event.currentTarget);
      payload.scheduledStartAt = toIso(payload.scheduledStartAt);
      payload.scheduledEndAt = toIso(payload.scheduledEndAt);
      await sendJson(`/api/jobs/${jobId}/schedule`, payload);
      status.textContent = 'Schedule saved.';
      await renderJobDetailPage(jobId);
    } catch (error) {
      status.textContent = error.message;
    }
  });

  document.getElementById('unschedule-button').addEventListener('click', async () => {
    const status = document.getElementById('schedule-status');
    try {
      await sendJson(`/api/jobs/${jobId}/unschedule`, {});
      status.textContent = 'Job unscheduled.';
      await renderJobDetailPage(jobId);
    } catch (error) {
      status.textContent = error.message;
    }
  });

  document.getElementById('assign-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('assign-status');
    try {
      const payload = formToJson(event.currentTarget);
      await sendJson(`/api/jobs/${jobId}/assign`, payload);
      status.textContent = 'Assignee updated.';
      await renderJobDetailPage(jobId);
    } catch (error) {
      status.textContent = error.message;
    }
  });

  document.getElementById('unassign-button').addEventListener('click', async () => {
    const status = document.getElementById('assign-status');
    try {
      await sendJson(`/api/jobs/${jobId}/unassign`, {});
      status.textContent = 'Job is now unassigned.';
      await renderJobDetailPage(jobId);
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

async function renderSchedulerPage() {
  const params = new URLSearchParams(location.search);
  const date = params.get('date') || new Date().toISOString().slice(0, 10);
  const schedule = await getJson(`/api/schedule/day?date=${date}`);

  layout('Day scheduler', `
    <section class="card stack">
      <form id="date-form" class="inline-actions">
        <input type="date" name="date" value="${date}" />
        <button type="submit">Load day</button>
      </form>
      <div class="scheduler-grid">
        ${schedule.item.lanes.map((lane) => `
          <div class="scheduler-lane">
            <h3>${escapeHtml(lane.label)}</h3>
            ${lane.jobs.length === 0 ? '<p class="muted">No scheduled jobs</p>' : lane.jobs.map((job) => `
              <a class="schedule-card" href="/app/jobs/${job.id}">
                <strong>${escapeHtml(job.jobNumber)}</strong>
                <span>${escapeHtml(job.customer?.displayName || 'Unknown customer')}</span>
                <span>${escapeHtml(job.titleOrServiceSummary)}</span>
                <span>${escapeHtml(formatDateRange(job.scheduledStartAt, job.scheduledEndAt))}</span>
              </a>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </section>
  `);

  document.getElementById('date-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const picked = new FormData(event.currentTarget).get('date');
    location.href = `/app/calendar_new?date=${picked}`;
  });
}

async function getJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'Request failed');
  return payload;
}

async function sendJson(url, payload, method = 'POST') {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'Request failed');
  return result;
}

function formToJson(form) {
  const data = new FormData(form);
  const output = {};
  for (const [key, value] of data.entries()) {
    if (value === '') continue;
    output[key] = value;
  }
  for (const element of form.querySelectorAll('input[type="checkbox"]')) {
    output[element.name] = element.checked;
  }
  return output;
}

function formatAddress(address) {
  return [address.street, address.unit, address.city, address.state, address.zip].filter(Boolean).join(', ');
}

function formatDateRange(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.toLocaleString()} → ${end.toLocaleString()}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderFatal(error) {
  app.innerHTML = `<div class="card"><h1>Something went wrong</h1><pre>${escapeHtml(error.message)}</pre></div>`;
}

function toDateTimeLocal(iso) {
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(localDateTime) {
  return new Date(localDateTime).toISOString();
}
