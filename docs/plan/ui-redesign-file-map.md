# UI Redesign File Map

## Purpose
This file map identifies the frontend files that should be replaced, split, or added to turn the current thin shell into a serious usable V1 CRM module.

## Scope
Only V1 UI redesign for:
- Customers
- one-time Jobs
- basic day scheduler assignment flow

No recurrence, invoicing, billing, or advanced calendar modes.

---

## Current files that should be reworked heavily
- `src/ui/static/app.js`
  - current file is too monolithic
  - should be split by page, component, state, and API helpers

- `src/ui/static/app.css`
  - current styles are global shell/demo styles only
  - should be replaced by screen/component-oriented styling

---

## Recommended frontend structure

### App shell and routing
- `src/ui/app-shell.js`
  - top navigation
  - layout wrapper
  - feedback banner/toast mount
  - breadcrumb/header rendering

- `src/ui/router.js`
  - route matching and screen mounting
  - support dedicated customer detail route

- `src/ui/state/store.js`
  - simple shared UI state for:
    - current route context
    - scheduler selected date
    - transient feedback
    - loading/error flags where shared behavior helps

- `src/ui/api/client.js`
  - fetch wrapper
  - standardized error handling
  - request helpers per entity/action

### Shared UI components
- `src/ui/components/page-header.js`
- `src/ui/components/breadcrumbs.js`
- `src/ui/components/empty-state.js`
- `src/ui/components/error-state.js`
- `src/ui/components/loading-state.js`
- `src/ui/components/toast.js`
- `src/ui/components/modal.js`
- `src/ui/components/form-field.js`
- `src/ui/components/status-badge.js`
- `src/ui/components/tag-chip.js`

### Customers module
- `src/ui/customers/customers-list-page.js`
  - customers table/list screen
  - search/filter toolbar
  - add-customer launch

- `src/ui/customers/customer-list-table.js`
  - row rendering
  - status/tag display

- `src/ui/customers/customer-form-modal.js`
  - create-customer flow
  - V1-safe fields only
  - inline validation

- `src/ui/customers/customer-detail-page.js`
  - dedicated customer record page
  - read/edit mode orchestration

- `src/ui/customers/customer-profile-card.js`
  - summary/contact/address/tags render

- `src/ui/customers/customer-edit-form.js`
  - edit mode with save/cancel behavior

- `src/ui/customers/customer-jobs-table.js`
  - related jobs table in customer context

### Jobs module
- `src/ui/jobs/job-detail-page.js`
  - action-driven job page

- `src/ui/jobs/job-summary-card.js`
  - current job snapshot

- `src/ui/jobs/job-edit-form.js`
  - V1-safe editable job fields only

- `src/ui/jobs/job-schedule-summary.js`
  - schedule/assignment summary card

- `src/ui/jobs/schedule-job-modal.js`
  - schedule/reschedule modal

- `src/ui/jobs/edit-team-modal.js`
  - assign/unassign flow

- `src/ui/jobs/create-job-modal.js`
  - create job from customer context

### Scheduler module
- `src/ui/scheduler/day-scheduler-page.js`
  - scheduler screen orchestration

- `src/ui/scheduler/day-toolbar.js`
  - today/prev/next/date controls

- `src/ui/scheduler/lane-board.js`
  - overall lane layout

- `src/ui/scheduler/lane-column.js`
  - one lane, including empty state

- `src/ui/scheduler/job-card.js`
  - scheduled job card

- `src/ui/scheduler/scheduler-sidebar.js`
  - optional mini date/filter context rail if implemented

### Styles
- `src/ui/styles/base.css`
- `src/ui/styles/layout.css`
- `src/ui/styles/forms.css`
- `src/ui/styles/customers.css`
- `src/ui/styles/jobs.css`
- `src/ui/styles/scheduler.css`

---

## Route/API touchpoints likely to need light updates

### Route behavior updates
- `src/api/routes.js`
  - add dedicated `/app/customers/:customerId` shell route
  - possibly support better route mounting for UI screens

### Likely backend/API can stay mostly unchanged
The redesign should mostly reuse existing V1 endpoints, but may need clearer frontend consumption of:
- customer list
- customer detail
- customer PATCH
- job detail
- job PATCH
- schedule/unschedule
- assign/unassign
- day schedule
- team members list

If API shape tweaks are needed for UI clarity, keep them minimal and V1-safe.

---

## Tests to update or add during redesign
- `tests/ui/first-slice/*.test.js`
  - expand beyond shell smoke tests
  - cover actual module interactions and screen states

- `tests/integration/customers-jobs-scheduler/*.test.js`
  - add API/UI contract checks only if redesign requires small route clarifications

---

## Files likely to be retired or reduced
- `src/ui/static/app.js`
  - should become a small bootstrap entrypoint only

- `src/ui/static/app.css`
  - should become a small import/entry stylesheet only, or be removed if the static approach changes within the same scaffold

---

## Smallest acceptable implementation footprint
If the redesign must stay lean, the minimum split should still be:
- `app-shell`
- `router`
- customers list page
- customer detail page
- job detail page
- day scheduler page
- modal component
- shared API client

That is the minimum structure that stops the UI from remaining a single demo script.
