# First Slice Audit

## Scope reviewed
Reviewed:
- implementation under `src/` and `tests/`
- `/docs/spec/*`
- `/docs/architecture/*`
- `/docs/architecture/v1-implementation-defaults.md`
- `/docs/plan/first-build-slice.md`
- `/docs/plan/first-slice-execution-plan.md`
- `/docs/plan/first-slice-file-map.md`
- `/docs/plan/first-slice-test-plan.md`
- `/docs/analysis/*`

This audit covers only the approved first slice:
- Customers
- one-time Jobs
- basic day scheduler assignment flow

It does not assess recurrence or invoicing beyond verifying they stayed out of scope.

---

## Overall assessment
The implementation is a **good V1 prototype** and it does respect the major slice boundaries:
- no recurrence implementation
- no invoicing implementation
- one-time jobs only
- one concrete assignee or `Unassigned`
- unschedule preserves assignee
- unsupported future fields are rejected at the handler/validator layer

But it is **not yet stable enough to serve as the production-worthy base for the next slice**.

Why:
- the current update behavior can silently destroy customer subrecords on partial update
- the entire app is still in-memory, which hides persistence, identity, and lifecycle bugs
- time/day behavior is implicitly UTC in backend logic and implicitly local in UI input/display, which can misplace jobs near day boundaries
- the UI is materially thinner than the approved plan and can mislead users about what states and flows actually exist

Current readiness judgment:
- **good as a reference prototype / interaction spike**
- **not yet a safe long-lived base branch for the next slice without a short hardening pass**

---

## 1. What matches the approved plan

### Matches the approved slice boundary
- Only Customers, one-time Jobs, and day scheduler assignment flow were implemented.
- No recurring series, occurrences, invoices, payments, or billing modules were added.
- Unsupported recurrence/invoice/billing fields are rejected explicitly rather than silently ignored.

### Matches the V1 defaults
- **Unschedule semantics** match the approved default:
  - schedule fields are cleared
  - assignee is preserved
- **Assignment cardinality** matches the approved default:
  - one active concrete assignee or `Unassigned`
- **Job state model** is appropriately narrow:
  - persisted `scheduleState`
  - nullable `assigneeTeamMemberId`
  - derived assigned/unassigned state in job detail read
- `Unassigned` is a pseudo-lane, not a stored team-member row.
- Selected job address is an explicit customer-owned address reference.
- Only scheduled jobs appear in the day schedule.

### Matches implementation planning in broad structure
- new single-repo scaffold exists under `src/`, `tests/`, and existing `docs/`
- domain/service/validation/API/UI responsibilities are separated
- active assignable team-member lookup exists
- minimal customer CRUD exists
- minimal one-time job create/detail/update exists
- schedule, unschedule, assign, unassign actions exist
- day schedule query exists
- automated tests exist across unit, integration, and UI-shell levels

---

## 2. What deviates from the approved plan

### Finding A. Customer update behavior is not truly V1-safe partial update
**Classification:** MUST_FIX_NOW

#### What deviates
`PATCH /api/customers/:customerId` uses partial validation, but the repository update path overwrites omitted fields with empty strings, empty arrays, or defaults.

#### Why it matters
This is not a real partial update. It can silently erase:
- phones
- emails
- addresses
- tags
- notes
- other existing fields

That is a correctness issue, not just polish.

#### Impacted areas
- customer update semantics
- future persistence mapping
- next-slice data stability

---

### Finding B. Day scheduler UI is much thinner than the planned day-view model
**Classification:** SHOULD_FIX_SOON

#### What deviates
The implemented scheduler is lane-based but not really a time-grid day scheduler. It lacks:
- vertical timeline behavior
- visible time blocks
- time-positioned cards
- current-time indicator

#### Why it matters
The docs approved a basic day scheduler, not just a grouped list. The current UI proves lane grouping, but not true day scheduling behavior.

---

### Finding C. Add-customer flow is not modal and is missing planned V1-safe fields
**Classification:** SHOULD_FIX_SOON

#### What deviates
The plan called for an add-customer modal with a broader V1-safe field set. Current UI is a simple inline form and omits or simplifies:
- additional phone row
- additional email row
- role
- lead source
- referred by
- customer notes
- address notes
- business-only subcontractor toggle

#### Why it matters
This is a UI-scope reduction. It does not violate slice boundaries, but it under-delivers against the plan.

---

### Finding D. Customer detail/job actions do not match planned wording closely
**Classification:** CAN_DEFER

#### What deviates
The plan expected a clearer `Job` top action and job-detail actions exposed as labeled flows like `Schedule`, `Edit team`, and `Undo Schedule`. The current UI exposes the actions, but more as inline forms/sections than as explicit product-like actions.

#### Why it matters
Mostly UX fidelity and user expectation clarity.

---

## 3. Hidden assumptions introduced during coding

### Finding E. Backend day inclusion uses UTC day boundaries while UI input/display is local-time based
**Classification:** MUST_FIX_NOW

#### Hidden assumption
Backend scheduler inclusion uses UTC-style day boundaries (`YYYY-MM-DDT00:00:00.000Z`), while the browser UI uses local `datetime-local` input and then converts to ISO.

#### Why it matters
This can cause jobs near midnight or in non-UTC local time to appear on an unexpected day.

#### Risk
- scheduler card appears on wrong selected day
- job detail and day view can seem inconsistent to users
- tests currently miss this because they use fixed UTC timestamps

---

