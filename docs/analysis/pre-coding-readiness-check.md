# Pre-Coding Readiness Check

## Scope reviewed
Reviewed:
- `/docs/plan/first-build-slice.md`
- `/docs/plan/first-slice-execution-plan.md`
- `/docs/plan/first-slice-file-map.md`
- `/docs/plan/first-slice-test-plan.md`
- related `/docs/spec/*`
- related `/docs/architecture/*`
- related `/docs/analysis/*`

This review is limited to the approved first slice:
- Customers
- one-time Jobs
- basic day scheduler assignment flow

Explicitly out of scope:
- recurring series
- occurrence generation
- invoicing
- invoice snapshot logic
- billing workflows

---

## Overall assessment
The approved slice is **mostly implementable**, but it is **not fully implementable without guessing** unless a small set of V1 decisions is made explicitly first.

Good news:
- the slice is intentionally narrow
- recurrence and invoicing were correctly excluded
- core customer -> job -> one-time scheduling -> assignment flow is well enough specified to build

Remaining issue:
- a few seemingly small choices would create inconsistent behavior or avoidable rework if left implicit

The good part is that these are **small V1 product/technical defaults**, not large architecture blockers.

---

## Is the slice fully implementable without guessing?
**Not yet, but very close.**

Coding can start **once a handful of V1 defaults are locked** and documented.

The main unresolved areas are:
- unschedule behavior
- exact assignment cardinality for V1
- minimal job state model
- day scheduler inclusion rules for time boundaries
- validation policy choices for phone/email and excluded fields
- schema choices that should stay narrow to avoid leaking future recurrence/invoice concerns into V1

---

## What ambiguities still remain?

### 1. Unschedule behavior
#### Issue
The source docs do not confirm whether `Undo Schedule` clears only schedule fields or also clears assignment.

#### Why it matters
This affects:
- job detail behavior
- schedule lane placement after unschedule
- API/service behavior
- test expectations
- future compatibility with broader workflow logic

#### Classification
MUST_RESOLVE_BEFORE_CODING

#### Preferred resolution
In V1, **unschedule clears only scheduling fields and preserves assignee**.

Why this is preferred:
- lower coupling between schedule state and assignment state
- less destructive
- cleaner foundation for later dispatch workflows
- easier to reason about when job is rescheduled later

#### Fallback option
In V1, unschedule clears both schedule and assignment.

Tradeoff:
- simpler implementation surface, but higher rework risk later if assignment is meant to persist independently

---

### 2. Assignment lifecycle and cardinality
#### Issue
The broader architecture warns against over-modeling assignment, and the source only firmly proves assignment selection plus visible lane placement.

#### Why it matters
If V1 quietly supports multi-assignee structures, it will add avoidable schema and service complexity.

#### Classification
MUST_RESOLVE_BEFORE_CODING

#### Preferred resolution
V1 supports **exactly one concrete assignee or `Unassigned`**.

Why this is preferred:
- matches visible schedule lanes cleanly
- minimizes schema complexity
- lowers UI and query complexity

#### Fallback option
Store one `primaryAssignee` plus leave room for future additional assignees, but expose only primary assignee in V1.

Tradeoff:
- more future-friendly, but slightly more schema and service complexity now

---

### 3. One-time job state transitions
#### Issue
The larger architecture mixes schedule state, operational workflow, and commercial state. The first slice wisely narrows scope, but the exact persisted V1 state model is still not pinned down.

#### Why it matters
If code uses one generic `status` enum now, it risks rework when broader workflow states arrive.

#### Classification
MUST_RESOLVE_BEFORE_CODING

#### Preferred resolution
Use **separate V1 state dimensions**:
- `scheduleState`: `unscheduled|scheduled`
- `assignmentState`: derived from assignee presence or explicit `unassigned|assigned`

Do **not** add broader job workflow or commercial status to V1.

#### Fallback option
Use one narrow `status` field limited to `unscheduled|scheduled` and derive assignment separately.

