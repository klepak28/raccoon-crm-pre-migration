# V1 Completion Pass Acceptance Criteria

## Purpose
Define when the current V1 product feels materially more complete and usable for the supported scope.

## Scope
Only:
- Customers
- one-time Jobs
- scheduler/calendar for one-time jobs

No recurrence, invoicing, billing, or bulk actions.

---

## Global criteria
- app feels like a usable CRM prototype, not a dev harness
- screens have clear primary actions and readable structure
- navigation between customer, job, and scheduler is coherent
- loading, empty, success, and error states are visible where needed
- unsupported features remain absent, not mocked

---

## Scheduler criteria
- day, week, and month views all exist and are useful for one-time jobs
- selected date or date range is always clear
- jobs appear on correct dates in each supported view
- `Unassigned` jobs are clearly visible and understandable
- clicking a job opens job detail
- user has clear entry points to assign/unassign/reschedule/unschedule where appropriate
- no unsupported controls for recurrence, bulk actions, or fake advanced modes are shown

---

## Job detail criteria
- job detail clearly shows current schedule and assignment state
- V1-safe job fields can be edited in a usable way
- schedule/reschedule/unschedule actions are clear
- assign/unassign actions are clear
- user can move easily back to customer and scheduler context
- success and error feedback is visible after actions

---

## Customer criteria
- customer list is easy to scan and use
- customer create/edit flows are usable
- customer detail is clearly structured
- related jobs are easy to understand and open
- search or quick filter exists if implemented and behaves predictably

---

## Smallest acceptable outcome
- customer list table plus usable create/edit flow
- dedicated customer detail page
- coherent job detail page
- scheduler with real day/week/month views for one-time jobs
- tests covering the new supported interactions

---

## Better outcome if time allows
- preserved navigation context across modules
- stronger loading/empty/error states
- modal/drawer patterns for create/edit actions
- clearer visual distinction between assigned and unassigned work
