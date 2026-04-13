# First Slice Test Plan

## Scope
This test plan covers only the approved first slice:
- Customers
- one-time Jobs
- basic day scheduler assignment flow

Explicitly excluded from test scope:
- recurring series
- occurrence generation
- invoicing
- invoice snapshot logic
- billing workflows

## Test strategy
Use layered testing so the slice stays small and reviewable:
- unit tests for validation and service rules
- integration tests for state transitions and query correctness
- UI tests for the core happy path
- regression tests to ensure excluded features do not leak into V1

---

## Unit tests

### Customer validation tests
- creates valid customer with minimum accepted identity fields
- rejects invalid customer type
- accepts homeowner customer
- accepts business customer
- shows/handles subcontractor flag only for business if that field is implemented
- validates state abbreviation when provided
- rejects malformed email when strict validation is chosen
- warns/rejects malformed phone based on chosen validation policy
- trims and normalizes tags

### Customer persistence/service tests
- creates customer with one address
- creates customer with additional email
- creates customer with additional phone and note
- updates basic customer fields without touching excluded features
- lists customers with minimal expected shape
- returns customer detail with jobs summary

### Team-member lookup tests
- returns only active assignable team members
- does not return `Unassigned` as a stored team-member row
- returns initials/display name needed by scheduler lanes

### Job creation tests
- creates one-time job for existing customer
- rejects job creation for missing customer
- rejects address reference that does not belong to customer
- ignores or rejects recurrence fields if supplied
- stores initial state as unscheduled and unassigned unless otherwise specified by action

### Schedule service tests
- schedules one-time job with valid start/end
- rejects scheduling when end <= start
- rejects scheduling when customer is `doNotService`
- unschedules scheduled job
- unscheduling an already-unscheduled job is either idempotent or rejected according to chosen API behavior, but must be documented and tested

### Assignment service tests
- assigns job to active team member
- rejects inactive or unknown team member
- unassigns job back to `Unassigned`
- preserves one-assignee-only rule in V1

### Day-schedule query tests
- returns empty day schedule with lanes present
- includes scheduled jobs for selected day
- excludes unscheduled jobs
- groups jobs into correct assignee lane
- groups unassigned scheduled jobs into `Unassigned` lane
- updates lane placement after reassignment
- removes job from day grid after unschedule

---

## Integration tests

### Core happy-path integrations
- create customer -> create job -> schedule job -> assign job -> fetch day schedule -> verify lane placement
- create customer -> create job -> schedule job unassigned -> fetch day schedule -> verify `Unassigned` lane
- create customer -> create job -> schedule job -> reopen job detail -> reschedule -> verify updated day schedule
- create customer -> create job -> schedule job -> unschedule -> verify job detail still exists and day schedule no longer includes job

### Customer-detail integrations
- customer detail returns job in jobs list after create
- customer jobs list reflects scheduled date when job is scheduled
- customer jobs list remains present after unschedule, with scheduled field cleared or equivalent

### Validation integrations
- do-not-service customer can still exist but scheduling action is blocked
- assigning a scheduled job to invalid assignee fails without mutating existing state
- scheduling request with invalid times fails without partial write

### Query consistency integrations
- job detail schedule summary matches day-schedule query for the same job
- job detail assignment summary matches day-schedule lane placement
- unscheduled job absent from schedule query but present in customer/job reads

---

## UI tests

### Customers UI
- customers empty state renders correctly
- add customer modal submits valid homeowner data
- add customer modal submits valid business data
- add customer modal supports additional phone/email rows if implemented in V1
- customer detail renders newly created customer basics

### Job UI
- create one-time job from customer detail
- job detail initially shows unscheduled/unassigned state
- schedule modal saves valid one-time schedule
- edit team modal assigns a team member
- edit team modal returns job to `Unassigned`
- undo schedule removes scheduled summary from job detail

### Scheduler UI
- day scheduler renders `Unassigned` plus team-member lanes
- scheduled job card appears in correct lane
- unassigned scheduled job card appears in `Unassigned` lane
- clicking card navigates to job detail
- rescheduling from job detail updates card placement/time
- reassignment from job detail moves card to correct lane

---

## Edge cases

### Customer edge cases
- business toggle switched after entering some values
- customer with minimal fields only
- customer with multiple contact rows
- customer with tags but no notes

### Job and schedule edge cases
- schedule job crossing day boundaries if supported by the slice, otherwise reject and test rejection explicitly
- two jobs assigned to same team member with overlapping times, if overlap is allowed in V1, verify both render; if not allowed, document and test rejection explicitly
- unschedule job with existing assignee, verify chosen V1 behavior
- assign job before scheduling, if allowed by implementation, verify later scheduling works; if not allowed, document and test rejection explicitly

### Scheduler edge cases
- empty day with no scheduled jobs still renders lanes
- selected date with only unassigned jobs
- selected date with mixed assigned and unassigned jobs
- scheduled jobs sorted deterministically within a lane

---

## Invariants to verify
- one-time jobs only: no recurrence fields or recurrence behavior in V1
- no invoice data or invoice actions exist in V1 slice code paths
- `Unassigned` is a pseudo-lane, not a stored team-member record
- only scheduled jobs appear in the day grid
- customer `doNotService` blocks scheduling
- a job belongs to exactly one customer
- selected job address, if stored, belongs to that customer
- assignment and day-schedule lane placement stay aligned
- unscheduling does not delete the job record

---

## Failure cases to test
- create job for missing customer
- create/schedule job using address from another customer
- schedule job with missing start or end
- schedule job with end before start
- schedule job for do-not-service customer
- assign job to unknown team member
- assign job to inactive team member
- fetch day schedule with invalid date format
- submit customer create with invalid enum values
- submit excluded recurrence or invoice fields to V1 handlers and verify rejection or ignore policy

---

## Regression guard tests
- no `Repeats` control exposed in V1 job scheduling UI
- no recurrence endpoints/routes mounted
- no invoice endpoints/routes mounted
- no invoice buttons/actions visible in V1 job detail
- no week/month/dispatch/map scheduler views mounted in V1
- no bulk scheduler actions mounted in V1

---

## Test data and fixtures
### Minimal fixtures needed
- one active team member
- one additional active team member
- one inactive team member
- one homeowner customer
- one business customer
- one do-not-service customer
- one customer with a single address
- one customer with multiple contact rows

### Time fixtures
- at least one same-day scheduling example
- at least one unassigned scheduled job
- at least one reassignment scenario

---

## Documentation/test alignment notes
- whichever decision is taken for unschedule preserving vs clearing assignment must be reflected in tests and in slice docs
- whichever validation posture is taken for phone formatting (warning vs hard error) must be reflected in tests
- if overlapping schedules are allowed in V1, tests should assert deterministic rendering rather than rejection
