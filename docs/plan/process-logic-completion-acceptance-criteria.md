# Process Logic Completion Acceptance Criteria

## Scope
Only:
- Customers
- one-time Jobs
- scheduler/calendar for one-time jobs

Not included:
- recurrence
- occurrence generation
- invoicing
- billing
- bulk actions
- advanced dispatch intelligence

## Global acceptance criteria
- approved V1 process behavior is explicit in code
- critical invariants are protected by automated tests
- unsupported future-scope payloads are rejected explicitly, not silently tolerated
- list/query contracts do not silently accept invalid filter values

## Customer acceptance criteria
- partial customer updates preserve omitted fields and subrecords
- effective customer identity remains valid after partial update
- setting `doNotService` turns notifications off in validated output and persisted updates
- customer create/update behavior stays within current V1 scope only

## Job lifecycle acceptance criteria
- new jobs start unscheduled and unassigned
- assign-before-schedule is supported
- reassign replaces the prior assignee rather than appending
- unassign clears assignee only
- schedule/reschedule changes schedule fields only
- unschedule clears schedule only and preserves assignee
- alternative multi-assignee payload conventions are rejected explicitly

## Scheduler and backlog acceptance criteria
- scheduler day/range ordering is deterministic even for overlapping/tied jobs
- scheduled and unscheduled work can be queried for backlog use through approved contracts
- assignment-state filtering is explicit and validated where supported
- scheduler outputs keep `Unassigned` as a pseudo-lane, not a real team member

## Contract enforcement acceptance criteria
- unsupported recurrence/invoice fields are still rejected
- invalid job-list filter values are rejected with clear validation errors
- route-level tests cover assign/reassign/unassign/schedule/reschedule/unschedule semantics and queue retrieval behavior

## Deferred-by-scope acceptance criteria
The codebase still intentionally defers:
- recurrence/occurrence process logic
- invoice/billing process logic
- cancel/delete workflow beyond unschedule
- bulk actions
- dispatch intelligence and conflict resolution
- durable activity-feed logic
