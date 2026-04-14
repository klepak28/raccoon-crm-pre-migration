# UI Redesign Acceptance Criteria

## Purpose
These criteria define when the V1 UI redesign is good enough to count as a serious usable CRM module experience within the approved scope.

## Scope
Only:
- Customers
- one-time Jobs
- basic day scheduler assignment flow

No recurrence, invoicing, billing, advanced calendar modes, or bulk actions.

---

## Global acceptance criteria
- screens feel like modules with clear primary actions, not test harnesses
- read state, edit state, and action state are visually distinct
- loading, empty, success, and error states are present where users need them
- navigation between Customers, Customer Detail, Job Detail, and Day Scheduler is clear and reliable
- V1 scope remains narrow and no future modules are exposed as active controls

---

## 1. Customer list acceptance criteria

### Structure
- customer list renders as a real list/table, not a loose stack of links
- list includes enough scan value to identify records quickly
- add-customer entry point is prominent and separate from the list itself

### Behavior
- user can open a customer record from a row click or clear open action
- user can create a customer from a modal or drawer-style flow
- search or quick filter exists if implemented and behaves predictably
- empty state is informative and provides `Add customer`

### Content
Each row should show at least:
- display name
- customer type
- one contact clue (phone or email)
- one address summary clue
- do-not-service state if applicable

### Validation and feedback
- create flow shows inline validation errors
- successful create gives clear confirmation and lands user in the created record

---

## 2. Customer detail acceptance criteria

### Structure
- customer detail has a dedicated record layout
- read mode and edit mode are clearly different
- related jobs are visible in a structured section
- `New job` action is obvious from customer context

### Behavior
- user can edit customer fields and explicitly save or cancel
- cancel leaves persisted data unchanged
- save updates the screen cleanly with visible confirmation
- validation errors appear near the relevant fields

### Content
Customer detail should clearly show at least:
- display identity
- customer type
- do-not-service state
- phones
- emails
- address
- tags
- notes or metadata fields that are in V1

### Related jobs
- jobs section is visible even when empty
- empty state explains there are no jobs yet and offers `Create one-time job`
- user can open a job from this section

---

## 3. Job detail acceptance criteria

### Structure
- job detail makes current state understandable at a glance
- schedule/assignment information is grouped into a clear status/action area
- editable job metadata is separate from scheduling/assignment actions

### Behavior
- user can edit V1-safe one-time job fields
- user can schedule/reschedule through a focused flow
- user can unschedule when scheduled
- user can assign and unassign clearly
- user can navigate back to customer and into scheduler easily

### Content
Job detail should clearly show at least:
- job number
- service summary
- customer reference
- selected address
- current scheduled or unscheduled state
- current assignee or `Unassigned`

### Feedback
- after schedule, unschedule, assign, or unassign, the user sees clear confirmation
- action controls reflect the current state correctly

---

## 4. Day scheduler acceptance criteria

### Structure
- scheduler has a real day-screen layout with toolbar/date controls
- `Unassigned` and assigned lanes are clearly distinct
- lanes remain visible even when empty
- cards read like scheduled work items, not generic list entries

### Behavior
- user can change selected day
- scheduled jobs appear in the correct lane
- user can open job detail from the scheduler
- scheduler state stays understandable when there are zero jobs, many jobs, or mixed assigned/unassigned jobs

### Empty/loading/error states
- empty selected day still renders the scheduler structure
- loading state is visible and not confused with empty state
- error state explains failure and offers retry or recovery path

### Content
Each job card should show at least:
- job number
- customer name
- service summary
- scheduled time range

---

## 5. Validation and feedback acceptance criteria
- customer identity validation is visible and understandable
- invalid email shows field-level error
- invalid schedule range shows field-level or action-level error
- do-not-service scheduling block is visible as actionable feedback, not a silent failure
- success states are shown after create/save/schedule/assign actions

---

## 6. Serious-usable minimum bar
The redesign counts as successful at minimum only if a user can do all of the following without the UI feeling like a dev harness:
1. find or open a customer from the customer list
2. create a customer through a proper creation flow
3. edit a customer and intentionally save or cancel
4. create a one-time job from the customer record
5. understand job schedule and assignment state immediately on job detail
6. schedule, unschedule, assign, and unassign without hunting through stacked raw forms
7. open the day scheduler and understand which jobs are assigned vs unassigned
8. open a job from the scheduler and return without losing context badly

---

## Smallest acceptable V1 UI outcome
The smallest acceptable redesign outcome is:
- customer list table plus add-customer modal
- dedicated customer detail page with read/edit mode
- structured related jobs section
- job detail page with modal-based schedule/edit-team flows
- scheduler page with real toolbar, visible lanes, and solid empty/loading/error states

If any of those are missing, the UI still risks feeling like a prototype shell.

---

## Recommended better V1 UI outcome if time allows
A better V1 outcome, still within scope, includes:
- breadcrumb and contextual headers throughout
- persistent success/error banner system
- stronger lane styling and status badges
- lightweight scheduler quick actions
- preserved context when moving between list/detail/scheduler
- more complete create/edit customer field coverage from the approved V1 plan

That would make the module feel operationally credible, not just usable.
