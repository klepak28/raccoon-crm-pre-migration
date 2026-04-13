# Architecture Audit

## Scope
Audit of:
- `/docs/architecture/domain-model.md`
- `/docs/architecture/entity-relationships.md`
- `/docs/architecture/state-transitions.md`
- `/docs/analysis/02-domain-risks.md`

Goal: find contradictions, missing entities, weak invariants, and underspecified behavior without silently redesigning the architecture.

---

## Summary
The architecture is directionally solid on the two hardest boundaries:
- recurring jobs are modeled as a series generating concrete jobs
- invoices are treated as snapshots rather than live views over mutable job/customer data

The weak spots are mostly around:
- series splitting semantics
- exact occurrence identity and exception persistence
- schedule vs assignment separation
- invoice creation timing and invoice eligibility rules
- missing invariants around snapshot immutability and series/version consistency

---

## Issue 1: "Occurrence" is defined separately, but also described as a Job
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
The docs say:
- Occurrence is a concrete generated occurrence
- each occurrence is a real Job record
- occurrence is implemented most naturally as a Job with recurrence linkage

But the model also defines `Occurrence` as if it were its own entity with its own fields.

### Why this is dangerous
This can lead to three conflicting implementations:
1. Occurrence as a separate table plus Job
2. Occurrence as just a tagged Job
3. Occurrence as a projection/view over Job

If this is not settled, recurrence edits, deletion scopes, and invoice linkage will drift.

### What must be decided
- Is an occurrence:
  - a standalone entity,
  - a subtype/role of Job, or
  - a recurrence metadata record attached to Job?
- Which object owns `occurrenceIndex`, `generatedFromRuleVersion`, and exception markers?

---

## Issue 2: Series splitting is not modeled explicitly enough
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
The docs correctly say future changes do not rewrite history, but they stop short of defining how a forward edit is represented.

For example, `This job and all future jobs` may require one of these:
- mutate the existing series rule and mark earlier jobs as generated from an older rule version
- split one series into two linked series from a pivot occurrence
- keep one series plus per-occurrence rule-version boundaries

### Hidden failure mode
Without an explicit split model, future jobs may be regenerated inconsistently, duplicated, or lose traceability after forward edits.

### Missing invariant
- A forward edit from occurrence N must create an unambiguous rule boundary at occurrence N.

### What must be decided
- whether forward edits create:
  - a new series record, or
  - a new rule version on the same series
- how already-generated future jobs beyond the pivot are reconciled

---

## Issue 3: One-off occurrence exceptions are under-specified
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
`OccurrenceException` exists, but only for overridden schedule/assignee fields. That is too narrow for the observed recurrence model.

### Hidden problems
A single-occurrence edit may affect more than schedule and assignee, for example:
- arrival window
- duration
- possibly other job data if later confirmed

The current docs also do not say whether an exception is:
- stored as a diff from the series template,
- materialized directly onto the occurrence job,
- or both.

### Missing invariant
- A one-off occurrence exception must be reconstructible without consulting mutable future series rules.

### What must be decided
- canonical persistence for exceptions
- allowed override field set
- whether exception state lives on Job, in a separate exception record, or both

---

## Issue 4: Rescheduling a single occurrence is not described as its own case
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
The architecture mentions `Only this job` leading to `Exception`, but does not spell out what happens when a single occurrence is rescheduled.

### Hidden problems
Rescheduling one occurrence raises unanswered questions:
- does `occurrenceIndex` stay the same even if the date moves far away?
- can the occurrence move outside normal series order?
- if a moved occurrence lands on a date another future occurrence already occupies, what wins?
- does rescheduling preserve linkage to reminder/invoice eligibility tied to completion state?

### Missing invariant
- Rescheduling one occurrence must preserve occurrence identity while not rewriting future generation.

---

## Issue 5: Canceling one occurrence vs truncating the series is not fully separated
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
The docs cover `This Occurrence` and `This and Future Occurrences`, but state transitions only model `DeletedFromSeries` and `Truncated`. That is not enough to cover operational cancellation semantics.

