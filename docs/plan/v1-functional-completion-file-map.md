# V1 Functional Completion File Map

## Purpose
Map the expected touchpoints for the focused V1 functional completion pass.

## Primary docs
- `docs/plan/v1-functional-completion-pass.md`
- `docs/plan/v1-functional-completion-file-map.md`
- `docs/plan/v1-functional-completion-acceptance-criteria.md`

## Expected backend touchpoints

### Routes and contracts
- `src/api/routes.js`
  - add any minimal V1-safe job listing routes needed by scheduler/customer flows
  - preserve current shells and route boundaries

### Services
- `src/services/jobs/services.js`
  - enrich job detail/list payloads for scheduler/customer operational use
- `src/services/customers/services.js`
  - enrich related job summaries on customer detail
- `src/services/scheduler/services.js`
  - extend schedule payload shape only as needed for usable day/week/month management

### Domain repositories
- `src/domain/jobs/job.repository.js`
  - add non-destructive job listing helpers if needed
- `src/domain/customers/customer.repository.js`
  - touch only if required for list/detail consistency

## Expected frontend touchpoints

### Core UI
- `src/ui/static/app.js`
  - scheduler usability improvements
  - job detail operational improvements
  - customer module usability improvements
- `src/ui/static/app.css`
  - support new operational layouts and scheduler signals
- `src/ui/static/api.js`
  - add any new V1-safe API client helpers
- `src/ui/static/scheduler-links.js`
  - preserve scheduler context across drill-in/drill-back flows
- `src/ui/static/date-utils.js`
  - reuse current day/week/month helpers as-is or extend minimally
- `src/ui/static/ui.js`
  - add shared UI helpers only if needed

## Expected test touchpoints
- `tests/integration/customers-jobs-scheduler/flow.test.js`
  - extend end-to-end flows for reschedule, unassign, unschedule, and operational list retrieval
- `tests/unit/jobs/job-services.test.js`
  - add coverage for new job-summary behavior if introduced
- `tests/unit/scheduler/day-schedule.test.js`
  - add coverage for enriched scheduler payloads or focused workload behavior
- `tests/unit/ui/scheduler-links.test.js`
  - extend context-preservation coverage if navigation helpers change
- `tests/ui/first-slice/ui-shell.test.js`
  - keep route shell coverage

## Files that should remain logically stable
- `src/validation/jobs/*`
- `src/validation/customers/*`
- business-rule docs under `docs/spec/*`
- architecture docs under `docs/architecture/*`

## Out-of-scope file areas
Do not introduce:
- recurrence modules
- invoice modules
- billing modules
- fake advanced scheduler modes
