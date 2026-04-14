# Scheduler Polish Pass File Map

## Purpose
Identify the main implementation files for the focused scheduler polish pass.

## Main implementation files
- `src/ui/static/app.js`
  - scheduler shell
  - day / week / month rendering
  - scheduler card rendering
  - return-context handling
  - scheduler quick-action behavior

- `src/ui/static/app.css`
  - scheduler hierarchy
  - dense-week/month readability
  - stronger unassigned treatment
  - improved card layout and feedback styles

- `src/ui/static/date-utils.js`
  - only if helper functions are needed for day drill-in, summaries, or context labels

- `src/ui/static/ui.js`
  - only if shared status/empty-state helpers need small polish helpers

## Test files likely to change
- `tests/ui/first-slice/ui-shell.test.js`
  - route shell coverage if route/context behavior changes

- `tests/unit/scheduler/day-schedule.test.js`
  - scheduler-service behavior only if needed

- `tests/integration/customers-jobs-scheduler/flow.test.js`
  - integration checks if scheduler UX requires a small API expectation shift

- new targeted client-helper tests if useful
  - likely around date/view helper behavior or return-context URL generation

## Files expected to stay mostly untouched
- backend domain/services/validation layers
- customer/job business rules
- recurrence/invoice-related docs and code surfaces
