# Missing Decisions

## Decision 1: What is an occurrence, structurally?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Choose one canonical model:
- occurrence is a Job with recurrence metadata
- occurrence is a separate entity wrapping a Job
- occurrence is a projection only

### Why
This affects recurrence edits, deletion scopes, invoice linkage, and activity history.

---

## Decision 2: How does `This job and all future jobs` work internally?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Choose one:
- same series, new rule version from pivot occurrence
- split into a new child/sibling series from pivot occurrence
- another explicit boundary model

### Why
Without a formal pivot model, forward edits will be inconsistent.

---

## Decision 3: How are one-off occurrence exceptions persisted?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Define:
- storage model for exceptions
- allowed override fields
- whether overrides live directly on Job, in exception rows, or both

### Why
Single-occurrence edits are core product behavior.

---

## Decision 4: What exactly happens when one occurrence is rescheduled?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Define:
- whether occurrence identity stays stable
- how occurrence order/index behaves after moving the date
- how conflicts with future generated dates are handled

### Why
This is a common operational action and easily breaks recurrence integrity.

---

## Decision 5: What is the difference between unschedule, cancel, and delete?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Define distinct behavior for:
- unscheduling one occurrence/job
- canceling one occurrence/job
- deleting one occurrence
- deleting/truncating the remainder of a series

### Why
These have different impacts on history, execution, and invoicing.

---

## Decision 6: How many state dimensions does Job have?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Define whether Job uses:
- one combined status field, or
- separate axes for schedule state, operational state, and commercial state

### Why
Current architecture mixes these concerns too much.

---

## Decision 7: What is the assignment cardinality model?
### Classification
CAN_DEFER

### Decision needed
Define whether a scheduled job/occurrence has:
- one primary assignee
- many assignees
- one primary plus optional additional assignees

### Why
The current docs are too soft here.

---

## Decision 8: When is an invoice created?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Define whether invoice creation happens:
- manually on demand
- automatically when a job is finished
- automatically only via auto-invoicing
- as a draft earlier in the workflow

### Why
This determines snapshot timing, numbering, and duplicate prevention.

---

## Decision 9: What is the baseline invoice cardinality per occurrence?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Define the invariant for non-progress mode.

Recommended decision to confirm:
- one occurrence job can have at most one active baseline invoice

### Why
Without this, duplicate invoices are likely.

---

## Decision 10: Can invoices be edited after send?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Define:
- whether post-send edits are allowed
- whether edits create a new invoice revision
- whether send history points to invoice revision snapshots

### Why
This is necessary to preserve financial document integrity.

---

## Decision 11: What exactly is frozen in the invoice snapshot?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Define the minimum frozen set, including:
- customer-facing name
- service address
- business contact block
- line items
- option/job-input summaries
- totals
- due-term presentation

### Why
The architecture has the right intent but not yet a precise boundary.

---

## Decision 12: How do customer/job changes behave after invoice creation?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Define whether relational links remain for navigation only, while all rendered invoice values stay frozen.

### Why
This protects historical invoice integrity.

---

## Decision 13: What protections exist for completed or invoiced occurrences during recurrence edits?
### Classification
MUST_RESOLVE_BEFORE_CODING

### Decision needed
Define whether completed/invoiced occurrences are fully immutable from recurrence rewrite operations.

### Why
Financial and operational history must not be regenerated.

---

## Decision 14: Do we need a first-class Activity/AuditEvent entity now?
### Classification
CAN_DEFER

### Decision needed
Decide whether activity feed entries are first-class domain records in phase one.

### Why
The product surfaces rely on visible activity history, but initial build may defer it if necessary.

---

## Decision 15: What owns invoice reminder configuration?
### Classification
CAN_DEFER

### Decision needed
Define whether reminders are:
- account-wide
- customer-scoped
- policy objects with exclusions

### Why
The current architecture flags this as unclear.

---

## Decision 16: How is recurring materialization made idempotent?
### Classification
OPTIONAL_IMPROVEMENT

### Decision needed
Define duplicate-prevention strategy for future occurrence generation.

### Why
Important for reliability, though it can be detailed slightly later if background generation is not in first slice.
