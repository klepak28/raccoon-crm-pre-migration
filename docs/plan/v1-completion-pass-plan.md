# V1 Completion Pass Plan

## Purpose
Finish the missing product-facing work in the existing V1 slice so it feels like a usable CRM prototype instead of a thin engineering shell.

## Scope
Stay within current V1 scope only:
- Customers
- one-time Jobs
- scheduler/calendar for one-time jobs

Explicitly out of scope:
- recurrence
- occurrence generation
- invoicing
- billing
- bulk actions
- fake controls for unsupported features

---

## Primary goal
Make the current product materially more complete and usable, with the strongest focus on the scheduler/calendar UX.

Priority order:
1. Scheduler/calendar UX
2. Job detail usability
3. Customer module usability
4. Navigation and feedback consistency
5. Tests for newly added behavior

---

## Completion-pass decisions
- Keep backend changes minimal and only where needed to support better V1 UX.
- Preserve current V1 defaults and constraints.
- Prefer refactoring weak UI structure over polishing the monolithic shell.
- Add only calendar views that are useful within V1: day, week, month for one-time jobs only.
- Reuse current job actions where possible, but surface them through clearer UI entry points.

---

## Workstreams

## 1. Scheduler/calendar completion
### Goal
Turn the scheduler into a serious usable module for one-time jobs only.

### Required outcomes
- day view works and is useful
- week view works and is useful
- month view works and is useful
- jobs appear on correct dates
- selected date/range context is obvious
- `Unassigned` is visually and behaviorally clear
- opening job detail from any view works
- assign/unassign/reschedule/unschedule entry points are accessible where appropriate

### Implementation approach
- add a dedicated scheduler screen with a proper toolbar and view switcher
- use the same schedule data source with view-specific presentation logic
- keep controls limited to real supported actions only
- no dead controls for recurrence, bulk actions, or unsupported scheduling modes

---

## 2. Job detail completion
### Goal
Make job detail a real record page instead of a stack of forms.

### Required outcomes
- current state visible at a glance
- V1-safe fields editable in a clear edit flow
- schedule / unschedule / assign / unassign actions are prominent and understandable
- feedback after actions is visible
- navigation back to customer and scheduler is improved

### Implementation approach
- split read state and edit/action flows
- convert raw inline forms into clearer panels/modals/sections
- keep edit scope limited to supported V1 job fields

---

## 3. Customer module completion
### Goal
Make the customer module feel practical and navigable.

### Required outcomes
- customer list is a usable table/list
- customer detail has real structure
- customer edit flow is clearer
- related jobs are clearer
- simple search/quick filter exists if feasible within current V1

### Implementation approach
- move to a dedicated customer detail route
- separate customer list/create/detail/edit concerns
- improve list scanability and record navigation

---

## 4. Navigation and feedback consistency
### Goal
The app should feel coherent across screens.

### Required outcomes
- clear top navigation
- breadcrumbs or equivalent contextual navigation
- success/error/empty/loading states handled consistently
- navigation between customer, job, and scheduler preserves context where reasonable

---

## 5. Tests
### Goal
Protect the improved product-facing behavior.

### Required outcomes
- tests for scheduler views and navigation
- tests for customer and job usability improvements where feasible
- keep tests focused on actual supported behavior

---

## Minimal backend support allowed
Backend changes are allowed only if needed for UX completion, for example:
- range-based schedule query support for week/month views
- small response-shape improvements needed to render customer/job/scheduler screens cleanly

Do not broaden business logic.

---

## Recommended implementation order
1. create/commit completion-pass docs
2. add any minimal scheduler backend support needed for day/week/month rendering
3. refactor frontend structure away from one monolithic script
4. implement scheduler module first
5. implement job detail improvements
6. implement customer list/detail/edit improvements
7. add UI/integration tests
8. run full suite and commit in coherent milestones

---

## Completion condition
This pass is complete when:
- scheduler day/week/month views are genuinely usable for one-time jobs
- job detail reads like a real record page
- customer list/detail flows are materially more usable
- navigation and feedback feel coherent
- tests cover the improved supported interactions
