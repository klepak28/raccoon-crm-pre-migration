# Scheduler

## Purpose
The scheduler is a multi-view operational calendar used to place jobs and events in time, assign resources, manage recurrence, and navigate job detail.

## Route
### Hard requirements
- Main schedule route: `/app/calendar_new`

## Shared shell
### Hard requirements
- Top toolbar includes:
  - schedule menu / rail toggle
  - `Today`
  - `Bulk actions`
  - previous
  - next
  - current date button
  - compact two-button grouped toggle with unresolved semantics
  - `Color by`
  - view/type dropdown
- Date button opens a month-style date picker.
- `Today` jumps to the current range for the active view.
- Previous / next move by the active view grain.
- `Color by` changes visual grouping, not underlying data.
- View dropdown switches renderer mode while preserving context.
- `Bulk actions` enters multi-select mode.

### Screenshot-confirmed shell details
- Scheduler sits inside the broader app shell with visible top navigation including:
  - `Home`
  - `Inbox`
  - `Schedule`
  - `Customers`
- Global top bar includes:
  - search input `Search`
  - `New` button
  - notifications/help/settings/avatar controls
- The scheduler toolbar in observed screenshots also shows compact icon buttons for:
  - calendar-style view
  - map/pin-style view

## New menu entry points
### Hard requirements
- Global `New` menu from the scheduler shell exposes at least:
  - `Job`
  - `Recurring job`
  - `Estimate`
  - `Event`
- `Job` and `Recurring job` are visible as first-class create actions from the scheduler context, not hidden behind secondary flows.

## View modes
### Hard requirements
- View dropdown values captured from source:
  - Schedule
  - Dispatch
  - Day
  - Week
  - Monday-Friday
  - Month
- Map view is doc-confirmed and should be treated as part of the scheduling surface.
- `View by employee` is available on:
  - Day
  - Week
  - Monday-Friday
- Month view does not expose that option in the same way.

## Color by
### Hard requirements
- `Color by` options:
  - Area
  - Employee
- When `Area` is selected, `Edit areas` is exposed inline.

## Schedule views
### Hard requirements
#### Day
- Single-day timeline view
- Vertical time axis
- Optional resource columns across the top

#### Week
- Seven-day grid
- One day per column
- Supports `View by employee`

#### Monday-Friday
- Five-day work-week grid
- Supports `View by employee`

#### Month
- Standard month grid
- Weekday headers `Sun` through `Sat`
- Calendar items can be bulk-selected
- Sidebar filters remain visible alongside month view.
- Month header uses the active month label, observed as `April 2026`.
- Main month grid can show multiple stacked items inside a day cell.
- Observed month-cell item labels include:
  - `Demo Research`
  - `Event - Browser Event Final`

#### Dispatch
- Time-oriented dispatcher board
- Resource-oriented layout rather than classic month grid

#### Schedule
- Default operational schedule board in the observed account
- Resource-aware and assignment-aware

#### Map
- Supports Jobs, Estimates, and Events
- Day view of map supports routing/travel lines

## Day-view layout
### Hard requirements
- Time grid shows roughly business hours in visible area.
- Current time is rendered with:
  - red horizontal line
  - red dot at left edge
- X-axis is resources.
- Y-axis is time.
- Resource columns come from team settings plus `Unassigned`.
- Observed resource examples:
  - Unassigned
  - Team 1
  - Team 2
  - Artur P.
- Resource visuals include initials/badges.
- Observed visible hour labels run from roughly `7am` through `5pm` in the captured viewport.
- Scheduled cards are rendered directly inside the lane/time grid, not in a separate side list.
- Observed day-view card examples include:
  - `Demo Research` in the `Unassigned` lane
  - `New Job` in an assigned team lane during scheduling flow

## Resource model
### Hard requirements
- Real schedule resources come from team-member configuration.
- Settings source of truth: `Settings -> Team & Permissions -> Team`
- Newly created team members should be eligible to appear in employee-based views.
- `Unassigned` is a pseudo-resource bucket and must be modeled separately from real employees.

