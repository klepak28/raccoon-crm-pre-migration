# V1 Functional Completion Pass

## Purpose
Complete the current V1 slice so the product is operationally usable for:
- Customers
- one-time Jobs
- scheduler/calendar for one-time jobs

## Scope guardrails
Stay inside current V1 scope only.

Do not add:
- recurrence
- occurrence generation
- invoicing
- billing
- placeholder support for future features

## Product goal
Strengthen the existing prototype where work actually happens:
1. scheduler-first operational flow
2. coherent job detail actions
3. complete-enough customer record flow
4. clear transitions across scheduler, customer, and job detail

## Key implementation decisions
- Prioritize functional completion over visual polish.
- Replace weak interaction patterns instead of layering cosmetic UI on top.
- Keep backend changes minimal and directly traceable to current V1 usability gaps.
- Preserve current V1 defaults, especially:
  - one concrete assignee max
  - unassigned is a pseudo-lane
  - unschedule preserves assignee
  - scheduling remains blocked for do-not-service customers
- Use explicit V1 language, not fake advanced controls.

## Functional gaps to close

### 1. Scheduler must support real work
Required outcomes:
- job cards open quickly and preserve scheduler return context
- assign, reassign, unassign, unschedule, and reschedule are obvious from scheduler surfaces
- day, week, and month views help manage jobs rather than only display them
- scheduler cards show enough operational context to decide the next action
- scheduler includes visibility into work needing attention within current scope

Implementation direction:
- strengthen range/day views with better summaries and operational card content
- add focused operational side panels for unscheduled and unassigned work
- preserve selected date/view/filter when drilling into job detail and back
- keep quick actions tied to the same supported job/schedule/assignment mutations

### 2. Job detail must become an operational page
Required outcomes:
- schedule state is clear immediately
- assignment state is clear immediately
- editable V1-safe fields are separated from scheduling and assignment actions
- schedule/reschedule/unschedule flow is obvious
- assign/unassign flow is obvious
- page can return to originating scheduler context when present

Implementation direction:
- add stronger operational summary and next-step guidance
- group schedule and assignment actions into dedicated panels
- keep edit flow scoped to service summary, address, lead source, tags, and private notes

### 3. Customer module must feel complete enough for V1
Required outcomes:
- customer list is easy to scan and search
- create/edit customer flow is coherent
- customer detail is structured and readable
- related one-time jobs show useful operational status
- transitions from customer to job and scheduler are clear

Implementation direction:
- retain current list/detail routes but improve data density and navigation
- enrich related jobs data with assignee/address/schedule summaries
- keep customer module simpler than scheduler

## Backend/API support allowed
Add only backend support that directly enables the pass, for example:
- richer job list/read models for scheduler and customer context
- unscheduled-job retrieval for scheduler workload management
- richer schedule card payload fields needed by supported views

Do not broaden business rules.

## Implementation order
1. create pass docs
2. add minimal backend support for operational scheduler/customer/job flows
3. upgrade scheduler interactions and operational summaries
4. upgrade job detail operational layout and context return
5. tighten customer list/detail usability
6. add or update automated tests for end-to-end V1 flows
7. run test suite and commit

## Completion condition
This pass is complete when:
- scheduler meaningfully supports managing one-time jobs in day/week/month views
- job detail supports clear schedule and assignment operations
- customer list/detail and related jobs feel complete enough for V1
- supported flows work end-to-end without relying on dead controls or future-scope placeholders
