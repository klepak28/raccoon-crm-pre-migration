# First Build Slice

## Decision
Choose exactly this first implementation slice:

**V1 Slice: Customers + one-time Jobs + basic day scheduler assignment flow (no recurrence, no invoices)**

This slice has the best balance of:
- business value
- low ambiguity
- low coupling
- low rework risk

It exercises the core product spine:
- create a customer
- create a job
- schedule the job once
- assign or unassign it
- view it in the schedule
- reopen and edit the one-time schedule

It intentionally avoids the most dangerous unresolved areas:
- recurring series logic
- occurrence exception handling
- invoice snapshot/revision complexity
- auto-invoicing/reminders
- broad workflow/status semantics

---

## Input review note
At selection time, these requested inputs were **not present** in the workspace:
- `/docs/api/*`
- `/docs/plan/first-build-slice-candidates.md`

This decision therefore uses the available finalized inputs:
- `/docs/spec/*`
- `/docs/architecture/*`
- `/docs/analysis/*`

---

## Why this slice wins
### Business value
- delivers a usable CRM + dispatch baseline
- demonstrates the job-centric model the rest of the product depends on
- validates the customer -> job -> schedule -> assignment loop

### Low ambiguity
- one-time scheduling is much clearer than recurrence
- assignment and day-view placement are directly observed
- customer creation is well specified

### Low coupling
- can ship without invoice generation rules
- can ship without recurrence materialization
- can ship without multi-axis advanced workflow logic

### Low rework risk
- customer and one-time job records remain foundational even if recurrence/invoicing evolve later
- basic day scheduler placement aligns with the spec without forcing premature series/invoice architecture

---

## Candidates considered and rejected for now

### Rejected candidate: recurring jobs + recurrence editing
#### Why rejected
- highest ambiguity and highest architecture risk
- blocked by unresolved decisions around:
  - what an occurrence is
  - forward series edits
  - exception persistence
  - delete vs cancel vs unschedule behavior
- explicitly discouraged by current instruction unless absolutely necessary

### Rejected candidate: invoice preview/send as part of V1
#### Why rejected
- invoice snapshot and revision rules are still sensitive
- invoice creation timing and one-invoice-per-occurrence invariants were only recently hardened architecturally
- would couple V1 to unfinished decisions around commercial state and post-send editing

### Rejected candidate: customer-only CRM slice
#### Why rejected
- lowest coupling, but too little product value on its own
- does not validate the core job-centric workflow
- would delay learning on schedule/assignment behavior that is central to the product

### Rejected candidate: full scheduler shell with week/month/bulk actions
#### Why rejected
- too much UI surface for first implementation
- day-view one-time scheduling captures the core value with much lower complexity
- bulk actions and alternate renderers can safely follow later

### Rejected candidate: customer + job + invoice without scheduler
#### Why rejected
- contradicts the product’s job-centric operational flow
- scheduling is better specified than invoicing for a safe first build
- invoices without a grounded operational workflow create awkward rework risk

---

## Scope
Build the smallest coherent operational slice that supports:
1. creating customers
2. viewing customer detail
3. creating one-time jobs for a customer
4. scheduling a job once
5. assigning or unassigning the job
6. showing the job in a day scheduler grouped by assignee/unassigned
7. editing the one-time schedule and assignment from job context

---

## Included modules
- Customers
- Jobs (one-time only)
- Scheduler (day view only, one-time jobs only)
- Team-member lookup for assignment

---

## Excluded modules
- RecurringSeries and all recurring job behavior
- occurrence exceptions
- event composer
- map view
- week/month/dispatch renderers
- bulk actions
- invoices
- payments
- auto invoicing
- invoice reminders
- progress invoicing
- advanced sorting/filtering beyond minimal usability
- service plans
- leads/estimates
- customer attachments/portal/payment method integrations

---

## Data entities touched
### Included
- Customer
- Address
- CustomerPhone
- CustomerEmail
- TeamMember
- Job

### Explicitly not in V1
- RecurringSeries
- Occurrence / occurrence exception
- Invoice
- InvoiceLineItemSnapshot
- DeliveryEvent
- AutoInvoiceRule
- InvoiceReminderRule

---

## V1 domain constraints
- Job is **one-time only**.
- Persisted job schedule state is exactly `unscheduled|scheduled`.
- Assignment is represented by nullable `assigneeTeamMemberId`; assigned vs `Unassigned` is derived from that field.
- Job may be assigned to at most one team member in V1.
- `Unassigned` is a pseudo-resource bucket, not a team member.
- Unscheduling clears schedule fields only and preserves current assignee.
- Schedule view only needs to represent one-time jobs.
- No recurring fields or recurrence UI are exposed in V1.
- No invoice creation paths are exposed in V1.
- Unsupported recurrence/invoice/billing fields are rejected explicitly in V1 handlers.

---

## Endpoints / actions included
Because `/docs/api/*` is not present, these are product actions that should map to API endpoints later.

### Customers
- Create customer
- Get customer list
- Get customer detail
- Update customer basic fields

### Jobs
- Create one-time job for customer
- Get job detail
- Update job basic metadata needed for V1
- Schedule job once
- Unschedule job
- Assign job to team member
- Unassign job

### Scheduler
- Get day schedule for date
- Filter/render jobs by team member or `Unassigned`

