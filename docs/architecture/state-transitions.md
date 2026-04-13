# State Transitions

## Scope
This file captures state transitions explicitly supported or strongly implied by `/docs/spec`.

---

## 1. Job scheduling state

### States
- `Unscheduled`
- `Scheduled`
- PROPOSED_FIELD: `OMW`
- PROPOSED_FIELD: `Started`
- PROPOSED_FIELD: `Finished`
- PROPOSED_FIELD: `Invoiced`
- PROPOSED_FIELD: `Paid`

### Confirmed transitions
- `Unscheduled -> Scheduled`
  - Trigger: save schedule in schedule modal
  - Side effects:
    - scheduled date/time stored
    - job page shows scheduled summary
    - activity feed logs scheduling
    - notification activity may be recorded if notify is enabled

- `Scheduled -> Unscheduled`
  - Trigger: `Undo Schedule`
  - Side effects:
    - `OPEN_QUESTION`: whether assignee remains or is cleared

### Workflow transitions implied by job workflow row
- `Scheduled -> OMW`
- `OMW -> Started`
- `Started -> Finished`
- `Finished -> Invoiced`
- `Invoiced -> Paid`

### Notes
- The labels above are UI-backed, but the exact persistence states are not fully defined in `/docs/spec`, so post-schedule statuses remain `PROPOSED_FIELD`.

---

## 2. Job assignment state

### States
- `Unassigned`
- `Assigned`

### Transitions
- `Unassigned -> Assigned`
  - Trigger: save team selection
  - Side effects:
    - schedule card moves to assignee column
    - job detail shows assigned state
    - activity feed logs dispatch event

- `Assigned -> Unassigned`
  - Trigger: save `Unassigned` in team selection
  - Side effects:
    - schedule card returns to Unassigned bucket

- `Assigned -> Assigned`
  - Trigger: reassign to different team member
  - Side effects:
    - schedule card moves between columns
    - activity feed logs dispatch change

### Invariant
- Assignment state and schedule placement must stay aligned.

---

## 3. Recurring series lifecycle

### Series states
- `Active`
- PROPOSED_FIELD: `Truncated`
- PROPOSED_FIELD: `Completed`
- PROPOSED_FIELD: `Deleted`

### Transitions
- `none -> Active`
  - Trigger: create recurring job or convert job into recurring series
  - Side effects:
    - current job may become occurrence 1
    - future concrete occurrence jobs are materialized

- `Active -> Active` (forward edit)
  - Trigger: edit scope `This job and all future jobs`
  - Allowed forward changes include:
    - date
    - time
    - assignee
    - arrival window
    - recurrence rule changes
    - duration changes
  - Invariant:
    - history is not recomputed

- `Active -> Truncated`
  - Trigger: delete scope `This and Future Occurrences`
  - Side effects:
    - occurrences after the selected point are removed or no longer generated

- `Active -> Truncated`
  - Trigger: move end date backward
  - Side effects:
    - future occurrences after that date are deleted

### Invariants
- Never-ending recurrence must be represented as finite forward materialization plus extension over time.
- Daily/weekly/monthly horizon is 1 year.
- Yearly horizon is 5 years.
- Invalid monthly positions are skipped, not coerced.

---

## 4. Occurrence state and exception handling

### Occurrence states
- `Generated`
- `Exception`
- PROPOSED_FIELD: `DeletedFromSeries`

### Transitions
- `Generated -> Exception`
  - Trigger: edit scope `Only this job`
  - Meaning:
    - current occurrence diverges from the series without changing future occurrences

- `Generated -> DeletedFromSeries`
  - Trigger: delete scope `This Occurrence`
  - Meaning:
    - only selected occurrence is removed

- `Generated -> Generated` (forward propagation)
  - Trigger: edit scope `This job and all future jobs`
  - Meaning:
    - current occurrence and future occurrences align to new rule version

### Invariants
- A one-off occurrence edit must not silently rewrite the series rule for future occurrences.
- A forward series edit must not mutate historical occurrences.
- Occurrences remain concrete jobs even when exceptional.

---

## 5. Invoice document state

### Confirmed invoice states
- `Open`
- `Paid`
- `Pending`
- `Canceled`
- `Voided`

### Transitions
- `Open -> Pending`
  - Trigger: payment initiated but not yet settled

- `Open -> Paid`
  - Trigger: full payment settled

- `Pending -> Paid`
  - Trigger: payment settles successfully

- `Open -> Canceled`
  - Trigger: invoice tied to canceled or deleted jobs

- `Open -> Voided`
  - Trigger: manual void action

### Invariants
- `Pending` must not be collapsed into `Paid`.
- `Canceled` and `Voided` are distinct meanings.

---

## 6. Invoice payment state

### States
- PROPOSED_FIELD: `Unpaid`
- PROPOSED_FIELD: `Partial`
- `Pending`
- `Paid`

### Transitions
- `Unpaid -> Pending`
- `Unpaid -> Partial`
- `Unpaid -> Paid`
- `Partial -> Pending`
- `Partial -> Paid`
- `Pending -> Paid`

### Invariants
- Document state and payment state must be modeled separately.
- Amount due must remain consistent with amount paid and invoice totals.

---

## 7. Invoice delivery state

### States
- PROPOSED_FIELD: `Draft`
- PROPOSED_FIELD: `Sent`
- PROPOSED_FIELD: `Delivered`
- PROPOSED_FIELD: `Failed`

### Transitions
- `Draft -> Sent`
  - Trigger: send invoice by email or SMS
  - Side effects:
    - create delivery event
    - persist recipients/channel/message context

- `Sent -> Delivered`
  - `OPEN_QUESTION`: delivery confirmation semantics are not defined in `/docs/spec`

- `Sent -> Failed`
  - `OPEN_QUESTION`: failure handling is not defined in `/docs/spec`

### Invariant
- Each send action must create durable delivery history.

---

## 8. Automation eligibility state

### Auto invoicing eligibility for a job
A job becomes eligible for auto invoicing when:
- job is finished
- invoice remains unpaid / has due amount
- customer has applicable auto-invoice cadence
- job is not part of unsupported progress-invoice flow

### Invoice reminder eligibility for an invoice
An invoice becomes eligible for reminders when:
- invoice has been sent
- invoice has a due date
- invoice is overdue
- invoice remains unpaid
- reminder rules do not exclude the customer/customer tag

---

## Never-violate invariants
- A recurring occurrence remains a concrete job even after exception handling.
- `Only this job` and `This job and all future jobs` must never produce the same mutation scope.
- `This Occurrence` and `This and Future Occurrences` must never produce the same deletion scope.
- Printed/PDF invoice output must remain stable after invoice issuance.
- Operational job edits must not silently mutate previously issued invoice snapshots.
- `Unassigned` behavior must be represented even when no real team member is chosen.
