# First Slice Gaps

## Purpose
This file isolates the concrete gaps found during the post-implementation audit of the approved first slice.

## Scope
Only the approved first slice:
- Customers
- one-time Jobs
- basic day scheduler assignment flow

No recurrence or invoicing expansion is proposed here.

---

## MUST_FIX_NOW

### 1. Customer partial update can erase omitted data
#### Problem
`PATCH /api/customers/:customerId` validates partial input but repository update logic overwrites omitted fields and nested collections.

#### Why it matters
This can silently erase:
- addresses
- phones
- emails
- tags
- notes and other basic fields

#### Evidence area
- `src/api/routes.js`
- `src/validation/customers/customer-input.validator.js`
- `src/domain/customers/customer.repository.js`

#### Needed follow-up
- define true patch semantics for customer update
- preserve omitted fields/subrecords
- add regression tests proving omitted data survives partial update

---

### 2. Scheduler day behavior has an implicit UTC/local mismatch
#### Problem
Backend day inclusion is computed against UTC day boundaries, while UI uses local datetime inputs and locale rendering.

#### Why it matters
Jobs near midnight can appear on the wrong selected day.

#### Evidence area
- `src/lib/time.js`
- `src/services/scheduler/services.js`
- `src/ui/static/app.js`

#### Needed follow-up
- choose one explicit timezone/day-boundary model for V1 runtime behavior
- align schedule filtering, input conversion, and display formatting
- add regression tests for near-midnight jobs

---

### 3. Missing regression tests allowed the two issues above through
#### Problem
The current test suite does not cover:
- customer partial update preserving omitted subrecords
- timezone/day-boundary consistency across schedule create and day query

#### Why it matters
These are correctness issues already present in the implementation.

#### Needed follow-up
- add unit/integration coverage before building on this slice

---

## SHOULD_FIX_SOON

### 4. In-memory store hides persistence-level bugs
#### Problem
The implementation uses process-local in-memory data instead of the schema/migration-oriented foundation described in the execution plan.

#### Why it matters
This hides issues around:
- restart persistence
- id stability
- update merge behavior
- query ordering under real storage
- migration constraints

#### Evidence area
- `src/data/store.js`
- repository implementations in `src/domain/**`

#### Needed follow-up
- move the slice to a real persistence layer before treating it as the durable base for the next slice

---

### 5. Scheduler UI is below the approved day-view fidelity
#### Problem
The current scheduler is a lane-grouped list, not a true day time-grid with time-positioned cards.

#### Why it matters
It proves grouping, but not full basic day scheduling behavior as planned.

#### Evidence area
- `src/ui/static/app.js`
- `src/ui/static/app.css`

#### Needed follow-up
- add a minimal time-grid presentation, still within V1 scope

---

### 6. Add-customer UI under-implements planned V1-safe fields
#### Problem
The UI omits or simplifies several planned fields and behaviors.

#### Examples
- no additional phone row UI
- no additional email row UI
- no role field
- no customer notes field
- no referred-by field
- no business-only subcontractor toggle
- no modal presentation

#### Why it matters
This is a gap between the approved plan and delivered UX, even though the backend stays in-scope.

---

### 7. Unsupported-field rejection is not deeply defensive
#### Problem
Rejection is explicit, but only for a fixed top-level field list.

#### Why it matters
Nested unsupported structures or alternate future-looking keys may slip through.

#### Needed follow-up
- decide whether V1 should reject unknown keys generally, or at least strengthen route-specific guards
- add route-level regression tests for job create/update/schedule

---

### 8. Assignment cardinality is respected implicitly more than explicitly
#### Problem
The code shape allows one assignee, but there is no strong explicit rejection path for alternative multi-assignee payload conventions.

#### Why it matters
The V1 default is correct, but the contract boundary could be defended more clearly.

#### Needed follow-up
- add explicit negative-path validation or route-contract tests for multi-assignee representations

---

### 9. PATCH naming is misleading on job update
#### Problem
`PATCH /api/jobs/:jobId` behaves more like a limited replace of supported job fields than a true partial patch.

#### Why it matters
This increases contract ambiguity and future rework risk.

#### Needed follow-up
- either implement true patch semantics or rename/document the route behavior more clearly

---

### 10. Missing regression guards for excluded features
#### Problem
The test plan called for verifying absence of recurrence/invoice routes and UI controls, but current tests do not enforce that.

#### Why it matters
Out-of-slice creep could slip in later without detection.

#### Needed follow-up
- add regression tests for:
  - no recurrence routes
  - no invoice routes
  - no repeat controls in V1 scheduling UI
  - no invoice buttons in V1 job detail

---

## CAN_DEFER

### 11. UI wording may overstate fidelity to the source product
#### Problem
Some screens use simplified wording and structure that may make the implementation look more complete or more product-final than it is.

#### Examples
- add customer is inline instead of modal
- schedule/edit team are sections rather than explicit product-like actions
- scheduler looks more like grouped lists than a calendar board

#### Why it matters
Mostly expectation management and UX polish.

---

### 12. Phone validation warning UX is not implemented
#### Problem
Backend is lenient, but the warning-style UI behavior from the selected V1 posture is not present.

#### Why it matters
This is a gap in chosen UX behavior, but not a slice correctness blocker.

---

### 13. End-to-end reassignment and unassign flows are under-tested
#### Problem
Core service behavior exists, but HTTP/UI regression coverage is still light.

#### Why it matters
Worth adding, but not as urgent as the current correctness gaps.

---

## Bottom line
The implemented slice is a solid constrained prototype, but the following must be closed before using it as the reliable base for the next slice:
1. fix partial customer update semantics
2. fix timezone/day-boundary ambiguity
3. add tests covering both