Tradeoff:
- acceptable for V1, but less clean when operational workflow states are added later

---

### 4. Day scheduler inclusion rule for jobs crossing day boundaries
#### Issue
The test plan correctly notes this edge case, but the product rule is not yet decided.

#### Why it matters
A schedule query needs deterministic inclusion logic.

#### Classification
SAFE_V1_DEFAULT

#### Proposed V1 default
A job appears in the selected day schedule if its scheduled time **intersects the selected day at all**.

Why this default is safe:
- standard calendar behavior
- avoids hidden exclusion bugs
- easier to evolve later than rejecting cross-day jobs without good reason

---

### 5. Overlapping scheduled jobs in one lane
#### Issue
The source describes placement but does not define overlap policy.

#### Why it matters
Rejecting overlaps is a product rule, not just a rendering choice.

#### Classification
SAFE_V1_DEFAULT

#### Proposed V1 default
Allow overlapping scheduled jobs and render them deterministically in the lane.

Why this default is safe:
- lower coupling to advanced dispatch/business rules
- avoids inventing availability constraints not in the slice
- can be tightened later with explicit product rules

---

### 6. Assign-before-schedule behavior
#### Issue
The source proves jobs can be scheduled while unassigned, but does not explicitly require whether assignment before scheduling is allowed.

#### Why it matters
This affects service/API ordering and UI affordances.

#### Classification
SAFE_V1_DEFAULT

#### Proposed V1 default
Allow assignment both before and after scheduling.

Why this default is safe:
- assignment and scheduling remain independent
- aligns with the chosen low-coupling model
- avoids unnecessary service restrictions

---

### 7. Minimum customer identity requirement
#### Issue
The plan says “minimal identity” is required, but not the exact rule.

#### Why it matters
This affects validation, dedupe, and display logic.

#### Classification
MUST_RESOLVE_BEFORE_CODING

#### Preferred resolution
Require at least one of:
- `displayName`, or
- `firstName`

If `displayName` is not provided, derive it from entered name/company fields.

#### Fallback option
Require `firstName` always.

Tradeoff:
- simpler validation, but less flexible for business customers and imported-looking workflows

---

### 8. Phone validation policy
#### Issue
The source says invalid phone input can show a warning, but does not require hard rejection.

#### Why it matters
A warning-vs-error choice affects API contract and UI behavior.

#### Classification
SAFE_V1_DEFAULT

#### Proposed V1 default
Use **soft validation in UI** and **lenient backend acceptance** for phone format, as long as the field is a string within reasonable limits.

Why this default is safe:
- closest to source wording
- reduces user friction
- avoids premature locale-specific phone validation complexity

---

### 9. Email validation policy
#### Issue
The source is less explicit here than for phone.

#### Why it matters
Need a consistent validation boundary.

#### Classification
SAFE_V1_DEFAULT

#### Proposed V1 default
Use basic syntactic email validation on create/update. Reject clearly malformed values.

Why this default is safe:
- low ambiguity
- common baseline behavior
- lower risk than fully lenient email handling

---

### 10. Handling excluded recurrence/invoice fields in V1 handlers
#### Issue
The test plan says “reject or ignore,” but that choice must be explicit.

#### Why it matters
Silently ignoring out-of-slice fields can hide client bugs; hard rejection can slow early UI work if not coordinated.

#### Classification
MUST_RESOLVE_BEFORE_CODING

#### Preferred resolution
Reject excluded recurrence/invoice fields with a clear validation error.

Why this is preferred:
- protects the slice boundary
- surfaces accidental coupling immediately
- prevents hidden partial contracts

#### Fallback option
Ignore excluded fields server-side but log them in development.

Tradeoff:
- faster during rough iteration, but easier to leak invalid assumptions into clients

---

### 11. Selected job address behavior
#### Issue
The source allows multiple customer addresses, but does not define defaults/priorities.

#### Why it matters
A job needs a deterministic address reference for detail and schedule context.

#### Classification
SAFE_V1_DEFAULT