### Finding F. In-memory IDs and state make lifecycle behavior look safer than it is
**Classification:** SHOULD_FIX_SOON

#### Hidden assumption
The store is process-local in-memory data with generated ids and seeded team members.

#### Why it matters
This hides bugs that would appear with persistence, including:
- restart data loss
- update merge semantics
- id stability assumptions
- ordering/query determinism under a database
- migration/schema concerns explicitly planned in docs but not implemented

---

### Finding G. Unsupported-field rejection is top-level only
**Classification:** SHOULD_FIX_SOON

#### Hidden assumption
Unsupported-field rejection checks known field names only at the top level of payloads.

#### Why it matters
Nested unsupported structures could slip through if future clients send them under allowed-looking wrapper fields.

---

## 4. Weak validation points

### Finding H. Customer PATCH semantics are validation-safe but mutation-unsafe
**Classification:** MUST_FIX_NOW

Validation itself accepts partial input, but persistence logic treats omitted nested collections as replacement with empty arrays.

This is the sharpest correctness gap in the current implementation.

---

### Finding I. Assignment input shape is narrow but not explicitly guarded against alternative multi-assignee representations
**Classification:** SHOULD_FIX_SOON

The route only accepts `teamMemberId`, which helps, but there is no explicit guard for fields like:
- `teamMemberIds`
- `assignees`
- array payload forms

That means assignment cardinality is respected by current code shape, but not defended as explicitly as the docs asked for.

---

### Finding J. Phone validation posture is only partially reflected in UI
**Classification:** CAN_DEFER

Backend acceptance is lenient, which matches the V1 default. But there is no actual warning UI for suspicious phone formats, only plain acceptance.

This is not a scope breach, but it does under-implement the chosen validation posture.

---

### Finding K. Job update route requires full V1 job input even though route is called PATCH
**Classification:** SHOULD_FIX_SOON

`PATCH /api/jobs/:jobId` reuses create-style validation and behaves more like replace-than-patch for the supported fields.

That is not necessarily wrong for V1, but the route contract is misleading.

---

## 5. Missing tests

### Finding L. No test covers customer partial update preserving omitted subrecords
**Classification:** MUST_FIX_NOW

This missing test allowed the data-loss bug to survive.

---

### Finding M. No test covers do-not-service scheduling block end to end
**Classification:** SHOULD_FIX_SOON

The service contains the rule, but the audit did not find end-to-end coverage proving the full request path fails correctly without partial mutation.

---

### Finding N. No test covers unsupported-field rejection on job routes specifically
**Classification:** SHOULD_FIX_SOON

There is only one customer-create rejection integration test. Missing route-specific regression coverage for:
- create job
- update job
- schedule job
- unschedule/unassign payloads with unsupported fields

---

### Finding O. No regression test covers absence of recurrence/invoice endpoints or UI controls
**Classification:** SHOULD_FIX_SOON

The plan explicitly called for regression guards. Current tests do not assert that:
- recurrence routes are absent
- invoice routes are absent
- invoice buttons are absent from job detail
- repeat controls are absent from schedule UI

---

### Finding P. No test covers unassign-before/after scheduling and reassignment replacement behavior via HTTP/UI
**Classification:** CAN_DEFER

The service shape implies one-assignee-only behavior, but end-to-end proofs are still thin.

---

### Finding Q. No test covers the UTC/local day-boundary mismatch risk
**Classification:** MUST_FIX_NOW

This is the main scheduler correctness blind spot remaining in the test suite.

---

## 6. Architecture drift

### Finding R. Schema/migration plan drifted into an in-memory repository prototype
**Classification:** SHOULD_FIX_SOON

The execution plan explicitly called for schema/migration foundation first. The implementation instead delivered an in-memory domain prototype.

That was a reasonable spike choice for speed, but it is architecture drift from the approved execution plan.

---

### Finding S. UI drifted from “basic day scheduler” into “lane-grouped schedule list”
**Classification:** SHOULD_FIX_SOON

The system still proves core scheduling semantics, but the day-view architecture is thinner than planned.

---

### Finding T. State model did not drift in the dangerous direction
**Classification:** positive note

Important non-drift:
- no broad job status enum was introduced
- no recurrence placeholders were added to job state
- no invoice linkage leaked into job model

This is a strong architectural win.

---

## 7. Stability as the base for the next slice

## Judgment
**Not yet stable enough as the base for the next slice without a short hardening pass.**

### Why not yet
The current slice still has three important stability risks:
1. partial-update data loss behavior
2. UTC/local day-boundary ambiguity
3. in-memory storage masking persistence-level correctness issues

### What is solid already
- slice boundary discipline
- V1 state model discipline
- unschedule semantics
- single-assignee model
- unsupported-field rejection posture

### Practical recommendation
Treat the current implementation as a **reviewable prototype baseline**, not the long-term branch foundation, until the MUST_FIX_NOW items are resolved and covered by tests.

---

## Priority summary

### MUST_FIX_NOW
- customer partial update currently destroys omitted child/subrecord data
- scheduler day behavior has a UTC/local hidden assumption with no regression coverage
- missing tests for the two issues above

### SHOULD_FIX_SOON
- move beyond in-memory-only behavior before using this as the base for the next slice
- strengthen unsupported-field rejection coverage on job routes
- make assignment-cardinality rejection more explicit
- improve day scheduler UI fidelity to the approved plan
- close regression gaps around excluded routes/features

### CAN_DEFER
- closer UI wording fidelity for action labels
- phone warning UX
- deeper end-to-end reassignment/unassign UX coverage