## Left rail / schedule menu
### Hard requirements
- Left rail contains:
  - mini month calendar
  - month navigation
  - date cells with highlighted current day
  - `Filter by name or tag`
  - `Areas` section
  - team calendar checklist / legend
- Team checklist acts as:
  - visibility filter
  - color legend
- Observed checklist items include:
  - Unassigned
  - Team 1
  - Team 2
  - Artur Pirogov
- The mini-calendar and employee checklist persist in both observed day and month views.
- The selected day is highlighted in the mini-calendar and matches the active main view date.

## Empty and populated states
### Hard requirements
- Empty date state still renders:
  - full grid
  - columns
  - timeline
- No illustration-style empty panel is required inside the grid.
- Scheduled card placement changes with assignment state.
- Clicking a scheduled card opens the job detail page.

## Calendar item / visit card
### Hard requirements
- Card is a compact block positioned by start/end time.
- Card includes at least:
  - customer or job label
  - assignment marker
  - status/iconography
  - click-through to job detail
- Unassigned cards use a muted/gray treatment in the observed screenshots.
- Assigned cards can use a stronger accent color and include the team badge inline.
- Card text is compact and truncated when space is limited.

## Bulk actions
### Hard requirements
- Entering bulk mode changes header controls.
- Bulk mode includes:
  - `Close`
  - selection count
  - `Edit assignees`
  - `Reschedule`
- Action buttons are disabled when nothing is selected.
- Calendar items become selectable in bulk mode.

## Job scheduling flow
### Hard requirements
- Scheduling can be initiated from a job detail page.
- Schedule modal title uses the job number.
- Schedule modal header includes:
  - close/back
  - `Notify customer`
  - `Save`
- Modal tabs include:
  - `Schedule`
  - `Find a time`
- Schedule fields include:
  - Start date
  - Start time
  - End date
  - End time
  - `Anytime`
  - team selector / `Edit team`
  - assignment summary
  - `Arrival window`
  - `Repeats`
- Modal also shows job summary details:
  - job identifier
  - customer
  - address
  - phone
  - notifications indicator
  - service name
  - subtotal block
  - embedded map
  - `View on map`
- Modal supports expandable sections:
  - Customer tags
  - Job tags
  - Private notes

### Screenshot-confirmed create / schedule details
- A `New job` flow exists as a dedicated two-column screen with:
  - left column for customer + schedule controls
  - right column for private notes + line items
- New job header includes:
  - close icon
  - title `New job`
  - `Job Template` dropdown
  - `Save job`
- New job customer card includes:
  - customer lookup input
  - inline action `+ New customer`
- New job schedule card includes:
  - `From` date and time
  - `To` date and time
  - timezone label, observed as `Timezone: CDT`
  - `Anytime`
  - `Edit team`
  - selected team chip, observed as `Team 1`
  - `Notify customer`
- New job flow includes collapsible/additional sections below schedule:
  - `Checklists`
  - `Attachments`
  - `Fields`
- New job right column includes:
  - `Private notes`
  - note scope toggle `This job` / `Customer`
  - `Line items`
  - `Services`
  - `Materials`
  - money summary rows `Subtotal`, `Tax rate`, `Total`
- Observed service row includes:
  - service name `Home Cleaning`
  - `Total price`
  - service edit/delete controls
  - `Add service`
  - `Service Price Book`
- Observed materials section includes:
  - `Add material`
  - `Material Price Book`

### Screenshot-confirmed schedule-a-time flow
- A separate scheduling surface titled `Schedule a time for Job` is visible.
- Its header includes:
  - close icon
  - `Notify customer`
  - `Save`
- The left scheduling panel visibly includes:
  - date input, observed as `04/14/26`
  - time input, observed as `2:00pm`
  - `Anytime`
  - `Edit team`
  - selected team chip
  - `Arrival window`
  - `Repeats`
  - `Repeats every`
  - `Repeats on`
  - `Ends`
- Observed recurrence values in that screen include:
  - `Custom`
  - numeric repeat interval `1`
  - repeat unit `Week`
  - end options `Never`, `After`, `On`
- The right side of that scheduling screen embeds the live day scheduler grid, allowing schedule placement against visible employee lanes.

