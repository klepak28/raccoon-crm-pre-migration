# V1 Implementation Defaults

## Purpose
This document converts the remaining pre-coding V1 limits into explicit implementation defaults for the approved first slice.

## Scope
These defaults apply only to:
- Customers
- one-time Jobs
- basic day scheduler assignment flow

They do not expand scope into:
- recurrence
- occurrence generation
- invoicing
- billing workflows

---

## 1. Unschedule behavior
### Chosen V1 default
`unscheduleJob(jobId)` clears only scheduling fields:
- `scheduleState -> unscheduled`
- `scheduledStartAt -> null`
- `scheduledEndAt -> null`

It **does not clear** `assigneeTeamMemberId`.

### Why this is safest for V1
- keeps scheduling and assignment as separate concerns
- avoids destructive data loss on a common edit action
- makes rescheduling simpler and more predictable
- aligns with the V1 rule that jobs may exist unscheduled but still carry assignment context

### Alternatives rejected
- **Clear both schedule and assignment on unschedule**
  - rejected because it couples two different actions and creates avoidable rework if assignment later needs to persist independently
- **Introduce a more complex dispatch lifecycle around unschedule**
  - rejected because it expands scope

### What future versions may change
- future dispatch workflows may decide assignment should be automatically re-evaluated after unschedule
- future UX may add a separate explicit action like `Unschedule and unassign`

### Tests required
- unscheduling a scheduled assigned job clears only schedule fields
- unscheduling removes the job from the day schedule
- unscheduling preserves assignee on job detail read
- rescheduling after unschedule keeps the prior assignee unless explicitly changed

---

## 2. V1 assignment cardinality
### Chosen V1 default
A job can have exactly one of:
- one active concrete team member, or
- no assignee, represented as `Unassigned`

No multi-assignee support exists in V1.

### Why this is safest for V1
- matches the approved day-lane scheduler model exactly
- keeps schema, service logic, and queries small
- avoids premature many-to-many modeling
- reduces rework risk caused by speculative dispatch design

### Alternatives rejected
- **Multi-assignee support in V1**
  - rejected because the source slice does not require it and it adds needless schema and UI complexity
- **Primary assignee plus hidden future secondary-assignee structure now**
  - rejected because even partial future-proofing would still complicate the V1 schema without immediate value

### What future versions may change
- future versions may add helper/crew assignments or many-to-many staffing models
- future scheduler rendering may support group jobs or multiple simultaneous assignees

### Tests required
- assigning a job to one active team member succeeds
- reassigning replaces the prior assignee rather than appending
- unassigning sets the job to `Unassigned`
- any payload shape implying multiple assignees is rejected

---

## 3. V1 job state model
### Chosen V1 default
V1 persists only the narrow state needed for the slice:
- `scheduleState: unscheduled | scheduled`
- `assigneeTeamMemberId: nullable`

`assignmentState` is **derived**, not separately stored:
- `null -> Unassigned`
- non-null valid active team member id -> Assigned

V1 does **not** introduce broader workflow or billing status fields.

### Why this is safest for V1
- separates real persisted scheduling state from derived assignment presentation
- avoids a catch-all `job.status` field that would later absorb unrelated concerns
- keeps schema minimal and slice-faithful

### Alternatives rejected
- **Single broad `job.status` enum**
  - rejected because it would invite mixing schedule, operational, and commercial states too early
- **Persist both `scheduleState` and `assignmentState` separately**
  - rejected because assignment can be derived cleanly from the nullable assignee field in V1
- **Add future workflow fields now as placeholders**
  - rejected because placeholders leak out-of-scope concerns into the slice

### What future versions may change
- future versions may add operational workflow fields such as started/finished
- future versions may add commercial states, but separately from V1 scheduling state

### Tests required
- new job is created with `scheduleState=unscheduled` and `assigneeTeamMemberId=null`
- scheduling flips only `scheduleState` and schedule timestamps
- assignment changes only assignee reference
- job detail derives `Assigned` or `Unassigned` correctly from assignee reference
- no unsupported broader `status` field is required by V1 handlers

---

## 4. Minimal customer identity rule
### Chosen V1 default
Customer create/update requires enough input to produce a usable display identity.

