# UI Redesign Plan, V1 Customers and Scheduler

## Purpose
Redesign the existing V1 UI so it feels like real CRM modules instead of a demo shell, without changing product scope.

## Scope
In scope only:
- Customers
- one-time Jobs
- basic day scheduler assignment flow

Out of scope:
- recurrence
- invoicing
- billing
- week/month/dispatch/map modes
- bulk actions
- unrelated future modules

---

## Brutal assessment of the current UI
The current UI is functional, but it is not a serious CRM module experience.

### What is too thin
- customer list is just a split page with a raw create form beside a minimal list
- customer detail is mostly a readout with no real editing workflow
- job detail is three stacked forms, not a coherent operational screen
- scheduler is a grouped lane list, not a usable dispatch surface
- navigation is weak, page context is weak, and state feedback is weak

### What is misleading
- the page chrome suggests a product, but the screens behave like test harnesses
- job actions look always-available, but there is little distinction between view state, edit state, and action state
- customer detail looks like a record page, but it does not provide a serious edit/save/cancel workflow
- scheduler looks like a board, but it does not provide clear reschedule/assign entry points from the board itself

### What is non-functional or insufficiently functional
- no real customer search/filter workflow
- no proper create/edit customer separation
- no explicit save/cancel editing state on customer detail
- no visible inline field validation structure
- no loading/empty/error states beyond bare text
- no serious scheduler affordance beyond clicking into jobs

---

## Design principles for this redesign
1. Prefer practical usability over polish.
2. Make screens feel like modules with clear primary actions.
3. Separate read state, edit state, and action state.
4. Keep V1 scope narrow, but make the narrow scope feel intentional.
5. Do not fake future modules with dead controls.
6. Use layout and interaction clarity, not decorative UI, to feel “real”.

---

## Recommended route structure
Keep existing routes as anchors, but improve structure.

### Keep
- `/app/customers/list`
- `/app/calendar_new`
- `/app/jobs/:jobId`

### Add or formalize within current V1 scope
- `/app/customers/:customerId`
  - dedicated customer detail route instead of overloading query string state
- `/app/customers/list?new=1`
  - optional lightweight modal/open-state trigger if modal routing is not implemented fully
- `/app/calendar_new?date=YYYY-MM-DD&jobId=:jobId`
  - optional deep-link for scheduler-to-job context if useful

### Replace current route behavior
- stop using `/app/customers/list?customerId=...` as the primary customer-detail navigation model
- move customer detail to a true record route

---

## Screen redesign

## 1. Customer list module
### Goal
A real customer index screen with clear navigation, creation entry, and quick scan value.

### Replace current screen with
#### Header bar
- title: `Customers`
- subtitle: short one-line purpose or result count
- primary action: `Add customer`
- secondary action: simple search/filter input

#### Main content
Two-column responsive layout:
- left: filter/search rail or compact toolbar area
- right: customer table/list card

### Customer list structure
Use a real list/table with columns:
- Customer
- Type
- Primary phone
- Primary email
- Primary address summary
- Tags
- Status (`Do not service` badge if applicable)

### Minimum interactions required
- click row opens customer record
- search filters by display name, company, phone, or tag if feasible
- empty state has:
  - message
  - `Add customer`
  - optional `Clear search` if empty due to filter

### Add customer experience
Replace inline form with a real modal or right-side drawer.

#### Modal sections
1. Basic identity
   - display name
   - first name
   - last name
   - company
   - role
   - customer type
2. Contact
   - primary phone
   - primary email
   - one additional phone row
   - one additional email row
3. Address
   - street
   - unit
   - city
   - state
   - zip
   - address notes
4. Metadata
   - tags
   - customer notes
   - lead source
   - referred by
   - do-not-service
   - send notifications

#### Footer
- `Cancel`
- `Create customer`

### Validation and feedback
- inline field errors under fields
- form-level error summary if submit fails
- success toast/banner then redirect to new customer record

---

## 2. Customer detail module
### Goal
A real record page with clear read/edit modes and a useful related-jobs section.

### Screen structure
#### Top record header
- breadcrumb: `Customers / {Customer Name}`
- title: display name
- subline: customer type, do-not-service badge, primary phone/email
- actions:
  - `Edit`
  - `New job`
  - back link to customer list

