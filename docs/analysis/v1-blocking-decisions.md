# V1 Blocking Decisions

## Purpose
This file isolates the remaining decisions that matter before coding the approved first slice.

## Summary
Most remaining items are small V1 defaults, not architecture rewrites. The true blockers are the ones that would otherwise force guessing in schema, services, or handler behavior.

---

## 1. Unschedule behavior
### Classification
MUST_RESOLVE_BEFORE_CODING

### Issue
The source does not confirm whether unscheduling clears only schedule fields or also clears assignee.

### Why it matters
This affects:
- state transitions
- API/service behavior
- scheduler query behavior
- UI expectations
- tests

### Preferred resolution
Unschedule clears only scheduling fields and preserves assignee.

### Fallback option
Unschedule clears both schedule fields and assignee.

---

## 2. V1 assignment cardinality
### Classification
MUST_RESOLVE_BEFORE_CODING

### Issue
The broader docs leave assignment semantics softer than ideal.

### Why it matters
This affects schema, service logic, job detail UI, and scheduler query structure.

### Preferred resolution
V1 supports exactly one real assignee or `Unassigned`.

### Fallback option
Persist one primary assignee now while leaving internal room for future extra assignees, but expose only primary assignee in V1.

---

## 3. V1 job state model
### Classification
MUST_RESOLVE_BEFORE_CODING

### Issue
A broad `job.status` field would create avoidable rework later.

### Why it matters
Schedule state, assignment state, operational workflow, and billing are different axes.

### Preferred resolution
Use separate V1 fields:
- `scheduleState = unscheduled|scheduled`
- assignment derived from nullable assignee or explicit `assignmentState`

### Fallback option
Use one narrow `status = unscheduled|scheduled` field and keep assignee separate.

---

## 4. Minimal customer identity rule
### Classification
MUST_RESOLVE_BEFORE_CODING

### Issue
The plan says minimal identity is required but does not fully define it.

### Why it matters
This affects validation, display name behavior, and UX.

### Preferred resolution
Require at least `displayName` or `firstName`; derive display text when possible.

### Fallback option
Require `firstName` always.

---

## 5. Policy for excluded recurrence/invoice fields in V1 handlers
### Classification
MUST_RESOLVE_BEFORE_CODING

### Issue
The current docs allow either reject or ignore.

### Why it matters
This is a slice-boundary control. Hidden ignores can mask client mistakes.

### Preferred resolution
Reject excluded fields with explicit validation errors.

### Fallback option
Ignore excluded fields server-side and log them in development.

---

## 6. Target codebase/scaffold
### Classification
MUST_RESOLVE_BEFORE_CODING

### Issue
There is no app scaffold in the workspace.

### Why it matters
Without a confirmed target stack/layout, the file map and execution plan remain conceptual.

### Preferred resolution
Confirm the real target repo/app structure before coding.

### Fallback option
Create a minimal agreed scaffold for the slice, but only after making the stack/layout explicit.

---

## 7. Day-schedule inclusion rule for cross-day jobs
### Classification
SAFE_V1_DEFAULT

### Issue
The selected-day inclusion rule is not yet stated explicitly.

### Why it matters
Query behavior and UI rendering must be deterministic.

### Proposed V1 default
Include any scheduled job whose scheduled interval intersects the selected day.

---

## 8. Overlap policy in one scheduler lane
### Classification
SAFE_V1_DEFAULT

### Issue
The source does not specify whether overlapping jobs should be rejected.

### Why it matters
Rejecting overlaps would invent dispatch constraints not approved for V1.

### Proposed V1 default
Allow overlapping jobs in V1 and render them deterministically.

---

## 9. Assign-before-schedule behavior
### Classification
SAFE_V1_DEFAULT

### Issue
The source proves schedule-without-assignment, but not whether assignment-before-schedule is allowed.

### Why it matters
The service/API model should stay low-coupling.

### Proposed V1 default
Allow assignment either before or after scheduling.

---

## 10. Phone validation posture
### Classification
SAFE_V1_DEFAULT

### Issue
The source explicitly hints at warning-style handling.

### Why it matters
UI and API behavior should match.

### Proposed V1 default
Soft UI warning plus lenient backend acceptance for phone strings.

---

## 11. Email validation posture
### Classification
SAFE_V1_DEFAULT

### Issue
Email validation level is not deeply specified.

### Why it matters
Need a consistent create/update contract.

### Proposed V1 default
Use basic syntactic email validation and reject clearly malformed values.

---

## 12. Job address selection behavior
### Classification
SAFE_V1_DEFAULT

### Issue
The source supports multiple customer addresses but not default priority rules.

### Why it matters
Job detail and scheduler context need one stable address.

### Proposed V1 default
Require one explicit customer-owned address selection on job creation.

---

## 13. Team-member lane ordering
### Classification
SAFE_V1_DEFAULT

### Issue
Lane ordering should be deterministic for UI and tests.

### Why it matters
Without explicit ordering, scheduler rendering and tests become flaky.

### Proposed V1 default
Render lanes in this order:
1. `Unassigned`
2. active team members sorted by display name ascending

---

## 14. Activity feed implementation
### Classification
CAN_DEFER

### Issue
The source product has visible activity logging, but the slice excludes a first-class activity subsystem.

### Why it matters
It improves fidelity, but is not necessary to validate the first slice.

### Defer note
Do not add activity as a core dependency for V1 implementation.

---

## 15. Advanced customer features from source tabs/sections
### Classification
CAN_DEFER

### Issue
Customer tabs include invoices, attachments, notes, payment method, and auto-invoice areas.

### Why it matters
These can easily expand the slice unintentionally.

### Defer note
Keep only summary, contact basics, address basics, tags, and minimal jobs list active in V1.

---

## Recommended go/no-go rule
Proceed to coding only after the six `MUST_RESOLVE_BEFORE_CODING` items above are explicitly approved and written into the slice docs or ADRs.