Accepted minimum:
- `displayName`, or
- `firstName`

If `displayName` is omitted, the system derives display text in this order when possible:
1. `firstName + lastName`
2. `firstName`
3. `companyName`

If neither `displayName` nor `firstName` is provided, the request is rejected in V1.

### Why this is safest for V1
- keeps the rule narrow and easy to validate
- supports both people-first and business-first customer records without demanding too much structure
- avoids a heavier dedupe or identity model not required by the slice

### Alternatives rejected
- **Require `firstName` always**
  - rejected because it is awkward for business customers and less faithful to the available customer shape
- **Allow customer creation with only company name and no display identity rule**
  - rejected because it weakens list/detail display consistency
- **Add a complex identity precedence model**
  - rejected because it is unnecessary in V1

### What future versions may change
- future versions may accept company-only identities directly
- future versions may add stricter dedupe or contact normalization rules

### Tests required
- create customer with display name only succeeds
- create customer with first name only succeeds
- create customer with first and last name derives usable display text when display name missing
- create customer with neither display name nor first name is rejected
- list and detail views always return a displayable identity

---

## 5. Unsupported recurrence/invoice fields policy
### Chosen V1 default
V1 handlers **reject** unsupported recurrence, occurrence, invoice, billing, payment, and auto-invoice fields with explicit validation errors.

This applies to create/update/schedule payloads for the approved slice.

### Why this is safest for V1
- protects the slice boundary
- prevents clients from assuming unsupported partial behavior
- surfaces contract mistakes early
- follows the instruction to prefer explicit rejection over silent acceptance

### Alternatives rejected
- **Silently ignore unsupported fields**
  - rejected because it hides client bugs and creates false confidence
- **Store unsupported fields but do nothing with them**
  - rejected because it leaks future design into V1 schema and contracts

### What future versions may change
- once recurrence or invoicing is intentionally added, those fields may become valid on specific routes only
- future versions may support gradual capability expansion with versioned route contracts

### Tests required
- job create rejects recurrence-related fields
- job update rejects recurrence/invoice-related fields
- schedule actions reject recurrence/invoice-related fields
- customer handlers reject invoice-automation inputs if sent in V1
- validation responses clearly identify unsupported fields as out of scope for V1

---

## 6. Target app/repo scaffold assumption
### Chosen V1 default
Implementation will target a **new single-repo application scaffold rooted at the workspace**, using the proposed slice layout as the normative default:
- `src/` for application code
- `tests/` for test code
- `docs/` for planning and architecture docs

Within that scaffold, backend and frontend remain co-located but separated by responsibility, as described in `/docs/plan/first-slice-file-map.md`.

This is a deliberate V1 assumption because no pre-existing app scaffold is currently present.

### Why this is safest for V1
- resolves the last structural blocker without inventing framework-specific behavior
- keeps implementation anchored to the already reviewed file map
- avoids waiting on missing repo structure inputs
- remains narrow, explicit, and easy to revise later if the real app lands elsewhere

### Alternatives rejected
- **Block coding until an external app scaffold appears**
  - rejected because the requested task is to resolve the limit now, not preserve it as open
- **Assume a framework-specific structure not present in docs**
  - rejected because that would be guessing
- **Split backend and frontend into separate repos in V1**
  - rejected because it adds setup and integration complexity outside the approved slice

### What future versions may change
- the code may later move into an existing framework scaffold once one is chosen or imported
- the exact file paths may shift, but the domain/service/API/UI separation should remain the reference behavior

### Tests required
- implementation review should verify new files stay within the documented `src/` and `tests/` structure
- regression review should verify no recurrence/invoice modules are introduced outside the approved scaffold
- route/service/ui tests should map cleanly to the documented file boundaries

---

## Cross-decision implementation notes
- `Unassigned` remains a pseudo-lane and pseudo-state, not a stored team-member row
- only scheduled jobs appear in the day grid
- unscheduled jobs remain visible in job and customer detail views
- selected job address must be an explicit customer-owned address reference
- no recurrence or invoice schema, handlers, routes, or UI controls are allowed in V1

## Result
With these defaults, the approved first slice is no longer blocked by unresolved pre-coding limits.
