# Process Logic Completion File Map

## Purpose
Map the expected implementation touchpoints for the process-logic completion pass.

## Docs
- `docs/plan/process-logic-completion-pass.md`
- `docs/plan/process-logic-completion-file-map.md`
- `docs/plan/process-logic-completion-acceptance-criteria.md`

## Primary backend touchpoints

### Validation and contracts
- `src/lib/validation.js`
  - add explicit single-assignee contract rejection helpers if needed
- `src/validation/customers/customer-input.validator.js`
  - enforce approved do-not-service notification invariant
- `src/validation/jobs/assign-job.validator.js`
  - reject multi-assignee payload shapes explicitly
- `src/validation/jobs/job-input.validator.js`
  - reject multi-assignee payload shapes explicitly
- `src/validation/jobs/schedule-job.validator.js`
  - reject multi-assignee payload shapes explicitly
- `src/validation/jobs/job-list-filters.validator.js`
  - new file for approved operational list/filter contract validation

### Services and repositories
- `src/services/customers/services.js`
  - preserve approved customer patch semantics and customer invariants
- `src/services/jobs/services.js`
  - support validated operational filters and explicit assignment-state semantics
- `src/services/scheduler/services.js`
  - enforce deterministic ordering in scheduler outputs
- `src/domain/jobs/job.repository.js`
  - only if new list helpers are required

### Routes
- `src/api/routes.js`
  - validate job list query filters before service calls

## Test touchpoints
- `tests/unit/customers/customer-validator.test.js`
- `tests/unit/jobs/job-services.test.js`
- `tests/unit/scheduler/day-schedule.test.js`
- `tests/integration/customers-jobs-scheduler/flow.test.js`
- `tests/integration/customers-jobs-scheduler/customer-patch.test.js`

## Areas intentionally not touched in this pass
- `src/ui/static/*` except where backend/frontend context logic already depends on existing contracts
- recurrence/invoice/billing modules, which remain out of scope
