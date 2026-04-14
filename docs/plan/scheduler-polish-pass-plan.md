# Scheduler Polish Pass Plan

## Purpose
Polish the current V1 scheduler so it feels more direct, readable, and product-like without widening scope.

## Scope
In scope only:
- one-time jobs
- existing day / week / month scheduler views
- existing job detail and customer detail integration
- existing assign / reassign / unassign / unschedule / reschedule entry points

Out of scope:
- recurrence
- occurrence generation
- invoicing
- billing
- persistence
- bulk actions
- fake future controls
- drag-and-drop if it forces major architecture changes

## Primary goals
1. Improve scheduler interaction quality
2. Improve scheduler visual clarity
3. Make week/month views more useful under load
4. Improve job card quality
5. Make scheduler behavior more consistent with job detail

## Planned changes

### 1. Scheduler shell polish
- strengthen selected date/range context
- add clearer scheduler subheader with view, range, and current focus day
- improve jump / previous / next / today controls
- preserve scheduler return context more reliably when moving into job detail and back

### 2. Day view polish
- make lane headers more informative
- add lane-level counts and clearer unassigned treatment
- improve card hierarchy and click targets
- make quick actions easier to discover without overwhelming the card

### 3. Week view polish
- make each day column easier to scan
- add day summaries and better handling when a day is dense
- make drill-in to day view natural
- keep direct open-job access available

### 4. Month view polish
- reduce cramped feel with better day-cell hierarchy
- improve summaries for dense days
- add clearer day drill-in actions
- keep cards compact but more informative

### 5. Interaction polish
- unify scheduler quick-action wording with job detail
- improve action feedback and error feedback
- reduce hard reload feel where possible while staying maintainable
- keep unsupported V1 behavior absent or explicitly labeled unsupported

## Minimal technical approach
- keep backend/domain scope unchanged unless a tiny helper is truly needed
- prefer frontend refactor and rendering improvements
- rely on current scheduler range data where possible
- add focused test coverage for date/view helpers and route-context behavior if touched

## Recommended implementation order
1. write scheduler polish docs
2. refactor scheduler rendering helpers in the current UI
3. polish day view first
4. polish week and month drill-in/summary behavior
5. polish job cards and quick actions
6. add tests and run full suite

## Completion condition
This pass is complete when:
- day / week / month scheduler views are easier to scan and act from
- return flow between scheduler and job detail is clearer
- unassigned work is easier to understand
- dense week/month dates feel more manageable
- feedback and empty states feel product-like rather than placeholder-like
