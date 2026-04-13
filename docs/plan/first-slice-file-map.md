# First Slice File Map

## Purpose
This is a **proposed implementation file map** for the approved first slice.

## Important note
There is no application source scaffold in the current workspace, so this file map is intentionally framework-agnostic and organized by responsibility rather than by an existing code tree.

## Files to create

### Backend domain and persistence
- `src/domain/customers/customer.model.*`
  - Purpose: customer entity shape and mapping
  - Dependency notes: depends on address/phone/email child models; must stay independent of jobs/invoices

- `src/domain/customers/address.model.*`
  - Purpose: customer address record shape and mapping
  - Dependency notes: referenced by customer and job creation/select-address logic

- `src/domain/customers/customer-phone.model.*`
  - Purpose: customer phone record shape and mapping
  - Dependency notes: customer-owned only in V1

- `src/domain/customers/customer-email.model.*`
  - Purpose: customer email record shape and mapping
  - Dependency notes: customer-owned only in V1

- `src/domain/team-members/team-member.model.*`
  - Purpose: assignable team-member shape for scheduler lanes and job assignment
  - Dependency notes: read-only for V1; do not add `Unassigned` as stored row

- `src/domain/jobs/job.model.*`
  - Purpose: one-time job entity shape and mapping
  - Dependency notes: depends on customer and optional customer address reference; must exclude recurrence and invoice fields in V1

- `src/db/migrations/<timestamp>-create-customers.*`
  - Purpose: create customer table/collection
  - Dependency notes: foundational migration

- `src/db/migrations/<timestamp>-create-customer-addresses.*`
  - Purpose: create customer address storage
  - Dependency notes: depends on customers

- `src/db/migrations/<timestamp>-create-customer-phones.*`
  - Purpose: create customer phone storage
  - Dependency notes: depends on customers

- `src/db/migrations/<timestamp>-create-customer-emails.*`
  - Purpose: create customer email storage
  - Dependency notes: depends on customers

- `src/db/migrations/<timestamp>-create-team-members.*`
  - Purpose: create minimal assignable team-member storage if not already present
  - Dependency notes: keep schema minimal and V1-safe

- `src/db/migrations/<timestamp>-create-jobs.*`
  - Purpose: create one-time job storage with schedule and assignment fields
  - Dependency notes: depends on customers and optional team-members foreign key

### Backend repositories / data access
- `src/domain/customers/customer.repository.*`
  - Purpose: customer read/write operations
  - Dependency notes: used by customer service and job creation flow

- `src/domain/team-members/team-member.repository.*`
  - Purpose: assignable team-member read operations
  - Dependency notes: scheduler and assignment depend on this

- `src/domain/jobs/job.repository.*`
  - Purpose: job read/write operations, including schedule and assignment updates
  - Dependency notes: used by job service and day-schedule service

### Backend services
- `src/services/customers/create-customer.*`
  - Purpose: create customer aggregate with child records
  - Dependency notes: no job/scheduler coupling required

- `src/services/customers/list-customers.*`
  - Purpose: customers list query
  - Dependency notes: minimal list only

- `src/services/customers/get-customer-detail.*`
  - Purpose: customer detail query including jobs summary
  - Dependency notes: reads job repository

- `src/services/customers/update-customer-basic.*`
  - Purpose: V1-safe customer updates
  - Dependency notes: do not add payment/portal/auto-invoice logic

- `src/services/jobs/create-one-time-job.*`
  - Purpose: create job from customer context
  - Dependency notes: must reject recurrence inputs

- `src/services/jobs/get-job-detail.*`
  - Purpose: job detail read
  - Dependency notes: read customer and assignment display info

- `src/services/jobs/schedule-job.*`
  - Purpose: set one-time schedule on a job
  - Dependency notes: depends on do-not-service validation

- `src/services/jobs/unschedule-job.*`
  - Purpose: clear one-time schedule on a job
  - Dependency notes: must follow documented V1 unschedule behavior

- `src/services/jobs/assign-job.*`
  - Purpose: assign a job to one active team member
  - Dependency notes: do not support multi-assignee in V1

- `src/services/jobs/unassign-job.*`
  - Purpose: return job to `Unassigned`
  - Dependency notes: represented by null/empty assignee reference

- `src/services/scheduler/get-day-schedule.*`
  - Purpose: return scheduler lanes and scheduled jobs for one date
  - Dependency notes: depends on team members and scheduled jobs only

### Backend validation
- `src/validation/customers/customer-input.validator.*`
  - Purpose: validate customer create/update input
  - Dependency notes: shared by create/update handlers

- `src/validation/jobs/job-input.validator.*`
  - Purpose: validate job create input for V1 one-time jobs
  - Dependency notes: explicitly exclude recurrence/billing fields

- `src/validation/jobs/schedule-job.validator.*`
  - Purpose: validate schedule action input
  - Dependency notes: enforce start/end ordering