#### Main body layout
Two-column desktop layout:
- left primary column: profile and related jobs
- right secondary column: quick facts and action panels

### Primary sections
#### Profile card
Read mode shows:
- identity fields
- phones
- emails
- main address
- tags
- notes
- lead source / referred by
- send notifications / do-not-service states

#### Edit mode
- same fields rendered as inputs
- explicit `Save changes`
- explicit `Cancel`
- unsaved-change warning if leaving edit mode
- validation messages inline

#### Related jobs section
Use a compact table, not loose cards:
- Job #
- Service summary
- Schedule status / date
- Assignee
- open action

#### Create one-time job panel or modal
Preferred: modal or drawer launched from `New job`
- service summary
- address selector
- lead source
- tags
- private notes
- `Create job`

### Minimum interactions required
- open record from customer list
- enter edit mode
- save changes and see updated read view
- cancel edit without mutating data
- create job from customer context
- open related job from jobs section

### Validation and feedback
- field-level errors
- sticky form action bar if form is long
- success feedback after save/create
- empty jobs section should say `No jobs yet` with `Create one-time job`

---

## 3. Job detail module
### Goal
A coherent operational job page, not a cluster of forms.

### Screen structure
#### Header
- breadcrumb: `Customers / {Customer} / {Job #}`
- title: job number + service summary
- subline badges:
  - `Scheduled` or `Unscheduled`
  - `Assigned` or `Unassigned`
- actions:
  - `Edit job`
  - `Schedule` / `Reschedule`
  - `Edit team`
  - `Undo Schedule` when scheduled
  - `Open in scheduler`

### Main layout
Two-column layout:
- left: job overview and editable metadata
- right: schedule/assignment summary and quick actions

### Sections
#### Job overview
- customer
- selected address
- service summary
- lead source
- tags
- private notes

#### Schedule summary card
- scheduled date/time or unscheduled message
- assignee summary
- clear status badge
- buttons:
  - `Schedule` or `Reschedule`
  - `Undo Schedule`
  - `Edit team`

#### Edit job mode
Allow editing only V1-safe job fields:
- service summary
- selected address
- lead source
- tags
- private notes

#### Schedule action
Use a modal, not an always-open form.
Fields:
- start date
- start time
- end date
- end time

Footer:
- `Cancel`
- `Save schedule`

#### Edit team action
Use a modal or side sheet.
- search/select active team member
- explicit `Set unassigned`
- `Cancel`
- `Save`

### Minimum interactions required
- understand current job state at a glance
- edit job metadata without confusion
- schedule/reschedule cleanly
- assign/unassign cleanly
- open customer or scheduler from job page

### Feedback
- action-specific success messages
- action buttons disabled while request is in flight
- after schedule/assign changes, screen updates without full confusion or jumpiness

---

## 4. Day scheduler module
### Goal
A usable day scheduling surface inside V1 limits, even if it remains simpler than the full source product.

### Replace current grouped list with
#### Scheduler shell
- page title: `Day Scheduler`
- date controls:
  - previous day
  - selected date input/button
  - next day
  - `Today`
- optional compact filter input for job/customer search within day results if feasible

### Layout
#### Left sidebar
- mini date navigator or compact date picker area
- lane visibility toggles if lightweight enough
- selected date context

#### Main grid area
A real day-board layout with:
- visible lane headers for `Unassigned` and each active team member
- each lane visually distinct
- scheduled job cards grouped clearly inside lane columns
- if full time positioning is too much for this pass, use stacked time-sorted cards with strong time chips, but frame the layout as a scheduler column board, not a generic list

### Lane treatment
- `Unassigned` lane should be visually distinct, likely first and muted/warning-tinted
- assigned lanes should show team initials/name clearly
- empty lanes still render visibly with empty-state copy

### Job card contents
- job number
- customer name
- service summary
- schedule time range
- assignment state indicator

### Scheduler interactions
Minimum required:
- click card opens job detail
- card includes small quick actions if feasible within scope:
  - `Assign` for unassigned cards
  - `Reschedule` for scheduled cards
  - but only if these reuse the same V1 modals and do not create new business flows

