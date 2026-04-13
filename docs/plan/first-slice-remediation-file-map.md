# First Slice Remediation File Map

## Purpose
This file map identifies the likely implementation touchpoints for the MUST_FIX_NOW remediation pass only.

## Scope
Included:
- customer PATCH preservation semantics
- scheduler day interpretation consistency
- regression tests for both

Excluded:
- persistence changes
- recurrence
- invoicing
- UI redesign beyond consistency work required for scheduler day behavior

---

## Customer PATCH preservation fix

### Files likely to change
- `src/api/routes.js`
  - ensure the customer PATCH route continues to call a true partial-update path
  - avoid accidentally treating PATCH input as replacement input

- `src/validation/customers/customer-input.validator.js`
  - separate partial-input validation from full normalized replacement behavior
  - preserve the distinction between omitted fields and explicit empty values

- `src/services/customers/services.js`
  - merge partial customer updates against the existing stored customer before persistence
  - validate the effective merged result, not just the raw patch fragment

- `src/domain/customers/customer.repository.js`
  - update persistence mutation logic so omitted fields/subrecords are preserved
  - stop rebuilding collections unless the patch explicitly changes them

### Optional helper extraction if needed
- `src/lib/customer-patch.js`
  - only if merge logic needs a small dedicated helper
  - keep narrowly scoped to customer PATCH semantics

---

## Scheduler day-interpretation consistency fix

### Files likely to change
- `src/lib/time.js`
  - replace the mixed UTC/local assumption with one explicit V1 day-intersection rule
  - keep helper behavior small and documented

- `src/services/scheduler/services.js`
  - ensure day-schedule filtering uses the clarified time helper consistently

- `src/ui/static/app.js`
  - align UI schedule input conversion and display formatting with the same chosen V1 day interpretation
  - avoid mixed local-input plus UTC-filter behavior

### Optional helper extraction if needed
- `src/lib/day-interpretation.js`
  - only if the chosen rule becomes clearer as a dedicated helper
  - avoid turning this into a generalized timezone module

---

## Regression tests to add or update

### Customer PATCH regression coverage
- `tests/unit/customers/customer-validator.test.js`
  - extend only if validator behavior changes materially

- `tests/unit/customers/customer-patch.test.js`
  - preferred new focused file for partial-update merge/preservation behavior

- `tests/integration/customers-jobs-scheduler/flow.test.js`
  - add customer PATCH preservation scenario, or

- `tests/integration/customers-jobs-scheduler/customer-patch.test.js`
  - preferred if keeping integration coverage isolated is cleaner

### Scheduler day-interpretation regression coverage
- `tests/unit/scheduler/day-schedule.test.js`
  - add near-midnight and selected-day consistency cases

- `tests/integration/customers-jobs-scheduler/flow.test.js`
  - add end-to-end near-boundary schedule case, or

- `tests/integration/customers-jobs-scheduler/day-boundary.test.js`
  - preferred if isolating the regression is cleaner

---

## Likely unchanged files
These should stay untouched unless a fix unexpectedly requires them:
- `src/services/jobs/services.js`
- `src/domain/jobs/job.repository.js`
- `src/domain/team-members/team-member.repository.js`
- `src/validation/jobs/*`
- scheduler CSS unless display formatting changes require a tiny supporting tweak

---

## Documentation touchpoints after code fixes
- `docs/plan/first-slice-test-plan.md`
- `docs/plan/first-slice-execution-plan.md` (only if contract wording needs clarification)
- `docs/analysis/first-slice-audit.md` (optional resolution note after implementation)

These are follow-up documentation touchpoints, not part of the code change set itself.