- `src/validation/jobs/assign-job.validator.*`
  - Purpose: validate assignee input
  - Dependency notes: nullable for unassigned only through correct action path

### API handlers/controllers/routes
- `src/api/customers/customers.routes.*`
  - Purpose: mount customer list/create/detail/update routes
  - Dependency notes: no invoice/customer-tab expansion in V1

- `src/api/customers/customers.controller.*`
  - Purpose: customer HTTP handlers
  - Dependency notes: delegates to customer services only

- `src/api/jobs/jobs.routes.*`
  - Purpose: mount job detail/schedule/assign actions
  - Dependency notes: no recurrence or invoice actions

- `src/api/jobs/jobs.controller.*`
  - Purpose: job HTTP handlers
  - Dependency notes: delegates to one-time job services only

- `src/api/scheduler/scheduler.routes.*`
  - Purpose: mount `GET /schedule/day`
  - Dependency notes: day view only

- `src/api/scheduler/scheduler.controller.*`
  - Purpose: scheduler HTTP handlers
  - Dependency notes: returns one-time scheduled jobs only

- `src/api/team-members/team-members.routes.*`
  - Purpose: mount minimal assignable team-member lookup route
  - Dependency notes: read-only

### Frontend UI
- `src/ui/customers/customers-list.*`
  - Purpose: customers list and empty state
  - Dependency notes: entry point to add customer modal

- `src/ui/customers/add-customer-modal.*`
  - Purpose: V1 customer create flow
  - Dependency notes: must remain limited to approved field set

- `src/ui/customers/customer-detail.*`
  - Purpose: customer detail summary and jobs list
  - Dependency notes: must not expose excluded tabs/features as active V1 flows

- `src/ui/jobs/create-job-modal-or-page.*`
  - Purpose: create one-time job from customer context
  - Dependency notes: one-time only

- `src/ui/jobs/job-detail.*`
  - Purpose: one-time job detail with schedule and assignment actions
  - Dependency notes: hide invoice/recurrence controls

- `src/ui/jobs/schedule-job-modal.*`
  - Purpose: V1 schedule modal with one-time fields only
  - Dependency notes: no repeats, no find-a-time tab in V1

- `src/ui/jobs/edit-team-modal.*`
  - Purpose: assign/unassign job
  - Dependency notes: use active team-member lookup

- `src/ui/scheduler/day-scheduler.*`
  - Purpose: one-day time grid with assignee lanes
  - Dependency notes: no week/month/dispatch/map logic

- `src/ui/scheduler/schedule-card.*`
  - Purpose: scheduled one-time job card renderer
  - Dependency notes: click-through to job detail

### Tests
- `tests/unit/customers/*.test.*`
  - Purpose: customer validators and services
  - Dependency notes: no invoice logic

- `tests/unit/jobs/*.test.*`
  - Purpose: job create/schedule/assign/unschedule services
  - Dependency notes: V1 one-time job rules only

- `tests/unit/scheduler/*.test.*`
  - Purpose: day-lane grouping and schedule query behavior
  - Dependency notes: `Unassigned` pseudo-lane invariant

- `tests/integration/customers-jobs-scheduler/*.test.*`
  - Purpose: end-to-end slice flow tests
  - Dependency notes: cover customer -> job -> schedule -> assign path

- `tests/ui/first-slice/*.test.*`
  - Purpose: UI smoke and interaction tests
  - Dependency notes: keep to approved V1 screens only

### Documentation
- `docs/plan/first-slice-api-contracts.md`
  - Purpose: minimal API contract notes once implementation details are chosen
  - Dependency notes: derived from this slice only, not broader platform API

- `docs/plan/first-slice-known-decisions.md`
  - Purpose: capture V1 implementation choices such as unschedule behavior
  - Dependency notes: update when ambiguous items are resolved for code review

## Files to modify

### Existing docs to update after implementation starts
- `docs/plan/first-build-slice.md`
  - Purpose: reflect any approved clarifications discovered during implementation
  - Dependency notes: must not expand scope silently

- `docs/architecture/domain-model.md`
  - Purpose: mark which V1 subset of entities is implemented
  - Dependency notes: do not backfill recurrence/invoice code into V1

- `docs/architecture/state-transitions.md`
  - Purpose: document the final V1 decision for unschedule behavior and minimal job state dimensions
  - Dependency notes: keep non-V1 sections clearly future-facing

## Dependency notes summary
- Customer is foundational for Job.
- TeamMember lookup is required before assignment and day-view lane rendering.
- Job scheduling depends on Customer and optional address selection.
- Day scheduler depends on scheduled Jobs plus TeamMember lookup.
- No V1 file should depend on recurrence, occurrence, invoice, payment, or billing modules.

## Review guardrails
- if a proposed file introduces recurrence concepts, it is out of slice
- if a proposed file introduces invoice concepts, it is out of slice
- if a proposed file assumes missing framework conventions, keep the final implementation review explicit before code begins
