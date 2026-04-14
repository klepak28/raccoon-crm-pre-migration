# Recurring Jobs Build Package, 2026-04-14

## 1. Structured spec

### Scope
Build the next implementation slice for recurring jobs only:
- recurring-job creation from dedicated recurring flow
- enabling recurrence on an existing scheduled job
- concrete occurrence generation
- recurring edit scope behavior
- recurring delete scope behavior
- scheduler/job-detail visibility for recurring occurrences

Out of scope for this pass:
- recurring events
- invoice automation behavior beyond preserving recurrence-safe boundaries
- multi-appointment jobs
- segments
- estimates
- full background materializer daemon
- completed/invoiced protection logic that depends on future invoice/workflow modules

### Traceable source set
Primary source files:
- `docs/spec/20-scheduler.md`
- `docs/spec/40-business-rules.md`
- `docs/spec/50-edge-cases.md`
- `docs/architecture/decision-table-recurring-and-invoicing.md`
- `docs/architecture/domain-model.md`
- `docs/raw/full-spec.md`

### Hard requirements
#### Recurrence model
- recurrence applies to jobs only
- recurrence is blocked for:
  - segments
  - estimates
  - jobs with more than one appointment
- recurring jobs generate separate concrete future jobs
- each occurrence keeps its own:
  - job page
  - job number
  - schedule
  - invoice path
- current job may become occurrence 1 when recurrence is enabled
- never-ending series are materialized into a finite horizon:
  - daily / weekly / monthly: 1 year ahead
  - yearly: 5 years ahead
- monthly invalid positions skip unsupported months instead of coercing dates

#### Supported recurrence families
- daily
- weekly
- monthly
- yearly
- interval-based custom rules such as every N weeks / every 3 months
- monthly supports both:
  - day-of-month
  - ordinal weekday
- yearly supports both:
  - specific day + month
  - ordinal weekday + month

#### Edit scope behavior
- every edit on a recurring job must be scoped as either:
  - `Only this job`
  - `This job and all future jobs`
- `Only this job` must only mutate the selected occurrence
- `This job and all future jobs` must not rewrite history
- when recurrence details change, the new rule starts with the current job
- when duration changes, the reset starts with the current job
- documented forward-propagating fields include:
  - date
  - time
  - assigned technician / assignee
  - arrival window
- user requirement for this slice: any editable job row exposed in the product must honor recurring scope semantics, not silently edit the whole series

#### Delete scope behavior
- recurring delete choices are:
  - `This Occurrence`
  - `This and Future Occurrences`
- deleting one occurrence must not truncate the series
- deleting current and future occurrences must truncate the series tail
- deleted/skipped slots must not be accidentally regenerated

### Implementation interpretation for this pass
- canonical occurrence model: occurrence is a concrete `Job` with recurrence metadata
- canonical forward-edit model: keep one `RecurringSeries` identity and create a new internal rule version from the pivot occurrence
- canonical one-off model: persist edited values directly on the occurrence job and mark it as an exception
- recurring-job creation and job->recurrence enablement must converge to the same backend recurrence model

---

## 2. Domain model

### Job
Existing job remains the operational source of truth, widened for recurrence behavior:
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
- `recurringSeriesId`
- `occurrenceIndex`
- `generatedFromRuleVersion`
- `isExceptionInstance`
- `deletedFromSeriesAt`
- `createdAt`
- `updatedAt`

### RecurringSeries
Series rule record:
- `id`
- `sourceJobId`
- `recurrenceEnabled`
- `recurrenceFrequency`
- `recurrenceInterval`
- `recurrenceDayOfWeek[]`
- `recurrenceDayOfMonth`
- `recurrenceOrdinal`
- `recurrenceMonthOfYear`
- `recurrenceEndMode`
- `recurrenceOccurrenceCount`
- `recurrenceEndDate`
- `recurrenceRuleVersion`
- `materializationHorizonUntil`
- `lastExtendedAt`
- `createdAt`
- `updatedAt`

