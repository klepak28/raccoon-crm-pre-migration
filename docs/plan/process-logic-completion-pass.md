# Process Logic Completion Pass

## Purpose
Complete the approved process logic for the current V1 slice before the next dedicated UI refinement pass.

## Scope
Only the approved V1 scope:
- Customers
- one-time Jobs
- scheduler/calendar for one-time jobs

Explicitly out of scope:
- recurrence
- occurrence generation
- invoicing
- billing
- bulk actions
- advanced dispatch intelligence
- fake future functionality

## Goal
Make the operational logic explicit, coherent, and test-protected wherever the docs already define behavior or clearly require an invariant.

## Missing approved logic to close

### 1. Customer lifecycle invariants
Approved logic to make explicit:
- `Do not service` turns notifications off
- customer update must preserve omitted fields/subrecords
- customer identity must remain valid after partial update

Implementation direction:
- enforce `doNotService -> sendNotifications=false` during create/update validation
- preserve existing patch semantics and add regression coverage for the invariant

### 2. One-time job lifecycle invariants
Approved logic to make explicit:
- exactly one concrete assignee or `Unassigned`
- assign and schedule are separate actions
- reschedule changes schedule fields only
- unschedule clears schedule only and preserves assignee
- assign-before-schedule is allowed

Implementation direction:
- explicitly reject multi-assignee payload conventions
- strengthen end-to-end tests for assign, reassign, unassign, schedule, reschedule, and unschedule semantics

### 3. Scheduler operational flow contracts
Approved logic to make explicit:
- overlapping jobs must render in deterministic order
- scheduled/unassigned work should be queryable and stable for backlog use
- scheduler range and queue semantics must use the same core rules

Implementation direction:
- add explicit operational filter validation for job-list contracts
- support assignment-state filtering for queue/backlog retrieval
- make schedule ordering deterministic even for overlap/tie cases

### 4. Contract enforcement
Approved logic to make explicit:
- unsupported recurrence/invoice fields are rejected
- invalid list/query filters should not be silently accepted
- alternative future-looking assignment payload shapes should be rejected explicitly

Implementation direction:
- validate list/filter query params
- reject unsupported multi-assignee field shapes with explicit error codes
- add route-level regression tests

## Deferred on purpose
These remain deferred because they are outside approved V1 scope or explicitly left open in docs:
- recurrence and occurrence logic
- invoice and billing logic
- cancel/delete workflow beyond unschedule
- activity feed persistence
- bulk actions
- conflict detection / routing / dispatch intelligence

## Implementation order
1. write pass docs
2. enforce approved customer and assignment invariants
3. strengthen job-list/scheduler contracts for backlog usage
4. make operational ordering deterministic
5. add/update automated tests
6. run full test suite and commit

## Completion condition
This pass is complete when approved V1 process behavior is explicit in code, protected by tests, and no current in-scope operational action relies on weak implicit semantics.
