# Pre-Coding Limits Resolution

## Purpose
This document resolves the remaining V1 pre-coding limits identified in:
- `/docs/analysis/pre-coding-readiness-check.md`
- `/docs/analysis/v1-blocking-decisions.md`

It converts those open limits into explicit implementation defaults for the approved first slice.

## Scope
Applies only to the approved first slice:
- Customers
- one-time Jobs
- basic day scheduler assignment flow

Explicitly still out of scope:
- recurrence
- occurrence generation
- invoicing
- billing workflows

---

## Resolution summary
All previously identified `MUST_RESOLVE_BEFORE_CODING` items have now been resolved as explicit V1 defaults.

Primary resolution document:
- `/docs/architecture/v1-implementation-defaults.md`

This means the slice can now proceed to implementation **within the documented limits** and without relying on silent assumptions.

---

## Resolved decisions

### 1. Unschedule behavior
#### Chosen V1 default
Unscheduling clears only scheduling fields and preserves assignee.

#### Why this is safest for V1
- narrow behavior
- non-destructive
- keeps schedule and assignment decoupled
- reduces later rework risk

#### Alternatives rejected
- clearing both schedule and assignment on unschedule
- adding broader dispatch rules around unschedule

#### What future versions may change
- future versions may add explicit combined actions such as `unschedule and unassign`
- future scheduling workflows may choose stronger dispatch semantics

#### Tests this decision requires
- unschedule removes job from day grid
- unschedule preserves assignee on job detail
- reschedule after unschedule works without hidden state loss

---

### 2. V1 assignment cardinality
#### Chosen V1 default
A job has exactly one concrete assignee or `Unassigned`.

#### Why this is safest for V1
- matches the day scheduler lane model
- avoids premature many-to-many design
- keeps queries and UI simple

#### Alternatives rejected
- multi-assignee support in V1
- hidden primary-plus-secondary assignment structure

#### What future versions may change
- future versions may add multi-person staffing or crew support

#### Tests this decision requires
- single assign succeeds
- reassign replaces rather than appends
- multi-assignee payloads are rejected
- unassign returns job to `Unassigned`

---

### 3. V1 job state model
#### Chosen V1 default
Persist only:
- `scheduleState: unscheduled|scheduled`
- nullable `assigneeTeamMemberId`

Derive assigned vs unassigned from assignee presence.

#### Why this is safest for V1
- avoids broad `job.status` pollution
- keeps persisted model narrow
- separates schedule state from later workflow/commercial concerns

#### Alternatives rejected
- one generic status enum
- speculative workflow status placeholders
- separately persisted assignment state when derivation is enough

#### What future versions may change
- future versions may add operational workflow state
- future versions may add commercial state, but separately from V1 schedule state

#### Tests this decision requires
- new jobs start unscheduled and unassigned
- scheduling changes schedule state only
- assignment changes assignee only
- job reads derive assigned/unassigned correctly

---

### 4. Minimal customer identity rule
#### Chosen V1 default
Require either:
- `displayName`, or
- `firstName`

If `displayName` is omitted, derive a usable display identity from available name/company fields.

#### Why this is safest for V1
- minimal but explicit
- supports both person and business records better than a strict first-name-only rule
- keeps customer list/detail rendering deterministic

#### Alternatives rejected
- requiring `firstName` always
- allowing weak identity with no explicit display rule
- introducing a heavier identity model

#### What future versions may change
- future versions may allow company-only identity more directly
- future versions may add dedupe and stronger contact normalization

#### Tests this decision requires
- display-name-only create succeeds
- first-name-only create succeeds
- no-display-name/no-first-name create fails
- returned customer records always have usable display text

---

### 5. Unsupported recurrence/invoice fields policy
#### Chosen V1 default
Reject unsupported recurrence, occurrence, invoice, payment, billing, and auto-invoice fields with explicit validation errors.

#### Why this is safest for V1
- enforces the slice boundary
- prevents silent contract drift
- surfaces client mistakes early

#### Alternatives rejected
- silently ignoring unsupported fields
- storing unsupported future fields without behavior

#### What future versions may change
- later slices may make some of these fields valid on specific routes
- future API versions may widen contracts intentionally

#### Tests this decision requires
- create/update/schedule handlers reject unsupported recurrence/invoice fields
- errors identify unsupported fields clearly

---

### 6. Target app/repo scaffold assumption
#### Chosen V1 default
Assume a new single-repo application scaffold at workspace root using:
- `src/`
- `tests/`
- `docs/`

Treat `/docs/plan/first-slice-file-map.md` as the normative initial structure for implementation unless later replaced intentionally.

#### Why this is safest for V1
- resolves the missing-scaffold blocker explicitly
- stays framework-agnostic
- uses the already reviewed file map instead of inventing a new structure

#### Alternatives rejected
- waiting indefinitely for an external scaffold to appear
- assuming an unstated framework layout
- splitting V1 into multiple repos

#### What future versions may change
- code may later move into an adopted framework scaffold
- exact paths may change while preserving domain/service/API/UI boundaries

#### Tests this decision requires
- implementation review verifies files follow documented scaffold boundaries
- regression review verifies no out-of-slice modules are added under the scaffold

---

## Consistency updates required in planning docs
The following planning docs should reflect these defaults so implementation and tests do not drift:
- `/docs/plan/first-build-slice.md`
- `/docs/plan/first-slice-execution-plan.md`
- `/docs/plan/first-slice-file-map.md`
- `/docs/plan/first-slice-test-plan.md`

These are consistency updates only. They do not widen scope.

---

## Final assessment
The previously open V1 limits are now explicit and bounded.

Coding should proceed only within the defaults documented in:
- `/docs/architecture/v1-implementation-defaults.md`
- updated first-slice planning docs

LIMITS_RESOLVED_READY_TO_CODE