### Recurring edit boundary
Forward edits require a pivot boundary at the selected occurrence.
For this pass, preserve that boundary through:
- `generatedFromRuleVersion` on occurrence jobs
- `recurrenceRuleVersion` on the series
- reconciliation of future materialized jobs after a forward edit

### Exception model
For `Only this job` edits:
- persist changed values directly on the selected occurrence job
- set `isExceptionInstance = true`
- preserve `recurringSeriesId` and `occurrenceIndex`

---

## 3. API contract

### Create recurring job from dedicated flow
- `POST /api/recurring-jobs`
- payload:
  - `customerId`
  - `job`
  - `schedule`
  - `recurrence`
- result:
  - `series`
  - `sourceJob`
  - `generatedCount`

### Enable recurrence on existing job
- `POST /api/jobs/:jobId/recurrence`
- payload: recurrence rule
- result:
  - `series`
  - `sourceJob`
  - `generatedCount`

### Series detail
- `GET /api/recurring-series/:seriesId`
- result:
  - series fields
  - occurrence list
  - human summary

### Occurrence edit with scope
- `POST /api/jobs/:jobId/occurrence-edit`
- payload:
  - `scope`: `this | this_and_future`
  - `changes`
  - optional `recurrenceRule`
- `changes` for this pass should support at least:
  - `titleOrServiceSummary`
  - `customerAddressId`
  - `leadSource`
  - `privateNotes`
  - `tags[]`
  - `scheduledStartAt`
  - `scheduledEndAt`
  - `assigneeTeamMemberId`
- result:
  - updated occurrence
  - if forward scope, updated series metadata

### Occurrence delete with scope
- `POST /api/jobs/:jobId/occurrence-delete`
- payload:
  - `scope`: `this | this_and_future`
- result:
  - deleted occurrence info or deleted count

### UI routes
- `GET /app/recurring_jobs/new`
- existing job detail and job schedule routes must surface recurring scope choices when editing recurring jobs

---

## 4. Implementation plan

### Step 1
Harden the recurrence domain and validator layer:
- validate recurrence families and shape rules carefully
- validate occurrence-edit payloads for all supported editable job rows
- preserve explicit scope semantics in API contracts

### Step 2
Refactor recurring services so forward edits are rule-boundary aware:
- one-off edit updates only selected occurrence
- forward edit updates pivot + eligible future occurrences
- forward recurrence-rule changes regenerate only the tail from the pivot
- skip markers prevent single deleted occurrences from being regenerated

### Step 3
Wire recurring behavior into job edit / schedule / assignment flows:
- recurring jobs must always ask for scope before save
- schedule changes on recurring jobs must also honor scope
- recurrence type changes must use the same forward-scope machinery

### Step 4
Expand tests:
- recurrence creation from existing job
- dedicated recurring-job creation
- only-this edits
- this-and-future edits
- recurrence-type change at pivot occurrence
- tail truncation by end date / occurrence count
- delete this occurrence vs delete this and future
- monthly invalid-position skip rules

### Step 5
Polish UI visibility:
- recurring state on job detail
- recurrence summary on recurring jobs
- edit/delete affordances that match documented scope decisions

---

## 5. Open questions list

- OPEN_QUESTION: source docs say `Job inputs do not carry over on recurring jobs`, but they do not enumerate the exact field-by-field carry-over set. For this pass, only documented recurrence-aware fields should be treated as guaranteed forward-propagating defaults.
- OPEN_QUESTION: current product spec mentions arrival window propagation, but the current local job model does not yet persist arrival window.
- OPEN_QUESTION: the source confirms jobs with multiple appointments cannot become recurring, but the current codebase does not yet model multi-appointment jobs at all.
- OPEN_QUESTION: completed/invoiced occurrence protection is architecturally required, but current V1 workflow/invoice modules do not yet provide the full state needed to enforce every protection path.
- OPEN_QUESTION: whether dedicated recurring-job flow is fully field-for-field identical to job->schedule->recurrence path is still not exhaustively proven live, though both must converge to one backend model.
