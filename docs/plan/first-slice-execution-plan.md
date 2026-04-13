# First Slice Execution Plan

## Scope lock
This plan stays strictly within the approved first slice:
- Customers
- one-time Jobs
- basic day scheduler assignment flow

Explicitly excluded:
- recurring series
- occurrence generation
- invoicing
- invoice snapshot logic
- billing workflows

## Input note
This plan does **not** rely on `/docs/api/*` because those files are not present in the workspace.
API/actions below are the minimum needed for this slice only.

## Scaffold assumption
Because no app scaffold currently exists in the workspace, implementation assumes a new single-repo application rooted here with:
- `src/` for code
- `tests/` for tests
- `docs/` for planning and architecture

Within that scaffold, the proposed file map is the normative V1 structure unless intentionally superseded later.

## Goal
Deliver the smallest reviewable implementation that supports:
1. create customer
2. view customer detail
3. create one-time job for customer
4. schedule job once
5. assign or unassign job
6. show scheduled jobs in day view by assignee or `Unassigned`
7. edit one-time schedule and assignment from job detail

---

## Implementation order

### Phase 1: domain and schema foundation
1. define V1-only entities and state boundaries
2. create schema/migrations for customer, contact subrecords, team member lookup, and one-time job scheduling fields
3. add seed or fixture support for team members

### Phase 2: backend CRUD and scheduling actions
1. customer create/list/detail/update
2. one-time job create/detail/update
3. one-time schedule action
4. unschedule action
5. assign/unassign action
6. day-schedule query

### Phase 3: frontend customer and job flows
1. customers list
2. add customer modal
3. customer detail basics
4. create job from customer context
5. job detail basics

### Phase 4: frontend scheduler day view
1. day scheduler shell for one-time jobs only
2. `Unassigned` lane plus team-member lanes
3. click-through from schedule card to job detail
4. edit schedule and edit team flows from job detail

### Phase 5: hardening and documentation
1. validation and edge-case handling
2. unit/integration/UI tests
3. slice documentation updates

---

## Backend tasks

### 1. Customer domain
#### Tasks
- implement customer aggregate with:
  - core identity fields
  - do-not-service flag
  - send notifications flag
  - tags
  - notes
  - lead source
  - referred by
- implement child-record persistence for:
  - addresses
  - phones
  - emails
- support customer list and customer detail reads

#### Constraints
- keep `billsToCustomerId` optional and minimal if included at all
- do not implement payment methods, portal invite workflows, auto-invoice, or attachments in this slice

### 2. Team-member lookup domain
#### Tasks
- implement read-only lookup for active assignable team members
- expose initials/display name needed for day-view lanes

#### Constraints
- `Unassigned` is not stored as a team-member row
- no team management UI in this slice

### 3. Job domain, one-time only
#### Tasks
- implement one-time job create flow from customer context
- store only V1-needed fields:
  - job id / number
  - customer reference
  - selected address reference
  - description/service summary
  - lead source if needed for display
  - private notes / tags only if needed by current UI
  - schedule state
  - scheduled start/end
  - assignee reference
- expose job detail read
- expose minimal update path for V1 metadata if needed

#### Constraints
- persist `scheduleState: unscheduled|scheduled`
- derive assigned vs unassigned from nullable assignee reference
- no recurrence fields
- no occurrence/series linkage
- no invoice linkage
- no complex workflow states beyond schedule and assignment

### 4. Scheduling service
#### Tasks
- implement `scheduleOneTimeJob(jobId, start, end)`
- implement `unscheduleJob(jobId)`
- implement `assignJob(jobId, teamMemberId)`
- implement `unassignJob(jobId)`
- implement `getDaySchedule(date)` returning:
  - team-member lanes
  - `Unassigned` pseudo-lane
  - scheduled one-time jobs for the day