### Hidden problems
The source spec says cancellation and deletion follow similar scope rules, but the architecture models only deletion-style outcomes.

### Missing pieces
- no representation for canceled occurrence that still remains historically visible
- no distinction between:
  - deleted occurrence
  - canceled occurrence
  - unscheduled occurrence

### What must be decided
- whether cancellation is a job status, a recurrence outcome, or both
- whether a canceled occurrence remains invoice-ineligible but historically present

---

## Issue 6: Job status and schedule state are conflated
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
`Job.status` currently mixes:
- schedule state (`Unscheduled`, `Scheduled`)
- workflow state (`OMW`, `Started`, `Finished`)
- downstream commercial state (`Invoiced`, `Paid`)

### Why this is dangerous
This collapses multiple axes into one field and creates invalid combinations. Example:
- a job can be `Scheduled` and not yet `Started`
- a job can be `Finished` and still have invoice state elsewhere
- `Paid` is much closer to invoice/payment state than operational job state

### Missing invariant
- operational lifecycle, schedule state, and commercial state must not be forced into one enum unless a strict canonical state machine is fully defined.

### Recommendation direction
This likely needs separate state dimensions, even if field names remain `PROPOSED_FIELD` for now.

---

## Issue 7: Assignment model is too weak for observed behavior
### Classification
CAN_DEFER

### Problem
The docs use `assigneeIds[]` and `TeamMember N:M Job`, but the normalized spec only firmly proves selectable assignment and visible schedule buckets, not true multi-assignee operational semantics.

### Hidden risk
The implementation may commit to multi-assignee scheduling even if the product really behaves as single active assignment per visit.

### What should be tightened
- whether assignment cardinality is:
  - exactly one assignee or Unassigned
  - one-or-many assignees
- whether Schedule columns represent one primary assignee only

---

## Issue 8: Missing explicit Activity/Event Log entity
### Classification
CAN_DEFER

### Problem
The source spec repeatedly relies on activity feed behavior:
- job created
- scheduled
- notification sent
- dispatched

But the architecture does not define an Activity or AuditEvent entity.

### Why it matters
This is important for:
- traceability
- user-visible feed reconstruction
- debugging recurrence edits and invoice sends

### Note
This can defer if the first build is small, but it will quickly matter.

---

## Issue 9: Invoice generation trigger is underspecified
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
The architecture documents invoice entities and states, but not the creation rule.

### Hidden questions
- Is an invoice generated on demand when user clicks `Invoice`?
- Is a draft invoice created earlier on job creation?
- For recurring occurrences, is invoice creation per occurrence always manual, or can it be auto-triggered from `Finished` + auto invoicing?

### Why this matters
This affects:
- snapshot timing
- invoice numbering
- duplicate invoice prevention
- auto invoicing behavior

### Missing invariant
- One completed occurrence must not accidentally produce duplicate baseline invoices unless progress invoicing is explicitly enabled.

---

## Issue 10: Invoice snapshot boundaries are good, but still incomplete
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
The docs snapshot invoice headers and line items, but do not fully define whether these must also be immutable after send, print, or payment activity begins.

### Hidden problems
If invoices remain editable after send, the system needs rules for:
- whether PDFs already downloaded are considered historical artifacts
- whether send history references a prior or current snapshot
- whether payment application can happen after material invoice edits

### Missing invariants
- send history must reference the exact invoice revision sent
- invoice totals used for payments must match a stable revision

---

## Issue 11: Invoice revisioning is missing
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
The architecture assumes a stable snapshot but does not define whether the invoice itself can later be edited and, if so, how revisions are tracked.

### Why it matters
The source spec supports editing details, due date, attachments, message, and payment options. Without revision semantics, the system may overwrite what was previously sent without traceability.

### What must be decided
- whether invoice edits mutate in place before send only
- whether post-send edits are allowed
- whether invoice revisions need version numbers or immutable render snapshots per send

---

## Issue 12: Missing explicit service/material source entities
### Classification
CAN_DEFER

### Problem
The invoice line snapshot points back to `sourceType` and optional `sourceRefId`, but the architecture never defines the upstream billable items owned by Job.

