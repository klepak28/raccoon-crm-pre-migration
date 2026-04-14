# V1 Functional Completion Acceptance Criteria

## Scope
Only:
- Customers
- one-time Jobs
- scheduler/calendar for one-time jobs

Explicitly not included:
- recurrence
- occurrence generation
- invoicing
- billing
- fake future-feature controls

## Global acceptance criteria
- current V1 slice feels operationally usable, not merely demonstrative
- screens present clear primary actions and next-step guidance
- navigation between scheduler, customer, and job detail is coherent
- success, error, and empty states are visible where needed
- current V1 defaults remain intact

## Scheduler acceptance criteria
- day, week, and month views all help manage work, not just display it
- selected date/range context is always obvious
- opening a job from scheduler feels fast and preserves scheduler return context
- assign, reassign, unassign, unschedule, and reschedule are easy to discover
- scheduler cards contain enough operational context to decide the next action
- unassigned work is clearly visible
- work that is still unscheduled is visible from scheduler context in a useful way
- no unsupported recurrence, invoice, billing, or fake advanced controls appear

## Job detail acceptance criteria
- page clearly shows scheduling state and assignment state
- V1-safe fields can be edited coherently
- schedule changes are clear and usable
- assignment changes are clear and usable
- unschedule flow is clear
- page can navigate back to originating scheduler context when present
- transitions to customer and scheduler feel coherent

## Customer acceptance criteria
- customer list is usable for scanning and search
- customer create/edit flow is coherent
- customer detail is clearly structured
- related one-time jobs show clear operational status
- opening related jobs is obvious

## End-to-end V1 acceptance criteria
The following must work end-to-end:
1. create customer
2. create one-time job from customer context
3. open job detail and understand current state immediately
4. schedule or reschedule job
5. assign, reassign, or unassign job
6. unschedule job without losing assignment context
7. manage scheduled jobs from scheduler day/week/month views
8. drill from scheduler to job detail and back with preserved scheduler context
9. move between customer detail and related jobs cleanly

## Regression acceptance criteria
- do-not-service customers remain blocked from scheduling
- unschedule still preserves assignee
- unassigned remains a pseudo-lane, not a real team member
- no recurrence or invoice route support is introduced
- automated tests cover the upgraded supported flows