#### Constraints
- scheduling is job-centric
- only scheduled jobs appear in day grid
- unscheduled jobs remain visible in job/customer detail, not in the selected day grid

### 5. Validation layer
#### Tasks
- validate customer required identity fields
- validate phone and email format at a basic level
- validate state abbreviation if entered
- validate schedule start/end presence and ordering
- validate assignee exists and is active
- block scheduling when customer is `doNotService`

#### Constraints
- do not infer extra business restrictions beyond the explicit scheduling block

---

## Frontend tasks

### 1. Customers list
#### Tasks
- render empty state when no customers exist
- render minimal list when customers exist
- provide entry point for add-customer modal

### 2. Add customer modal
#### Tasks
- implement V1 field set only
- support one additional phone row
- support one additional email row
- normalize tags to list/chips
- support homeowner/business toggle
- if subcontractor checkbox is included, show only for business type

#### Constraints
- exclude advanced sections not needed for V1 value
- do not surface invoices, payment methods, service plans, or auto-invoice

### 3. Customer detail
#### Tasks
- render summary basics
- render contact basics
- render address block
- render tags
- render minimal jobs tab
- expose `Job` primary action

### 4. Job create flow
#### Tasks
- launch from customer context
- create one-time job only
- choose customer-linked address
- capture minimal description/service summary for schedule card and job detail

### 5. Job detail
#### Tasks
- show current schedule summary or unscheduled state
- show current assignee or `Unassigned`
- expose:
  - `Schedule`
  - `Edit team`
  - `Undo Schedule` when scheduled

### 6. Scheduler day view
#### Tasks
- render selected date with vertical timeline
- render one lane for `Unassigned`
- render one lane per active team member
- render scheduled one-time job cards in correct lane and time block
- enable click-through from card to job detail

#### Constraints
- no week view
- no month view
- no dispatch/map views
- no bulk actions
- no recurrence controls

---

## Schema changes

## Customer-side schema
### Tables / collections needed
- `customers`
- `customer_addresses`
- `customer_phones`
- `customer_emails`

### Minimum fields
#### customers
- id
- first_name
- last_name
- display_name
- company_name
- role
- customer_type
- do_not_service
- send_notifications
- customer_notes
- lead_source
- referred_by
- tags_json or normalized tag storage
- created_at
- updated_at

#### customer_addresses
- id
- customer_id
- street
- unit
- city
- state
- zip
- notes
- created_at
- updated_at

#### customer_phones
- id
- customer_id
- value
- note
- type
- created_at
- updated_at

#### customer_emails
- id
- customer_id
- value
- created_at
- updated_at

## Team-member schema
### Tables / collections needed
- `team_members` (read-only or seed-backed for this slice)

### Minimum fields
- id
- display_name
- initials
- active_on_schedule

## Job schema
### Tables / collections needed
- `jobs`

### Minimum fields
- id
- job_number
- customer_id
- customer_address_id
- title_or_service_summary
- lead_source
- private_notes (optional for current slice)
- job_tags_json or normalized tag storage (optional for current slice)
- schedule_state (`unscheduled|scheduled`)
- scheduled_start_at
- scheduled_end_at
- assignee_team_member_id nullable
- created_at
- updated_at

## Deliberately excluded schema
- recurring series tables
- occurrence tables
- invoice tables
- payment tables
- delivery-event tables

---

## Service logic

### Customer service
- createCustomer(input)
- listCustomers(filters?) minimal or none
- getCustomer(customerId)
- updateCustomerBasic(customerId, input)

### Team-member service
- listActiveTeamMembers()
- getAssignableTeamMember(teamMemberId)

### Job service
- createOneTimeJob(customerId, input)
- getJob(jobId)
- updateJobBasic(jobId, input) only if required by UI
- scheduleJob(jobId, startAt, endAt)
- unscheduleJob(jobId)
- assignJob(jobId, teamMemberId)
- unassignJob(jobId)

