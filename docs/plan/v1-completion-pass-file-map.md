# V1 Completion Pass File Map

## Purpose
Identify the likely implementation touchpoints for the V1 completion pass.

## Scope
Only:
- Customers
- one-time Jobs
- scheduler/calendar for one-time jobs

No recurrence, invoicing, billing, or bulk actions.

---

## Likely backend/API touchpoints
- `src/api/routes.js`
  - add any minimal scheduler range/view route support if needed
  - add dedicated customer detail route shell

- `src/services/scheduler/services.js`
  - extend schedule query support for week/month ranges if needed

- `src/domain/jobs/job.repository.js`
  - only if minimal range-query support is needed at repository level

- `src/services/customers/services.js`
  - only if customer detail/list shape needs small UX-supportive improvements

---

## Frontend files to restructure or add

### Entry and app shell
- `src/ui/static/app.js`
  - reduce to bootstrap/route mount only

- `src/ui/static/app.css`
  - reduce to imports or base styles only

### New shared structure
- `src/ui/router.js`
- `src/ui/app-shell.js`
- `src/ui/api/client.js`
- `src/ui/state/store.js`
- `src/ui/components/*`
  - page header
  - breadcrumbs
  - modal
  - toast/banner
  - empty state
  - error state
  - loading state
  - badges/chips

### Customers UI
- `src/ui/customers/customers-list-page.js`
- `src/ui/customers/customer-detail-page.js`
- `src/ui/customers/customer-form.js`
- `src/ui/customers/customer-form-modal.js`
- `src/ui/customers/customer-jobs-table.js`

### Jobs UI
- `src/ui/jobs/job-detail-page.js`
- `src/ui/jobs/job-edit-form.js`
- `src/ui/jobs/create-job-modal.js`
- `src/ui/jobs/schedule-job-modal.js`
- `src/ui/jobs/edit-team-modal.js`

### Scheduler UI
- `src/ui/scheduler/scheduler-page.js`
- `src/ui/scheduler/scheduler-toolbar.js`
- `src/ui/scheduler/day-view.js`
- `src/ui/scheduler/week-view.js`
- `src/ui/scheduler/month-view.js`
- `src/ui/scheduler/job-card.js`
- `src/ui/scheduler/date-utils.js`

### Styles
- `src/ui/styles/base.css`
- `src/ui/styles/layout.css`
- `src/ui/styles/customers.css`
- `src/ui/styles/jobs.css`
- `src/ui/styles/scheduler.css`

---

## Likely test files to add or expand
- `tests/ui/first-slice/ui-shell.test.js`
  - expand route coverage

- `tests/integration/customers-jobs-scheduler/flow.test.js`
  - add scheduler-range/view behavior where API support changes

- `tests/unit/scheduler/*.test.js`
  - add week/month date grouping helpers if introduced

- `tests/ui/first-slice/customers-ui.test.js`
- `tests/ui/first-slice/job-detail-ui.test.js`
- `tests/ui/first-slice/scheduler-ui.test.js`

---

## Files that should stay mostly untouched
- `src/services/jobs/services.js`
- `src/validation/jobs/*`
- `src/validation/customers/*` except if small UX-supportive fields require minor surface changes

Business rules should stay stable during this pass.