#### Proposed V1 default
Require the job to reference **one explicit customer-owned address** selected at job creation.

Why this default is safe:
- avoids inventing default-address priority rules
- keeps job/address relationship explicit
- reduces future ambiguity when multiple addresses exist

---

### 12. Scheduler lane ordering
#### Issue
The plan says `Unassigned` first, then team members, but the exact ordering among team members is not locked.

#### Why it matters
Deterministic ordering is needed for consistent UI and tests.

#### Classification
SAFE_V1_DEFAULT

#### Proposed V1 default
Sort lanes as:
1. `Unassigned`
2. active team members by `displayName` ascending

Why this default is safe:
- deterministic
- easy to test
- easy to replace later with explicit sort order field if needed

---

### 13. Need for notifications/activity-feed behavior in V1
#### Issue
The source mentions notification activity and audit feed events, but the slice explicitly avoids making activity a first-class requirement.

#### Why it matters
Implementing activity now would add coupling; omitting it may make the UI slightly less faithful.

#### Classification
CAN_DEFER

#### Why it can defer
The first slice remains valuable without a full activity subsystem.

---

### 14. Missing `/docs/api/*` dependency
#### Issue
No API docs are present in the workspace.

#### Why it matters
The team cannot rely on a preexisting route/handler contract.

#### Classification
SAFE_V1_DEFAULT

#### Proposed V1 default
Treat the route list in `first-slice-execution-plan.md` as the temporary slice API contract and document final request/response shapes before coding the handlers.

Why this default is safe:
- keeps scope bounded
- avoids waiting on missing docs
- still forces explicit handler design before code

---

### 15. App scaffold/codebase dependency is missing
#### Issue
The workspace does not currently contain an application source scaffold, only planning/spec docs.

#### Why it matters
The implementation file map is necessarily proposed, not grounded in a real framework/repo layout.

#### Classification
MUST_RESOLVE_BEFORE_CODING

#### Preferred resolution
Before coding begins, confirm the target application/repo structure and adapt the proposed file map to the real scaffold.

#### Fallback option
Create a minimal new slice-local scaffold explicitly for this project, but only after agreeing on stack/layout.

Tradeoff:
- workable, but risks starting framework decisions indirectly instead of intentionally

---

## What assumptions would be dangerous?
- assuming unschedule clears assignment without deciding it
- assuming multi-assignee support in V1
- using one broad `job.status` field that later tries to absorb workflow and billing states
- silently accepting recurrence/invoice fields in V1 handlers
- inventing default-address behavior for customers with multiple addresses
- assuming overlap rules or availability constraints that the slice never approved
- introducing recurrence/invoice schema placeholders “for later” into V1 tables/services

---

## What dependencies are still missing?

### Missing external/project dependencies
- application source scaffold / real repo layout
- explicit API contract shapes for the minimal V1 routes

### Missing small product decisions
- unschedule behavior
- exact minimal customer identity requirement
- reject-vs-ignore policy for out-of-slice fields
- final V1 state-field design for job scheduling/assignment

These are manageable, but they should be resolved before code starts.

---

## What could cause rework?
- putting recurrence fields on the V1 job schema
- putting invoice/billing placeholders on V1 job schema
- over-modeling assignment as many-to-many too early
- coupling schedule state to broader workflow status
- choosing a destructive unschedule behavior that later has to be reversed
- making day-schedule query rules inconsistent with future views
- baking implicit default address selection into job creation

---

## Should coding start now?
**Not immediately.**

A short decision pass should happen first to lock the small but important V1 defaults listed above. After that, coding can start with good confidence.

The slice does **not** need more research. It needs a few explicit implementation decisions written down before touching code.

---

## Recommended pre-coding decision set
Resolve these before implementation starts:
1. unschedule behavior
2. one-assignee-only V1 rule
3. V1 job state-field model
4. minimum customer identity validation
5. reject-vs-ignore policy for excluded fields
6. real codebase/scaffold target

Once those are pinned down, the slice is ready with clear limits.

READY_TO_CODE_WITH_LIMITS