### Why it matters
Without at least a conceptual upstream source, it is hard to justify:
- line item snapshot creation
- service option summary capture
- invoice subtotal derivation

### Note
Can defer if the initial scope only needs snapshot output from existing job summaries.

---

## Issue 13: Customer/address mutation after invoice creation is only partially guarded
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
The docs say invoices should not drift, which is correct, but they do not define the exact boundary between reference and snapshot.

### Hidden questions
- Does Invoice keep both `customerId` and frozen display fields? probably yes.
- If customer is merged, renamed, or address changes, what still updates in invoice UI?
- Is the customer link navigational only, while rendered values are fully frozen?

### Missing invariant
- All customer-facing invoice render fields must be invoice-owned snapshot fields, even when relational links are retained for navigation/reporting.

---

## Issue 14: Auto invoicing and reminder rule ownership remains fuzzy
### Classification
CAN_DEFER

### Problem
AutoInvoiceRule is customer-level. InvoiceReminderRule is likely broader, but current docs leave ownership unclear.

### Why it matters
This affects:
- where configuration lives
- which exclusions are legal
- how reminders behave across multiple customers

### Note
Important, but probably not a first-blocker unless automation is in first implementation slice.

---

## Issue 15: Recurrence materialization control lacks a lock/idempotency concept
### Classification
OPTIONAL_IMPROVEMENT

### Problem
The docs mention forward horizon and extension, but not concurrency/idempotency.

### Why it matters
Background materialization can duplicate future jobs if extension runs twice.

### Suggested strengthening
- add a `PROPOSED_FIELD` or invariant around idempotent extension and unique occurrence generation per series/rule version/date slot.

---

## Issue 16: Missing invariant around one invoice per occurrence in baseline mode
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
Relationships say occurrence job to invoice is `0:N`, with baseline implying one main invoice. That is too soft.

### Why this is dangerous
Without a stronger invariant, the baseline system can accidentally create duplicate ordinary invoices for one occurrence before progress invoicing exists.

### Missing invariant
- In non-progress mode, one occurrence job may have at most one active baseline invoice.

---

## Issue 17: Unschedule vs delete vs cancel are not sufficiently separated
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
The architecture treats these as nearby concepts but they are not interchangeable:
- unschedule removes scheduled time
- delete removes record/scope
- cancel may preserve history but stop normal execution

### Why it matters
Recurring systems break when these behaviors are blurred, especially around invoice eligibility and activity feeds.

---

## Issue 18: Missing invariant around completed occurrences and recurrence edits
### Classification
MUST_RESOLVE_BEFORE_CODING

### Problem
The architecture says forward edits do not rewrite history, but does not explicitly call out completed occurrences.

### Missing invariant
- Completed or invoiced occurrences must never be regenerated, replaced, or silently re-bound to a new rule version.

### Why it matters
This is especially important once payments exist.

---

## Issue 19: Risks doc is good, but misses duplicate-occurrence and duplicate-invoice failure modes
### Classification
OPTIONAL_IMPROVEMENT

### Problem
`02-domain-risks.md` covers major themes, but it should also explicitly name:
- duplicate occurrence generation after forward edits/materialization
- duplicate baseline invoice generation for the same occurrence

---

## Bottom line
### MUST_RESOLVE_BEFORE_CODING
1. Occurrence identity model
2. Series split/version model for forward edits
3. Exception persistence model
4. Single-occurrence reschedule semantics
5. Cancel vs delete vs unschedule distinction
6. Job state dimensions
7. Invoice generation timing and deduplication rules
8. Invoice revision/snapshot stability rules
9. Strong boundary for customer/job changes after invoice creation
10. Baseline one-invoice-per-occurrence invariant
11. Completed/invoiced occurrence protection during recurrence edits

### CAN_DEFER
1. Assignment cardinality hardening
2. Activity/AuditEvent entity
3. Reminder rule ownership scope
4. Upstream billable service/material entities

### OPTIONAL_IMPROVEMENT
1. Materialization idempotency invariant
2. Expanded risks coverage for duplication failure modes