### Team members
- List active team members eligible for schedule assignment

---

## UI scope
### Included UI
#### Customers list
- empty state
- add customer entry
- basic customer rows/list

#### Add customer modal
Include only V1-safe fields:
- first name
- last name
- company
- display name
- role
- customer type
- mobile phone
- email
- additional phone row
- additional email row
- do-not-service flag
- send notifications
- street
- unit
- city
- state
- zip
- address notes
- customer notes
- tags
- lead source
- referred by
- bills-to lookup placeholder if feasible, otherwise exclude from V1 UI and backend

#### Customer detail
Include:
- summary basics
- contact info basics
- address block
- customer tags
- top action: `Job`
- jobs tab with minimal table

#### Job create flow
Include:
- create one-time job from customer context
- minimal job data needed to support schedule display and job detail

#### Job detail
Include:
- job number
- customer reference
- address
- current schedule summary
- current assignee summary
- `Schedule`
- `Edit team`
- `Undo Schedule`

#### Scheduler day view
Include:
- day timeline
- resource columns for `Unassigned` + team members
- current-time indicator if feasible
- one-time job cards
- click-through from card to job detail

### Excluded UI
- repeats control
- `Find a time`
- month/week/dispatch/map views
- bulk actions
- invoice buttons/actions
- event creation

---

## Validations
### Customer validations
- customer create/update requires either `displayName` or `firstName`
- if `displayName` is omitted, display text is derived from available name/company fields
- phone may warn if invalid
- email uses basic syntactic validation
- state must be valid US abbreviation if entered
- business-only subcontractor option is only shown for business type if included at all
- tags normalize to chips/list values

### Job validations
- job must belong to a customer
- selected address must belong to that customer
- job must be marked one-time in V1 by construction
- unsupported recurrence/invoice/billing fields are rejected explicitly

### Schedule validations
- scheduling requires start and end date/time
- end must be after start
- assignee is optional
- assignee, if present, must reference an active team member
- unscheduled jobs appear in job/customer context even if not shown in the day grid for a selected day

### Do-not-service rule
- if `doNotService = true`, scheduling a new or existing job is blocked in V1
- note: broader downstream restrictions remain out of scope

---

## Tests to write
### Domain / unit tests
- create customer with phones/emails/addresses
- business vs homeowner field behavior
- do-not-service blocks scheduling
- create one-time job linked to customer
- schedule one-time job
- unschedule one-time job
- assign job to team member
- unassign job back to `Unassigned`
- day schedule returns jobs in correct assignee bucket
- reassignment moves job between resource columns

### Integration tests
- customer -> create job -> schedule -> assign -> visible in day scheduler
- scheduled job card opens job detail
- editing schedule updates job detail and day scheduler consistently
- unscheduling removes job from scheduled day grid

### UI tests
- add customer modal happy path
- customer detail shows job action and jobs list
- schedule modal basic one-time save flow
- edit team flow updates visible lane

### Regression guard tests
- no recurrence UI/actions exposed in V1
- no invoice UI/actions exposed in V1
- `Unassigned` is not returned as a normal team member record

---

## Success criteria
V1 is successful if a user can:
1. create a customer
2. open that customer
3. create a one-time job for that customer
4. schedule it for a day/time
5. leave it unassigned or assign it to a real team member
6. see it in the correct day-scheduler lane
7. reopen the job and change schedule or assignment
8. unschedule it without deleting the job

And the system does all of this without introducing recurrence or invoice behavior.

---

## Out-of-scope items
- anything recurrence-related
- any invoice creation, preview, send, payment, reminder, or automation logic
- multi-invoice behavior
- one invoice spanning multiple jobs or occurrences
- exception handling for recurring occurrences
- event scheduling
- complex job workflow states beyond unscheduled/scheduled and assigned/unassigned
- advanced permission models
- activity feed as a first-class phase-one requirement

---

## Risks and mitigations

### Risk 1: job status model gets polluted too early
#### Mitigation
Use only the minimum persisted state needed in V1:
- schedule state: `unscheduled|scheduled`
- assignee reference: nullable `assigneeTeamMemberId`
Derive assigned/unassigned from assignee presence.
Do not add invoice/commercial states.

### Risk 2: hidden recurrence fields leak into V1 model
#### Mitigation
Keep recurrence fields and tables out of the first slice entirely.
Do not expose `Repeats` UI.

### Risk 3: scheduler UI balloons into a multi-view calendar project
#### Mitigation
Limit V1 to day view only.
No week/month/dispatch/map.

### Risk 4: invoice coupling sneaks into job detail
#### Mitigation
Hide invoice actions and do not create invoice records in V1.

### Risk 5: assignment semantics become over-modeled
#### Mitigation
V1 supports at most one concrete assignee or `Unassigned`.
Do not implement multi-assignee behavior yet.

### Risk 6: do-not-service behavior remains partially ambiguous
#### Mitigation
Apply the one clearly specified rule only: scheduling is blocked.
Do not infer broader workflow restrictions in V1.

---

## Final recommendation
Build **Customers + one-time Jobs + basic day scheduler assignment flow** first.

It proves the product spine with the fewest unresolved decisions, and it protects the team from getting dragged into recurrence and invoice complexity before the foundations are stable.