### Day-schedule service
- getDaySchedule(date)
  - returns lanes in order:
    - `Unassigned`
    - active team members
  - returns scheduled jobs intersecting the selected day

### Important service invariants
- a job cannot be both unscheduled and present in the day schedule payload
- a job may be scheduled while unassigned
- an assigned job must reference a real active team member
- `Unassigned` is represented by null/empty assignment, not fake team-member identity

---

## Validation logic

### Customer create/update validations
- require either `displayName` or `firstName`
- if `displayName` is omitted, derive display text from available name/company fields
- validate `customer_type` enum
- validate state against US abbreviation list when provided
- validate email syntax minimally
- validate phone format minimally with warning-style UI and lenient backend acceptance
- trim and dedupe tags if tags are included

### Job validations
- customer must exist
- selected address must belong to the customer if address is stored on job
- one-time job creation path must not accept recurrence input
- V1 handlers reject unsupported recurrence, occurrence, invoice, payment, billing, and auto-invoice fields explicitly

### Schedule validations
- job must exist
- job customer must not be `doNotService`
- startAt and endAt are required
- endAt must be after startAt
- schedule action only updates one-time job scheduling fields

### Assignment validations
- assignee id may be null for `Unassigned`
- non-null assignee id must resolve to active assignable team member

### V1 default note
- unscheduling clears only schedule fields and preserves assignee selection

---

## Minimal API handlers/controllers/routes needed for this slice
These are intentionally product-action-oriented, not tied to any missing API doc format.

### Customers
- `POST /customers`
- `GET /customers`
- `GET /customers/:customerId`
- `PATCH /customers/:customerId`

### Customer jobs
- `POST /customers/:customerId/jobs`
- `GET /customers/:customerId/jobs`

### Jobs
- `GET /jobs/:jobId`
- `PATCH /jobs/:jobId` only if minimal edit is needed
- `POST /jobs/:jobId/schedule`
- `POST /jobs/:jobId/unschedule`
- `POST /jobs/:jobId/assign`
- `POST /jobs/:jobId/unassign`

### Scheduler
- `GET /schedule/day?date=YYYY-MM-DD`

### Team members
- `GET /team-members?assignable=true`

### Route constraints
- no recurrence endpoints
- no invoice endpoints
- no batch actions
- no bulk scheduler mutation endpoints

---

## Test layers

### Unit tests
Focus on:
- validators
- service-layer state transitions
- day-schedule lane grouping
- do-not-service scheduling block

### Integration tests
Focus on:
- customer -> job -> schedule -> assign end-to-end backend flow
- scheduler query results after schedule/assign/unschedule
- customer detail jobs list consistency

### UI tests
Focus on:
- add customer modal
- create job from customer
- schedule from job detail
- assign/unassign from job detail
- day-view card placement and click-through

### Smoke tests
Focus on:
- zero-customer empty state
- empty day schedule with lanes rendered
- unscheduled job visible in customer/job pages but absent from day grid

---

## Documentation updates required
- document the final V1 state model:
  - persisted `scheduleState` only
  - assigned/unassigned derived from nullable assignee reference
- document unschedule preserving assignee
- document that recurrence and invoicing are intentionally absent from V1
- document that unsupported out-of-slice fields are rejected explicitly
- document any chosen minimal API route contract once code exists

---

## Explicit V1 defaults to keep visible
- unschedule preserves assignment and clears only schedule fields
- customer identity minimum is `displayName` or `firstName`
- multi-address behavior stays narrow: the job stores one explicit selected customer-owned address
- assignment cardinality is one concrete assignee or `Unassigned`
- unsupported recurrence/invoice/billing fields are rejected explicitly

---

## Reviewability guardrails
- keep all recurrence-related code out of this slice
- keep all invoice/billing code out of this slice
- keep scheduler limited to day view
- prefer one assignee or `Unassigned`
- do not add speculative workflow states beyond what V1 needs
