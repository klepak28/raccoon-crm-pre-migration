# Customers + Scheduler Build Package, 2026-04-14

## 1. Structured spec

### Scope
Build the next implementation pass for the approved V1 slice only:
- Customers
- one-time Jobs
- day / week / month scheduler presentation
- one-time schedule + assignment flows

Out of scope for this pass:
- recurrence behavior
- invoicing
- billing
- estimates / leads / service plans
- drag-and-drop
- bulk actions
- dispatch-side automations

### Traceable source set
Primary source files:
- `docs/spec/10-customers.md`
- `docs/spec/20-scheduler.md`
- `docs/plan/ui-redesign-v1-customers-and-scheduler.md`
- `docs/analysis/2026-04-14-ui-screenshot-review.md`
- `docs/plan/first-build-slice.md`

### Build target for this pass
This pass should move the current prototype closer to the screenshot-backed UX by introducing:
- stronger app shell and navigation context
- clearer scheduler shell
- dedicated new-job workflow instead of only modal-based creation
- dedicated schedule/reschedule workflow instead of only minimal datetime modal
- preserved customer-to-job-to-scheduler flow with return context

### Hard requirements for this pass
#### Customers
- customer list remains the primary CRM index
- customer detail remains a dedicated record route
- customer detail must keep a clear `New job` entry point
- job creation from customer context must preserve selected customer

#### New job flow
- job creation must be a dedicated workspace, not only a small modal
- screen must visibly separate:
  - customer context
  - scheduling context
  - private notes
  - line-items/work-order summary area
- inline `+ New customer` affordance stays visible in the create-job experience

#### Schedule flow
- schedule/reschedule must have a dedicated route/screen
- schedule screen must combine:
  - scheduling controls in a left rail/panel
  - live scheduler board context on the right
- team selection remains editable during scheduling
- customer `doNotService` must still block saving a schedule

#### Scheduler shell
- scheduler keeps left rail + main board/calendar layout
- scheduler keeps day/week/month views already supported in code
- scheduler must expose a visible create entry point aligned with screenshot intent
- scheduler day view must keep `Unassigned` as a first-class visible lane

---

## 2. Domain model

### Customer
Use existing domain shape without widening scope:
- `id`
- `displayName`
- `firstName`
- `lastName`
- `companyName`
- `role`
- `customerType`
- `doNotService`
- `sendNotifications`
- `phones[]`
- `emails[]`
- `addresses[]`
- `tags[]`
- `customerNotes`
- `leadSource`
- `referredBy`

### Job
Keep one-time job model only:
- `id`
- `jobNumber`
- `customerId`
- `customerAddressId`
- `titleOrServiceSummary`
- `leadSource`
- `privateNotes`
- `tags[]`
- `scheduleState`
- `scheduledStartAt`
- `scheduledEndAt`
- `assigneeTeamMemberId`
- `createdAt`
- `updatedAt`

### TeamMember
Keep active assignable team-member model:
- `id`
- `displayName`
- `initials`
- `activeOnSchedule`

### Scheduler view model
Derived read model only:
- `view`
- `focusDate`
- `lanes[]`
- `jobs[]`
- `range summary`
- `filter query`

### Explicit non-models in this pass
Write-only / UI-only concepts, not new persisted entities:
- new-menu state
- create-job workspace state
- schedule screen form state
- customer search state inside create-job screen

---

## 3. API contract

### Existing endpoints reused
#### Customers
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:customerId`
- `PATCH /api/customers/:customerId`
- `GET /api/customers/:customerId/jobs`
- `POST /api/customers/:customerId/jobs`

#### Jobs
- `GET /api/jobs`
- `GET /api/jobs/:jobId`
- `PATCH /api/jobs/:jobId`
- `POST /api/jobs/:jobId/schedule`
- `POST /api/jobs/:jobId/unschedule`
- `POST /api/jobs/:jobId/assign`
- `POST /api/jobs/:jobId/unassign`

#### Scheduler
- `GET /api/schedule/day?date=YYYY-MM-DD`
- `GET /api/schedule/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

### Route contract additions for UI shell
New HTML routes are acceptable in this pass because they do not change backend domain scope:
- `GET /app/jobs/new`
- `GET /app/jobs/:jobId/schedule`

### Route-input expectations
#### `/app/jobs/new`
Expected query params:
- `customerId` required for customer-context launch
- `returnTo` optional for scheduler/customer back navigation
- `date` optional seed for scheduler context

#### `/app/jobs/:jobId/schedule`
Expected query params:
- `returnTo` optional
- scheduler context may still be derived from existing scheduler links

### OPEN_QUESTION
- Whether a future dedicated route for `Edit job` is needed, or modal editing remains acceptable after dedicated create/schedule routes are added.

---

## 4. Implementation plan

### Step 1
Add dedicated route handling for:
- `/app/jobs/new`
- `/app/jobs/:jobId/schedule`

### Step 2
Refactor the app shell so pages can render:
- stronger top navigation context
- shared primary actions
- route-aware back/create links

### Step 3
Replace modal-only job creation with a dedicated `New job` page that:
- preloads selected customer
- keeps customer context visible
- includes work-order style sections
- submits through existing job create API

### Step 4
Replace modal-only scheduling with a dedicated schedule page that:
- loads job detail
- shows scheduling form in the left column
- shows live day board context in the right column
- saves through existing schedule / assign APIs

### Step 5
Wire scheduler and customer detail actions to the new dedicated routes while keeping current return-context behavior intact.

### Step 6
Add focused tests for:
- new shell routes
- route helper generation
- create-job route behavior where practical
- schedule route behavior where practical

---

## 5. Open questions list

- OPEN_QUESTION: should the dedicated `New job` page allow customer switching after opening from customer detail, or should customer stay locked for this V1 pass?
- OPEN_QUESTION: should schedule save also assign team when the selected team changes on the schedule page, or should team save remain an explicit separate call on submit?
- OPEN_QUESTION: should the old modal flows remain as fallback affordances during transition, or should they be fully removed once the dedicated routes land?
- OPEN_QUESTION: the screenshot set shows richer line-item semantics than the current backend supports, so this pass should treat line items as UI framing only unless a spec-backed data contract is added.
- OPEN_QUESTION: screenshot set does not include direct customer list/detail source screens, so customer-shell styling should improve without inventing unsupported customer workflows.