## Assignment
### Hard requirements
- New jobs can be scheduled while still `Unassigned`.
- Separate `Edit team` flow exists on the job page.
- Team assignment modal includes:
  - search/filter input
  - checkbox list
  - `Cancel`
  - `Save`
- Observed assignee options include:
  - Unassigned
  - Artur Pirogov
  - Team 1
  - Team 2
- Saving assignment updates:
  - job detail assigned state
  - schedule card column placement
  - job activity feed

## Post-save behavior
### Hard requirements
- Saving schedule changes job state from `Unscheduled` to `Scheduled`.
- Job page shows scheduled date/time summary.
- Activity feed logs scheduling.
- If notify is enabled, a customer notification event is recorded.
- Job workflow row includes:
  - `Undo Schedule`
  - Schedule
  - OMW
  - Start
  - Finish
  - Invoice
  - Pay

## Unscheduling and editing
### Hard requirements
- `Undo Schedule` appears after a visit is scheduled.
- Scheduled visits can be edited by reopening scheduling from the job page.
- Team assignment can be edited independently of re-scheduling.

## Events
### Hard requirements
- Separate event creation route: `/app/new_event`
- Event composer includes:
  - From date/time
  - To date/time
  - timezone display
  - team/dispatch selection
  - Name
  - Note
  - Location
- Save action may require selecting normalized time options from the dropdown.
- Event creation is separate from job-rooted recurrence.
- Event creation is also exposed directly from the scheduler `New` menu.

## Recurring jobs
### Hard requirements
- Recurrence applies to **jobs**, not all calendar items.
- Recurrence is not supported for:
  - segments
  - estimates
  - jobs with more than one appointment
- Dedicated recurring-job route exists: `/app/recurring_jobs/new`
- Global `New` menu exposes recurring job creation.
- Supported recurrence families include:
  - Does not repeat / Never
  - Daily
  - Weekly
  - Monthly
  - Yearly
  - Custom
- Observed presets also include examples like:
  - Every weekday
  - Weekly on Friday
  - Monthly on the second Friday
  - Yearly on Apr 10
- Custom recurrence supports base units:
  - Day
  - Week
  - Month
  - Year
- Monthly rules support both:
  - day-of-month
  - ordinal weekday
- Yearly rules support both:
  - specific day + month
  - ordinal weekday + month
- Recurrence needs interval-based rules such as every N weeks or every 3 months.
- A recurring series generates separate future jobs, each with its own job page, schedule, invoice, and job number.
- Current job can become occurrence 1 when recurrence is enabled.
- Never-ending recurrence is materialized into a finite forward horizon, then extended over time.
- Documented horizon:
  - daily, weekly, monthly: 1 year ahead
  - yearly: 5 years ahead
- Editing scope for recurring jobs:
  - `Only this job`
  - `This job and all future jobs`
- Deletion scope for recurring jobs:
  - `This Occurrence`
  - `This and Future Occurrences`
- Monthly invalid-position behavior skips unsupported months rather than coercing dates.
- Scheduler `New` menu exposes `Recurring job` directly.
- Observed recurrence editor controls include visible weekday chips/buttons for `Repeats on`.
- Observed `Ends` section uses mutually exclusive radio-style choices:
  - `Never`
  - `After`
  - `On`

## Optional / future-facing items mentioned in source
- Find-a-time recommendation logic
- travel/routing behavior in map day view

## OPEN_QUESTION
- Exact semantics of the unresolved two-button grouped toolbar control are unknown.
- Exact option order of every recurrence control in the schedule modal is not fully enumerated.
- Full `Find a time` behavior is not described.
- It is unclear whether unscheduling also clears assignment.
- Event recurrence was not confirmed in the observed event composer.
- The exact meaning of card color differences such as gray vs red/beige in month view is not confirmed by the screenshot alone.
- The exact behavior of the floating blue action button visible in scheduler screens is not confirmed.
- In the observed `Schedule a time for Job` screenshot, only one date/time pair is visible in the captured viewport, so the full start/end field arrangement for that specific flow remains partially occluded.
