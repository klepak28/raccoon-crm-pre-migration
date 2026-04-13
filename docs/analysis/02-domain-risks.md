# Domain Risks

## 1. Modeling recurrence as "one job with many dates"
### Why it matters
The spec explicitly requires recurring jobs to generate separate concrete jobs, each with its own job page, job number, schedule, and invoice. If recurrence is modeled as one record with many dates, core behaviors break:
- `Only this job` vs `This job and all future jobs`
- `This Occurrence` vs `This and Future Occurrences`
- forward-only edits without rewriting history
- per-occurrence invoicing

## 2. Failing to separate series rules from occurrence exceptions
### Why it matters
The spec requires one-off occurrence edits. Without a clear exception model, the system will either:
- accidentally rewrite the whole series, or
- lose traceability on why one occurrence differs

## 3. Letting invoices read live job/customer data at render time
### Why it matters
Invoices must support preview, sending, print, and PDF consistently. If invoice rendering depends on live customer/job/address records, historical invoices can drift after later edits, which is financially dangerous.

## 4. Collapsing document state and payment state into one status field
### Why it matters
The spec distinguishes invoice states like `Open`, `Pending`, `Canceled`, `Voided` and also requires separate payment semantics such as partial vs paid vs pending. One status field will create ambiguity and broken reporting.

## 5. Treating `Unassigned` as a normal employee row
### Why it matters
The spec treats `Unassigned` as a pseudo-resource bucket. If it is stored as a fake real team member, assignment logic, filters, and settings ownership become muddled.

## 6. Overcommitting to inferred appointment structure
### Why it matters
The normalized spec is strongly job-centric, but it does not fully define whether schedule data is embedded in Job or backed by a separate appointment entity. Hard-coding the wrong boundary too early could create migration pain.

## 7. Ignoring forward materialization requirements for never-ending recurrence
### Why it matters
The spec requires finite forward horizons, not infinite up-front generation. Without this, the system risks runaway data growth, poor performance, and hard-to-manage series updates.

## 8. Under-specifying snapshot boundaries for invoice line items
### Why it matters
Invoice lines may display job-input/service-option details. If those are not snapped at invoice time, later service edits may silently alter historical billing documents.

## 9. Ambiguous handling of unschedule behavior
### Why it matters
The spec leaves open whether `Undo Schedule` clears assignment. If this is not settled before implementation, the team may ship inconsistent operational behavior across scheduler, job detail, and activity history.

## 10. Building invariants too loosely around recurrence scope
### Why it matters
The recurrence scope pairs are semantically different and must stay different:
- `Only this job` vs `This job and all future jobs`
- `This Occurrence` vs `This and Future Occurrences`

If these collapse together in implementation, the system will violate one of the most important rules in the source spec.