### Empty and error states
- no jobs for selected day: still show lanes and board structure
- loading state: skeleton lanes/cards or loading labels
- error state: inline retry panel

---

## Required UI components

### Shared app shell
- top navigation
- page header
- breadcrumb
- feedback banner/toast area
- loading placeholder styles
- empty state component
- inline error state component

### Customer components
- customer table/list
- add/edit customer modal or drawer
- contact summary block
- address summary block
- tags/chips display
- editable form section with save/cancel footer
- related jobs table

### Job components
- job header/status badges
- job metadata form
- schedule summary card
- schedule modal
- edit-team modal
- action feedback banner

### Scheduler components
- day toolbar
- lane header
- lane column
- job card
- empty lane state
- loading grid state

---

## State handling expectations

### General
- one source of truth per screen
- clear separation between:
  - initial loading
  - loaded state
  - edit dirty state
  - save pending state
  - save success/error state

### Customer list
- retain search/filter input while navigating back from detail if possible
- reflect created/edited customer immediately in list state after return/refetch

### Customer detail
- read mode by default
- edit mode is explicit
- cancel restores last persisted values
- save updates record and exits edit mode

### Job detail
- action modals operate on current job snapshot
- after successful schedule/assign/unschedule/unassign, refresh job summary cleanly

### Scheduler
- date selection updates results predictably
- moving from scheduler to job detail and back should preserve selected date if feasible

---

## Validation and user feedback expectations

### Customer forms
- required identity feedback near `displayName` / `firstName`
- invalid email shown inline
- invalid state abbreviation shown inline
- phone can show warning styling, not necessarily hard block
- do-not-service helper text explains scheduling restriction

### Job forms
- service summary required
- address required
- save disabled when invalid

### Scheduling
- start/end required
- end must be after start
- clear inline error if scheduling blocked by do-not-service customer

### Assignment
- only active team members selectable
- clear feedback when set to unassigned

### Global feedback
Use lightweight banners/toasts for success:
- `Customer saved`
- `Job created`
- `Schedule updated`
- `Job unscheduled`
- `Assignment updated`

---

## Pages to replace or heavily rework
- current `/app/customers/list` screen: replace almost entirely
- current customer-detail-on-query-string state: replace with dedicated route screen
- current `/app/jobs/:jobId` screen: heavily rework
- current `/app/calendar_new` screen: heavily rework

---

## Minimum interactions required for “serious usable V1 module”
A serious usable V1 outcome requires all of these to feel coherent, not just technically possible:
1. open Customers and scan/find a record quickly
2. create a customer in a proper create flow with validation
3. open customer detail and edit it with save/cancel behavior
4. create a one-time job from the customer record
5. open job detail and understand status instantly
6. schedule/reschedule/unschedule without hunting through raw forms
7. assign/unassign from job detail clearly
8. open scheduler and understand lane state quickly
9. open job detail from scheduler with preserved context
10. recover cleanly from empty/loading/error states

---

## Recommended implementation order
1. shared app shell and navigation cleanup
2. customer list redesign with real list/table and add-customer modal
3. dedicated customer detail route with read/edit mode and related jobs table
4. job detail redesign with action-focused layout and modals
5. scheduler redesign with stronger lane board, toolbar, and empty/loading/error states
6. UI regression tests and acceptance pass

---

## Smallest acceptable V1 UI outcome
If time is tight, this is the minimum acceptable redesign:
- dedicated customer detail route
- customer list table with search and add-customer modal
- customer detail read/edit mode with save/cancel
- job detail with action buttons and modal-based schedule/edit-team flows
- scheduler with clear lane board, date toolbar, and real empty/loading/error states

This would still be visually simple, but no longer feel like a demo harness.

---

## Recommended better V1 UI outcome if time allows
If there is room for one stronger pass within the same scope:
- add persistent breadcrumb/header context
- add tags as chips and status badges
- make `Unassigned` lane visually distinct
- add lightweight quick actions from scheduler cards
- preserve customer list filter and scheduler date context across navigation
- add skeleton loading states instead of raw text placeholders

That would make the module feel operationally real without widening scope.
