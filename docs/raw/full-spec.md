# Housecall Pro Demo Research

## Scope

This document is intended as a **developer handoff spec** for implementing a Housecall Pro-like Schedule experience.

It captures the observed behavior, fields, layouts, and workflows for the **Schedule**, **Customer**, and **Invoice** surfaces in the Housecall Pro demo account at `https://pro.housecallpro.com`.

I used a live browser session, created a test customer, created and scheduled a test job, assigned a team, and inspected both module-level pages and detail screens.

## Method used

Observed directly in product:
- top navigation and empty states
- customer creation modal
- customer profile page and tabs
- customer jobs table
- schedule day view
- schedule empty state and populated state
- schedule modal for a job visit
- team assignment modal
- job page before and after scheduling
- auto-invoice recurrence dialog in customer profile
- schedule view-type dropdown
- `Color by` dropdown
- left schedule rail / menu
- schedule date picker
- bulk actions in month view
- new event composer and successful event creation
- dedicated recurring-job composer and custom recurrence structure

Cross-checked with Housecall Pro help documentation:
- recurring job creation and management
- scheduling/calendar FAQ
- calendar usage guide
- team member roles / permissions
- how to send an invoice
- invoice actions and summary
- invoice list view
- customer invoice history
- invoice reminders
- progress invoicing basics

Created test data:
- Customer: `Demo Research`
- Company: `Demo Plumbing LLC`
- Address: `123 Main St, Suite 200, Chicago, IL 60601`
- Job: `Job #1`
- Service: `Home Cleaning`
- Tag: `VIP`
- Lead source text: `Google Ads`
- Team assignment tested: `Team 1`

## Important caveat

This writeup is optimized for a developer or coding agent that needs to build an analog.

Where something was not fully exposed in the observed UI, I mark it as **observed**, **doc-confirmed**, **partially observed**, or **not directly confirmed** instead of pretending certainty.

## Confidence legend

- **Observed** = directly seen in the live product UI during this research.
- **Doc-confirmed** = stated in official Housecall Pro help docs and consistent with the live product shape.
- **Partially observed** = structure or control family was seen live, but not every sub-option was enumerated directly.
- **Not directly confirmed** = plausible or documented elsewhere, but not fully exercised in this session.

---

# 1. Global navigation context

The top-level app nav in desktop layout shows:
- Get started
- Home
- Inbox
- Schedule
- Customers
- My money
- Payroll
- More

Global header controls visible while testing:
- global search
- `New` button
- notifications bell
- app launcher / integrations icon
- settings / company profile icon
- account menu avatar

The `New` button menu exposed these create shortcuts:
- Job
- Recurring Job New
- Estimate
- Event
- Customer
- Lead

This matters because creation is available both from module pages and from the global composer.

---

# 2. Schedule module

## 2.1 Schedule landing page, main route

Observed route:
- `/app/calendar_new`

The schedule page is a dispatcher-style calendar.

### Main toolbar, top row
Observed controls:
- left menu / rail toggle button
- `Today`
- `Bulk actions`
- previous arrow
- next arrow
- current date button, example: `Fri, April 10, 2026`
- compact 2-button grouped toggle next to the date controls (visible live, exact icon semantics not safely label-resolved from accessibility output, so I am not overclaiming it)
- `Color by:` dropdown, observed value: `Employee`
- view/type dropdown, observed values depending on state: `Schedule`, `Dispatch`, `Day`, `Week`, `Monday-Friday`, `Month`
- right-side menu button that opens the left rail / filter panel

### View/type dropdown, exact captured options
Directly captured from the live dropdown:
- `Schedule`
- `Dispatch`
- `Day`
- `Week`
- `Monday-Friday`
- `Month`

Also directly captured:
- `View by employee` appears as an additional checkbox option on `Day`, `Week`, and `Monday-Friday`
- month view instead showed a note that view-by options are available only on `Day`, `Week`, and `Monday-Friday`

### `Color by` dropdown, exact captured options
Directly captured from the live dropdown:
- `Area`
- `Employee`

Also directly captured:
- when `Area` is shown, the dropdown exposes an `Edit areas` action inline

## 2.1.1 Schedule view matrix for an analog

The Schedule module should be modeled as a **multi-view calendar shell** with one shared toolbar and multiple renderers.

Live-captured view/type dropdown values:
- `Schedule`
- `Dispatch`
- `Day`
- `Week`
- `Monday-Friday`
- `Month`

Implementation interpretation:
- `Day`, `Week`, `Monday-Friday`, and `Month` are classic calendar renderers.
- `Dispatch` is a schedule-oriented board with time on one axis and resources on the other.
- `Schedule` appears to be the default operational schedule board mode in this account.

Also doc-confirmed in official HCP calendar help:
- there is a **Map View** for Jobs, Estimates, and Events
- routing/travel lines are available in **Day view of the Map**

So a faithful analog should assume the overall schedule surface supports at least these renderer families:
- calendar board / schedule board
- dispatch board
- time-sliced day view
- time-sliced week view
- business-week view
- month grid view
- map view

## 2.1.2 Shared schedule toolbar contract

Across the observed views, the top schedule shell consistently behaves like this:
- left-side menu button opens the schedule side panel
- `Today` jumps to the current date range for the active view
- previous / next arrows move by the active view grain
  - day in `Day`
  - week in `Week`
  - work week in `Monday-Friday`
  - month in `Month`
- date pill shows the active period and opens a date picker
- `Color by` changes tile coloring semantics without changing the underlying schedule data
- view/type dropdown swaps renderer mode while preserving schedule context
- `Bulk actions` switches the canvas into multi-select mode

## 2.2 Day-view layout

Observed layout in the default day view:
- vertical hourly time grid, roughly 7am to 5pm in visible area
- timezone marker in screenshot: `GMT-05`
- resource columns across the top
- current-time red horizontal line across grid
- current-time red dot at left edge of timeline

Developer-grade layout interpretation:
- **X axis = teams / employees / unassigned resource buckets**
- **Y axis = time of day in hourly increments**
- in `View by employee` style layouts, each employee/team becomes its own vertical column
- the unassigned lane appears as the first horizontal resource bucket/column before named team members

Observed resource columns in demo account:
- Unassigned
- Team 1
- Team 2
- Artur P.

Observed column identity visuals:
- Unassigned uses a muted unassigned icon
- Team 1 uses circular badge `T1`
- Team 2 uses circular badge `T2`
- Artur P. uses circular badge `AP`

Important implementation note:
- these team/resource buckets are not hardcoded schedule-only labels
- they are sourced from the account's team-member configuration
- when a new team member is created in settings, that person/team should be eligible to appear as an additional horizontal column in employee-based day/week schedule views

Doc-confirmed and live-supported team source of truth:
- `Settings` -> `Team & Permissions` -> `Team`
- page shows employee rows and an `Add team member` action
- live observed rows in this account:
  - `Team 1`
  - `Team 2`
  - `Artur Pirogov`

Therefore an analog should treat day-view columns as a projection of:
- special pseudo-resource `Unassigned`
- plus active team members / employees from team settings

## 2.3 Empty-state behavior

When no visits were scheduled for the chosen date:
- the full schedule grid still rendered
- columns still appeared
- timeline still appeared
- there was **no special illustration-based empty panel** inside the grid
- the empty state is effectively a blank rendered dispatch board

## 2.4 Left rail / filter rail

Observed when the right-side menu button was opened:
- mini month calendar
- month label, example `April 2026`
- previous month / next month buttons
- day cells with current day highlighted
- search/filter field: `Filter by name or tag`
- `Areas` section
- top-level checkbox for areas visibility
- `Team calendars` section
- checklist / legend of visible calendars

Observed checklist items:
- Unassigned
- Team 1
- Team 2
- Artur Pirogov

Observed behavior of checklist area:
- acts as both visibility filter and color legend
- each item has checkbox state and badge/icon
- the rail is not just informational, it is the active visibility control surface for schedule rendering

Important correction versus earlier rough wording:
- the top-right button is better described as a rail/menu opener than a gear/settings button
- once opened, it exposes the actual display/filter rail for the Schedule module

Doc-confirmed naming note:
- official HCP calendar help describes this as the **Schedule Menu** accessed from the menu icon in the top left of the calendar
- functionally, this is the slide-out panel containing monthly calendar navigation, filters, areas, and team calendars

UI-parity caution:
- in this live session, the rail content was surfaced by the right-side schedule button I tested
- because of that mismatch, the safest implementation takeaway is about the **panel contents and behavior**, not the exact icon placement

## 2.5 Populated schedule behavior

After scheduling and then assigning the test job:
- the schedule showed a single visit card for `Demo Research`
- the card moved between columns depending on assignment state

### Unassigned state
Observed card behavior before assignment:
- card appeared in `Unassigned` column
- snapshot exposed link text like `Demo Research Unassigned`
- clicking card opened the job detail page

### Assigned state
After assigning `Team 1`:
- card moved to `Team 1` column
- snapshot exposed link text like `Demo Research T1`
- image inspection showed the card rendered in the Team 1 lane with team color styling

## 2.6 Event / visit card structure

Observed on schedule grid card:
- clickable link to job detail page
- visible label included customer/job name: `Demo Research`
- visible team marker changed with assignment state (`Unassigned` vs `T1`)
- card visually rendered as a compact block in the time slot area

From screenshots and snapshots, the card appears to encode:
- title / customer name
- team/assignment indicator
- status / iconography inside card
- start/end positioning by grid placement rather than fully expanded text

## 2.7 Bulk actions mode

When `Bulk actions` is clicked, the header changes.

Observed controls in bulk mode:
- `Close`
- selection count text, example: `0/15 calendar items selected`
- `Edit assignees`
- `Reschedule`

Observed behavior:
- bulk action buttons were disabled when zero items were selected
- scheduled cards gained a checkbox inside the card row for selection
- this was directly observed in month view, where individual calendar items became selectable

This implies schedule supports multi-select mass operations.

## 2.7.1 Date picker behavior

Clicking the main date button opened a lightweight month picker.

Directly observed in the picker:
- month label, example `April 2026`
- `Previous month`
- `Next month`
- standard month grid with day cells

Implementation implication:
- the toolbar date control is not just a label, it is the primary jump-date picker for the schedule canvas

## 2.7.2 Calendar views, one by one

This section is the most useful one for a dev bot building an analog.

### `Day`
Observed live:
- single-day canvas
- date pill format like `Fri, April 10, 2026`
- time-of-day on the vertical axis
- scheduled items rendered within the day timeline
- when employee-oriented, resources/teams function as columns

Best analog mental model:
- one day
- one vertical timeline
- optional resource columns across the top

### `Week`
Observed live:
- seven date columns across the top
- date range label like `April 05-11, 2026`
- each day is a column
- scheduled items render in the relevant day cell/slot
- `View by employee` checkbox is available from the view dropdown

Best analog mental model:
- seven-day grid
- column per day
- optional secondary employee split mode

### `Monday-Friday`
Observed live:
- five date columns only
- date range label like `April 06-10, 2026`
- Monday through Friday headers only
- `View by employee` checkbox is available from the view dropdown

Best analog mental model:
- work-week calendar
- same family as week view, but with weekends removed from the renderer

### `Month`
Observed live:
- standard month grid with weekday headers `Sun` through `Sat`
- cells contain day number plus linked scheduled items
- items become bulk-selectable in `Bulk actions` mode
- month view does not expose the `View by employee` checkbox in the same way as day/week/business-week

Best analog mental model:
- classic month matrix
- compact tile/list representation inside each date cell

### `Dispatch`
Observed live:
- schedule remains time-oriented
- timezone header visible
- resource names appear stacked in a side/row structure rather than simple date columns

Best analog mental model:
- dispatcher board optimized for assigning work by resource and time, not a classic month/week calendar matrix

### `Schedule`
Observed live:
- in this account it behaves like the default operational scheduling board mode
- on the default date tested, resources were visible as top headers and jobs were distributed by assignment state

Best analog mental model:
- the primary operational schedule board the user lands on
- distinct from `Dispatch`, but still resource-aware and operationally focused

### `Map`
Doc-confirmed and route-observed:
- map exists at `/app/map`
- official docs say Jobs, Estimates, and Events can be displayed there as location pins
- official docs also say routing lines and travel estimates are available in **Day view of the Map**

Best analog mental model:
- geographic renderer over the same scheduled entities
- should be treated as another schedule surface, not a separate unrelated module

## 2.8 Schedule modal, job scheduling flow

Entry path used:
- open a job detail page
- click `Schedule`

Observed modal title:
- `Schedule a time for Job #1`

### Modal header controls
Observed:
- close/back button in modal header
- `Notify customer` checkbox
- explanatory text on checkbox hover/label context: email supported, text messaging not supported for org in this demo
- `Save` button

### Modal internal tabs
Observed toggle buttons:
- `Schedule` (selected by default)
- `Find a time`

I directly observed the `Schedule` tab. `Find a time` tab was visible but not deeply explored.

### Schedule tab fields
Observed fields and controls:
- `Start date` textbox
- date-picker button next to start date
- `Start time` combobox/textbox
- `End date` textbox
- date-picker button next to end date
- `End time` combobox/textbox
- `Anytime` checkbox
- team selector with label/input `Edit team`
- assignment summary text below selector, example initially `Unassigned`
- `Arrival window` dropdown, observed value `None`
- helper text under arrival window showing customer arrival time sentence
- `Repeats` dropdown, observed default value `Does not repeat`

### Job summary panel inside schedule modal
Observed below time controls:
- job identifier `Job #1`
- customer name
- street address
- city/state/zip
- phone number
- notifications-on indicator
- service name (`Home Cleaning`)
- services subtotal block showing `$0.00`
- small embedded map
- `View on map` button

### Tag/note sections inside schedule modal
Observed collapsible/accordion buttons:
- Customer tags
- Job tags
- Private notes

Observed content under Customer tags:
- tags input `Customer tags (press enter)`
- existing tag chip `VIP`

## 2.9 Team assignment inside schedule modal

Observed options exposed by `Edit team` in schedule modal:
- Team 1
- Team 2
- Artur Pirogov

Initial state in schedule modal for new job:
- assignment summary showed `Unassigned`

This indicates visits/jobs can be scheduled before being dispatched.

## 2.10 Separate Edit team modal on job page

A second assignment flow exists on the job page itself via `Edit team`.

Observed modal title:
- `Edit team`

Observed subtitle:
- `Select employees to dispatch job`

Observed controls:
- filter field: `Filter by name or tag`
- checkbox list
- `Cancel`
- `Save`

Observed list options:
- Unassigned
- Artur Pirogov
- Team 1
- Team 2

Observed behavior:
- initial state had `Unassigned` checked
- selecting `Team 1` and saving updated the job
- the job page then showed Team 1 as assigned
- the schedule card moved from Unassigned column to Team 1 column
- the job activity feed logged `Dispatched to Team 1`

This is a key behavior for building an analog: schedule placement and dispatch assignment are linked, but assignment can be changed after schedule is saved.

## 2.11 Save / post-save schedule behavior

After saving the schedule modal:
- job status changed from `Unscheduled` to `Scheduled`
- workflow area showed scheduled date/time inline
- activity feed logged the scheduling event
- a separate email activity entry appeared, meaning customer notification was actually emitted when notify was left enabled

Observed inline schedule summary on job page:
- `Fri, Apr 10, 2026`
- `2:30 PM - 3:30 PM CDT`

Observed workflow row/buttons on job page:
- LOCATION ON
- UNDO (rendered as `Undo Schedule`)
- Schedule
- OMW
- Start
- Finish
- Invoice
- Pay

## 2.12 Unschedule behavior

Observed unschedule control:
- `Undo Schedule`

What is directly confirmed:
- once a visit is scheduled, a dedicated undo/unschedule control appears next to the schedule milestone in the job workflow row

What is not directly confirmed:
- whether undo only removes the visit time or also clears dispatch assignment
- whether a confirmation dialog appears

## 2.13 Editing a scheduled visit

Directly observed editing entry points:
- click scheduled card in Schedule module to open job page
- click `Schedule` on job page to reopen schedule editor
- click `Edit team` on job page to change assignee without recreating visit

This means editing is job-centric rather than inline-only.

## 2.14 Deleting visits / recurring jobs

### Directly observed in product UI
Observed directly in the live app:
- unscheduling exists via `Undo Schedule`
- bulk `Reschedule` exists
- bulk `Edit assignees` exists
- scheduled items are job-centric, meaning edit/delete logic routes through the job detail page rather than an obvious full-featured inline calendar editor

### Second-pass confirmation from Housecall Pro help documentation
Using Housecall Pro help-center docs to close the gap on the recurring delete flow, the delete path is:
- open the target recurring job occurrence on the **job details page**
- if deleting the rest of the series from a point forward, open the **first occurrence that should NOT be completed**
- click the **gear & wrench** icon in the upper-right area of the job page
- choose `Delete job`
- choose one of:
  - `This Occurrence`
  - `This and Future Occurrences`
- once selected, the change is applied immediately and the user is returned to Home

### Important product rule
For recurring jobs, Housecall Pro appears to support **point-in-time destructive edits**, not a three-way split like:
- only this
- this and future
- all occurrences including past

The documented destructive choices are specifically:
- `This Occurrence`
- `This and Future Occurrences`

That means when designing an analog, the recurrence delete model should be built around:
- delete one generated child job only, or
- truncate the series from the selected occurrence forward

### Cancel vs delete
Housecall Pro documentation also states that deleting and cancelling recurring jobs follow the same series-scope rules as edits. In other words, cancellation/deletion decisions are also scoped at either:
- single job / single occurrence, or
- remainder of the series

## 2.15 Repeat / recurring visits and series logic

### Directly observed in scheduling UI
Observed field:
- `Repeats` dropdown in schedule modal
- default shown value: `Does not repeat`

Observed later in schedule screenshots:
- recurring scheduled job cards display a recurrence/repeat icon on the calendar card itself

### Directly observed elsewhere in product
Observed recurrence family in the customer `Auto Invoice` dialog:
- Never
- Daily
- Weekly
- Monthly
- Yearly

### Second-pass confirmation from Housecall Pro help documentation
Housecall Pro help docs make the recurrence model much clearer even though the schedule dropdown itself was not fully expanded during the live pass.

#### Recurrence is job-based, not generic-calendar-item-based
Docs explicitly state:
- recurrences are only available on **jobs**
- recurrences cannot be created on:
  - Segments
  - Estimates
  - Jobs with more than one appointment

This is a major implementation detail. The recurring engine is attached to the **job object / recurring job series**, not to every schedule item universally.

#### Recurring job conceptual model
From HCP docs plus the observed UI:
- a recurring job is a **series definition** that generates individual future jobs
- each generated job is its **own record** with its own job page, schedule, invoice, and job number
- the current job can be converted into the first item of a recurring series
- if you make an existing job recurring with 5 jobs total, the current job becomes occurrence 1 and 4 more future jobs are created

This aligns with the product article describing recurring jobs as separate records, not multiple appointments under one single job shell.

#### Supported repeat families
Across observed UI plus help docs, the recurrence families clearly in play are:
- Does not repeat / Never
- Daily
- Weekly
- Monthly
- Yearly

Housecall Pro's official recurring-job article also explicitly describes the feature as supporting:
- daily
- weekly
- monthly
- yearly
- custom recurring jobs

Also, Housecall Pro documentation describes recurring jobs conceptually as suitable for:
- weekly
- monthly
- quarterly
- annually

Implementation implication:
- `Quarterly` is represented conceptually as a recurring-job use case, not necessarily as its own top-level enum everywhere in the UI
- the recurrence engine therefore needs both a **base frequency** and an **interval multiplier**, for example every `3` months
- the auto-invoice recurrence dialog strongly suggests the same recurrence engine family supports `Repeat every N <unit>` patterns

#### Recurring job creation logic
Third-pass review made the creation path more precise, and the final browser pass tightened the live UI details around the dedicated recurring-job composer.

Observed live in app:
- the global `New` menu exposes both `Job` and `Recurring Job New`
- the schedule modal for a normal job contains a `Repeats` control with default `Does not repeat`
- the dedicated recurring-job page opens at `/app/recurring_jobs/new`
- page title: `New recurring job`
- top save action: `Save recurring job`
- the recurring-job composer includes the same broad job-template sections as a normal job shell: customer, notes, line items, schedule block, assignee/team, arrival window, and recurrence controls

Official HCP help documentation for web creation says the recurring-job flow is:
- click `New` in the navigation bar
- choose `Job`
- on the job page, click the pencil icon in the `Schedule` card on the left side
- click `Recurrence` at the top of the schedule page
- configure recurrence details
- click `Save Job`
- recurrence details are then reviewable from the recurring card on the left side of the job page

The live browser pass shows an important nuance:
- HCP also exposes a dedicated `Recurring Job New` entry in the global `New` menu
- so there are effectively two user-facing entry paths into the same product concept:
  - start from a normal job and add recurrence in scheduling
  - start directly from a recurring-job composer

This is the critical behavioral point:
- recurrence is configured from a **job-rooted scheduling/editor flow**, not from a separate generic calendar event composer
- the recurring series is rooted in a job template / job record context, then future jobs are generated from that rule

Also explicitly documented:
- `Job inputs do not carry over on recurring jobs`

This line is important, but the help article does not enumerate field-by-field exactly which inputs do not propagate. So the safe implementation-quality reading is:
- do **not** assume all mutable current-job edits become the default template for all generated future jobs
- only documented recurrence-aware edits should be treated as guaranteed forward-propagating behavior
- anything beyond that requires live-product verification before claiming parity

#### Recurring jobs versus multi-appointment jobs
Third-pass review also closes an easy-to-miss modeling trap.

Housecall Pro distinguishes:
- **Recurring jobs** = separate future jobs generated by a rule
- **Multi-day / multi-appointment jobs** = one job with multiple appointments under the same job shell

Docs explicitly state recurring jobs:
- create a new job for each occurrence
- give each occurrence its own schedule, invoice, and job number
- cannot include segments
- cannot include multiple appointments

Therefore the correct product model is:
- if the user needs repeated independent service visits with separate operational records, use a recurring job
- if the user needs several visits that still belong to one shared job/invoice, use multiple appointments instead
- recurrence should be blocked once a job has more than one appointment

#### Monthly / ordinal pattern support
This was strengthened by the final live browser pass.

Directly observed in the dedicated recurring-job composer:
- frequency presets:
  - `Does not repeat`
  - `Daily`
  - `Every weekday (Monday to Friday)`
  - `Weekly on Friday`
  - `Monthly on the second Friday`
  - `Yearly on Apr 10`
  - `Custom`
- custom base units in the `Repeats every` control:
  - `Day`
  - `Week`
  - `Month`
  - `Year`
- custom `Week` mode exposes weekday buttons for selecting repeat days
- custom `Month` mode exposes two rule families:
  - day-of-month style: `Day <n>`
  - ordinal weekday style: `<ordinal> <weekday>`
- custom `Year` mode exposes two yearly rule families:
  - specific day + month
  - ordinal weekday + month, structurally equivalent to patterns like `First Sunday of January`

From observed auto-invoice recurrence controls plus recurring-job documentation, the recurrence engine clearly supports both of these monthly-style families:
- fixed day-of-month patterns, for example `31st`
- ordinal weekday patterns, for example `5th Friday` or `last Friday`

That means an implementation-quality analog should support at least:
- `dayOfMonth`
- `ordinal` (`first|second|third|fourth|fifth|last`)
- `weekday`
- `interval`
- for yearly rules, `monthOfYear` combined with either day-of-month or ordinal weekday logic

One caution from the browser pass:
- the live accessibility tree did not reliably expose every dropdown option label once those sub-controls were still disabled, so I am comfortable claiming the two structural families above as directly observed
- the exact full ordinal option list beyond the already documented examples still rests partly on docs plus the visible UI structure, not a perfectly enumerated live dropdown capture

#### Never-ending recurrence behavior
This is one of the most important rules and is explicitly documented.

For a never-ending recurring series:
- the system does **not** create infinite rows up front
- it creates jobs ahead into a rolling future window
- the series is then **automatically extended** over time

Documented forward-generation windows:
- Daily jobs extend **1 year** into the future
- Weekly jobs extend **1 year** into the future
- Monthly jobs extend **1 year** into the future
- Yearly jobs extend **5 years** into the future

So the product behavior is effectively:
- recurrence series can be logically endless
- materialized future job instances are finite at any given moment
- a background extension rule keeps the horizon populated

If building an analog, this should not be implemented as literal infinite child creation. It should be implemented as:
- recurrence rule
- materialization horizon
- periodic forward extension job/process

#### Edit logic for recurring jobs
Docs close the loop on edit scope choices.

When editing a recurring job, the user can choose:
- `Only this job`
- `This job and all future jobs`

That is the exact mental model to preserve in an analog.

#### What changes propagate in `This job and all future jobs`
Docs explicitly say the following changes affect the current job and all future jobs:
- date
- time
- assigned technician / assignee
- arrival window

Docs also explicitly say:
- if recurrence details change, for example weekly -> monthly, the new rule starts with the current job
- if job duration changes, the duration resets starting with the current job

That means Housecall Pro uses a **series split from current occurrence forward** model.
Past occurrences are left untouched.

#### What `Only this job` means
When the user chooses `Only this job`:
- only the currently opened occurrence is edited
- the remainder of the recurring series keeps its existing rule and schedule
- there is no indication that a one-off edit rewrites the series template retroactively

#### Changing recurrence duration / end condition
The help docs are unusually explicit here.

If the series duration is changed by number-of-occurrences:
- the new number impacts **jobs moving forward only**
- it does **not** recompute the total series from occurrence 1

Documented example:
- a series has 4 occurrences
- on occurrence 2, the number is changed to 10
- result: there are 10 more occurrences starting with occurrence 2
- total becomes 11 in the full series

If the end date is moved further into the future:
- the recurrence is extended to that date

If the end date is changed to a date in the past:
- any recurrences after that date are deleted

This is a very important implementation rule. The recurrence editor is not re-deriving the entire historical series. It is mutating the forward-looking tail.

#### Monthly edge-case rules
Housecall Pro docs also define what happens when the requested monthly pattern does not exist in every month.

Documented behavior:
- if the recurrence is set to the **31st of each month**, jobs are created only in months that actually have a 31st
- months without a 31st simply have **no generated job**
- if the recurrence is set to the **5th Friday of the month**, jobs are created only in months that actually have a 5th Friday
- months without a 5th Friday have **no generated job**
- Housecall Pro recommends using patterns like **last Friday of the month** when the user expects something every month

Implementation implication:
- HCP does **not** coerce invalid monthly positions to the last day or nearest available weekday
- it **skips** months where the requested position/date does not exist

### Related global creation path
The global `New` menu includes:
- `Job`
- `Recurring Job New`
- `Estimate`
- `Event`
- `Customer`
- `Lead`

That confirms recurring jobs are a first-class creation flow, not just a hidden advanced option inside one-time scheduling.

## 2.15.1 Event creation logic in Schedule
The final browser pass also directly exercised Schedule -> `New` -> `Event`.

Observed event composer behavior:
- route opened at `/app/new_event`
- page title: `New event`
- top save action: `SAVE EVENT`
- no recurrence controls were surfaced in the event composer during this pass
- visible required scheduling fields:
  - `From` date
  - `From` time
  - `To` date
  - `To` time
  - timezone display, observed as `CDT`
  - team/dispatch selection control
- visible optional fields:
  - `Name`
  - `Note`
  - `Location`

Important live behavior:
- typing a time string alone was not enough to make the save action live immediately
- after selecting the typed time from the dropdown list, the save button became enabled
- that suggests the event form normalizes or validates time entries against the time-option list before considering the schedule valid

Directly confirmed create outcome:
- I created an event titled `Browser Event Final`
- after save, the page showed `Event - Browser Event Final` with `Saved`

Implementation implication:
- Schedule contains both job-rooted recurrence creation and a separate event composer
- based on this pass, recurring logic is clearly job-centric, while the visible event composer behaved as a one-off scheduled event form

## 2.15.2 Team creation and how it affects Schedule

This matters for building the Schedule analog because resource columns are team-driven.

Live observed settings path:
- top-right settings/company icon
- `Settings`
- `Team & Permissions`
- `Team` tab

Live observed controls there:
- heading `Employees`
- button `Add team member`
- employee table with columns such as:
  - Name
  - Company POC
  - Role
  - Rating
  - Reviews
  - App version
  - Last login
  - Tags

Live observed members in this demo account:
- `Team 1`
- `Team 2`
- `Artur Pirogov`

Doc-confirmed role model:
- Admin / Owner
- Office Staff
- Field Tech

Developer implication:
- schedule resources should be backed by employee/team entities configured in settings
- those entities should be reusable across:
  - assignment selectors on jobs/events
  - schedule columns in employee-oriented views
  - team calendar filters in the schedule side panel
- newly created team members should become eligible to appear as horizontal resource columns in day-like schedule views after they exist in the account

## 2.16 Calendar visuals to replicate

If building an analog, the calendar view should include:
- resource-column day grid
- current-time line and dot
- top date navigation row
- employee/team headers with badges
- color grouping controls
- left rail mini-calendar and filters
- bulk-selection mode with action bar
- event cards that reposition by assignee column
- direct click-through from card to job detail

---

# 3. Customer module

## 3.1 Customers list route and empty state

Observed route:
- `/app/customers/list`

Observed module-level top tabs:
- Customers
- Jobs
- Estimates
- Leads
- Invoices

Observed empty-state messaging on Customers tab:
- heading `Manage your customers`
- supporting line telling user to add a customer to start

Observed empty-state actions:
- `Add customer`
- `Import customers`

## 3.2 Add new customer modal

Observed modal title:
- `Add new customer`

This modal is long and segmented.

### Section A: Contact info
Observed fields:
- First name
- Last name
- Mobile phone
- Company
- Display name (shown on invoices)
- Home phone
- Role
- Email
- Work phone

Observed customer type radios:
- Homeowner
- Business

Observed dynamic behavior when switching to Business:
- a new checkbox appears: `We subcontract for this general contractor`

Observed add-more controls:
- `Add additional email`
- `Add additional phone number`

Observed expanded additional fields after using them:
- Additional Email
- Additional phone
- Additional phone note
- delete button for added email
- delete button for added phone row

Observed validation behavior:
- phone validation warning appears for obviously invalid numbers
- create button can still be enabled once required/core data is satisfied

### Section B: Status flags
Observed controls:
- `Mark as Do not service` checkbox
- helper text explains notifications will be turned off and jobs/estimates cannot be scheduled

### Section C: Address
Observed fields:
- Street
- Unit
- City
- State dropdown
- Zip
- Address Notes

Observed state picker options:
- full US states abbreviation list from AL through WY, including DC

Observed address-related controls:
- embedded map preview
- `Add Address`

### Section D: Notes and metadata
Observed fields:
- Customer notes
- `This customer bills to` lookup field
- Customer tags field (`press enter` behavior)
- Lead source field

Observed tags behavior:
- typing and confirming a tag turns it into a chip/button, example `VIP`

### Section E: Referral and notifications
Observed fields/controls:
- `Referred by` lookup field
- `Send notifications` checkbox

### Footer actions
Observed:
- `Cancel`
- `create customer`

## 3.3 Test customer created for deeper inspection

Created customer values:
- Name: Demo Research
- Company: Demo Plumbing LLC
- Role: Facility Manager
- Phones: mobile/home/work plus one additional phone with note
- Emails: primary + additional billing email
- Customer type: Business
- Address with note
- Customer note
- Customer tag: VIP
- Lead source: Google Ads

## 3.4 Customer detail page, primary tabs

After creation, the customer detail page opened.

Observed primary tabs:
- Profile
- Leads
- Estimates
- Jobs
- Invoices
- Attachments
- Notes

Observed top action buttons:
- Job
- Estimate
- Lead
- Service Plan
- Ask AI
- overflow / extra actions button

## 3.5 Customer Profile tab, left/meta sections

Observed sections on profile:
- Summary
- Contact info
- Payment method
- Communication preferences
- Customer tags
- Attachments accordion button
- Lead source accordion button
- Auto invoice accordion button
- Tasks accordion button

### Summary section
Observed fields:
- Created date
- Lifetime value
- Outstanding balance

### Contact info section
Observed displayed data types:
- Contact person and role
- Company
- list of primary phone numbers
- Additional Phone section with note
- list of emails
- Customer portal area with `SEND INVITE`

Observed editing affordances:
- edit pencil/button on section
- per-phone row action buttons

### Payment method section
Observed state in demo:
- empty/incomplete with warning that online payment method requires bank connection
- CTA link `GET STARTED`

### Communication preferences
Observed fields:
- Notifications enabled: Yes
- Email marketing consent: Opted-in
- `Opt-out` button

### Customer tags
Observed:
- tags input field
- existing tag chips, example `VIP`

## 3.6 Customer Profile tab, address and notes area

Observed address area:
- embedded map
- heading `1 address`
- search box for address list area
- row containing billing/service address
- address note visible under address

Observed address row contents:
- full address text
- row action button
- note text beneath

Observed private notes area:
- heading `Private notes`
- `Add customer note`
- feed filter tabs: All, Customer, Estimates, Jobs
- `View all`
- note feed items with author, timestamp, and note body

Observed activity feed area:
- separate activity feed section exists below notes
- empty-state shown when no broader activity exists on customer record

## 3.7 Customer Jobs tab

Observed route variant:
- customer detail page with `selectedTab=Jobs`

Observed header count:
- `1 job`

Observed supporting link:
- `View advanced sorting and filtering`

Observed table/list toolbar presence:
- selection checkbox column
- filter/sort/display controls on right side of list header area

Observed visible columns:
- #
- Job created date
- Job scheduled for
- Job completed date
- Customer
- Address
- Description
- Lead source
- Amount

Observed listed row data for test job:
- # = 1
- Job created date = Fri, Apr 10, 2026, 2:21 PM CDT
- Job scheduled for = Fri, Apr 10, 2026, 2:30 PM CDT
- Job completed date blank
- Customer = Demo Research
- Address = 123 Main St Suite 200, Chicago, IL 60601
- Description = Home Cleaning
- Lead source blank at row level
- Amount = $0.00

This confirms the customer module is not only profile-centric. It also acts as a customer-scoped operational hub for downstream objects.

## 3.8 Auto invoice dialog on customer profile

Observed by opening the `Auto invoice` accordion/action.

Observed dialog title:
- `Auto Invoice`

Observed description:
- system can automatically send the customer an invoice for unpaid completed jobs since last auto-invoice run

Observed recurrence dropdown options:
- Never
- Daily
- Weekly
- Monthly
- Yearly

Observed additional recurrence controls in yearly example:
- `Repeat every` numeric input
- recurrence unit label, example `year(s)`
- `Repeat on` radio options
- month dropdown
- day-of-month dropdown
- alternate ordinal weekday controls, disabled until corresponding radio selected

Observed dialog actions:
- `cancel`
- `save`

This recurrence dialog is useful reference material if building the recurring engine used elsewhere in the product.

---

# 4. Job page details relevant to both modules

Because scheduling is job-centric, the job detail page is a bridge between Schedule and Customers.

## 4.1 Job creation flow observed

Path used:
- customer profile -> `Job`

Observed intermediate modal:
- `Use a job template?`

Observed options:
- One-time clean
- Recurring clean
- Skip

After continuing, a job existed as `Job #1` and initially showed status `Unscheduled`.

## 4.2 Job page workflow row

Observed workflow row states/buttons:
- Schedule
- OMW
- Start
- Finish
- Invoice
- Pay

After scheduling, row showed:
- `Undo Schedule`
- scheduled date/time text
- rest of operational buttons remained

## 4.3 Field tech status section

After team assignment, observed a dedicated `Field tech status` table with columns:
- Employee name
- Status
- Total travel time
- Total time on job
- Total labor cost

Observed row example:
- Team 1
- Assigned
- empty travel/time values initially
- labor cost $0.00

This section appears to be the canonical assignment-status area after dispatch.

## 4.4 Job activity feed observed events

Observed events logged chronologically:
- Job created
- Job scheduled for specific date/time
- Job scheduled email sent to customer emails
- Dispatched to Team 1

This suggests the system maintains a detailed operational audit trail.

---

# 5. Data model implications for an analog

Based on direct observation, an analog should support at least these entities and relations.

## 5.1 Customer

Fields observed:
- firstName
- lastName
- displayName
- companyName
- role
- customerType (homeowner|business)
- subcontractorFlag (business-only)
- doNotService
- sendNotifications
- phones[] with type/context and optional note
- emails[]
- addresses[] with street, unit, city, state, zip, notes
- customerNotes
- billsToCustomerId
- tags[]
- leadSource
- referredBy
- communicationPreferences
- marketingConsent
- customerPortalInviteState
- createdAt
- lifetimeValue
- outstandingBalance

## 5.2 Job / visit dispatch record

Fields observed or strongly implied:
- jobNumber
- customerId
- status (unscheduled, scheduled, plus later workflow statuses)
- scheduledStart
- scheduledEnd
- anytime
- arrivalWindow
- repeats
- assignees[] / team assignment
- services[]
- materials[]
- subtotal
- tax
- total
- servicePlan linkage
- privateNotes
- jobTags
- auditTrail/events

## 5.2.1 Team / employee resource model

To reproduce Schedule correctly, the analog should also model a first-class team/employee resource entity.

Recommended fields:
- teamMemberId
- displayName
- initials / avatar badge text
- role (`admin|office_staff|field_tech` or equivalent)
- color
- tags[]
- activeOnSchedule
- loginState / inviteState
- lastLoginAt

Recommended schedule-facing derivations:
- canAppearAsScheduleColumn
- canBeAssignedToJob
- canBeAssignedToEvent
- sortOrderOnSchedule

Special schedule pseudo-resource:
- `Unassigned` should be modeled separately from real team members
- it behaves as a schedule bucket for items with no assignee

### Recurring-series fields required for an analog
Based on the second-pass recurrence findings, an implementation-quality analog should model recurring jobs explicitly, not as a loose boolean on a visit.

Recommended series-level fields:
- recurringSeriesId
- parentJobId or sourceJobId
- recurrenceEnabled
- recurrenceFrequency (`daily|weekly|monthly|yearly`)
- recurrenceInterval (for patterns like every 2 weeks or every 3 months / quarterly)
- recurrenceOrdinalRule (for patterns like 5th Friday / last Friday)
- recurrenceDayOfMonth
- recurrenceDayOfWeek
- recurrenceMonthOfYear
- recurrenceEndMode (`never|after_n_occurrences|on_date`)
- recurrenceOccurrenceCountRemaining or forwardCountRule
- recurrenceEndDate
- recurrenceScopeEditOptions (`only_this`, `this_and_future`)
- recurrenceScopeDeleteOptions (`this_occurrence`, `this_and_future_occurrences`)
- recurrenceMaterializationHorizon
- recurrenceLastExtendedAt
- recurrenceIconVisible

Recommended child-job / generated-occurrence fields:
- recurringSeriesId
- occurrenceIndex
- generatedFromSeriesRuleVersion
- isExceptionInstance
- overriddenScheduleFields
- overriddenAssigneeFields
- deletedFromSeriesAt / truncatedBySeriesChange

This distinction matters because Housecall Pro behavior is not “one row with many dates.” It is “one series rule that generates many concrete jobs.”

## 5.3 Schedule view state

View state observed:
- date
- current view mode
- colorBy dimension
- schedule filter mode
- visible calendars / visible assignees
- selected calendar items for bulk actions
- bulk-actions mode active/inactive
- date-picker open state
- left-rail search text from `Filter by name or tag`

Recommended additional renderer state for a robust analog:
- map vs calendar surface
- resource sort order
- whether `View by employee` is enabled
- month/week/day date range boundaries
- visible timezone label

---

# 6. What is confirmed vs remaining micro-gaps

For a developer handoff, this document is now strong enough to use as the primary build spec.

The remaining gaps are no longer around the core product model. They are mostly about exact field-level parity in a few edge cases and some unlabeled icon semantics.

## Confirmed well
- top-level schedule shell and navigation pattern
- all live-captured schedule calendar/view dropdown values
- `Color by` options and side-panel filter structure
- day/week/work-week/month/dispatch renderer families
- existence of map renderer and its role in the scheduling system
- team settings source of truth and its relationship to schedule columns/filters
- customer creation fields and structure
- homeowner vs business toggle behavior
- additional email/phone rows
- do-not-service flag meaning
- address structure
- tags field behavior
- customer detail tabs and sections
- customer jobs table columns
- schedule day-view layout
- empty vs populated calendar behavior
- schedule modal core fields
- notify customer checkbox
- team assignment modal and options
- schedule save behavior
- assignment moving card between columns
- undo schedule presence
- activity feed/event logging
- recurring job edit scope logic:
  - `Only this job`
  - `This job and all future jobs`
- recurring delete scope logic:
  - `This Occurrence`
  - `This and Future Occurrences`
- never-ending recurrence logical behavior:
  - series is logically endless
  - system materializes a forward horizon rather than infinite child rows at once
  - docs state daily/weekly/monthly are generated 1 year ahead and yearly 5 years ahead, then extended forward
- monthly edge-case skip behavior for missing dates like the 31st or 5th weekday
- recurrence availability constraints:
  - jobs only
  - not segments
  - not estimates
  - not jobs with more than one appointment

## Partially confirmed
- the exact visible option list and control order inside the live `Repeats` dropdown / recurrence editor on the schedule modal was not directly expanded during the UI pass, even though the broader recurring-job logic is now strongly confirmed through HCP docs
- the exact meaning of HCP's note `Job inputs do not carry over on recurring jobs` is not field-by-field enumerated in the help docs
- alternate `Find a time` tab exists but was not deeply inspected
- I still did not fully resolve the semantics of every unlabeled icon button in the top grouped controls from accessibility output alone
- the exact meaning of HCP's note `Job inputs do not carry over on recurring jobs` is still not field-by-field proven live
- the dedicated `Recurring Job New` shortcut was directly opened and structurally inspected, but its full equivalence versus the normal job -> recurrence path is still inferred rather than exhaustively A/B tested field by field

## Recommended next pass only if pixel-perfect parity is required
- explicitly open the live `Repeats` dropdown / recurrence editor in the schedule modal and record the exact label text, option order, and control dependencies shown in production UI
- inspect the exact flow behind `Recurring Job New` and verify whether it is a shortcut into the same job-schedule recurrence path or a distinct composer shell
- live-test what `Job inputs do not carry over on recurring jobs` means in practice, field by field
- open `Find a time` tab and document suggestion logic
- inspect event creation flow and non-job calendar entries
- inspect whether one-time non-recurring delete/unschedule differs from recurring delete/truncate wording

---

# 7. Invoice module

This section is written in the same developer-handoff style as the Schedule section.

Important high-level model:
- invoices are not a detached accounting object first
- in Housecall Pro, the live UX is strongly **job-rooted**
- an invoice can be reached from:
  - the global invoice list
  - the customer `Invoices` tab
  - the job page / job invoice preview flow
- but the concrete invoice preview and send workflow is tightly coupled to a job

## 7.1 Primary invoice entry points

Observed live:
- global list route: `/app/invoices`
- job invoice route: `/app/jobs/<job_id>/invoice`
- customer invoice-history route pattern: `/app/customers/<customer_id>?selectedTab=Invoices`

Doc-confirmed:
- invoice list can also be accessed from Home open-invoices surfaces and from customer/job contexts

Implementation takeaway:
- build Invoice as a first-class module with its own list/report surface
- but keep invoice detail, send, and payment behavior bound to job and customer context

## 7.2 Invoice list view

### Module route
Observed route:
- `/app/invoices`

Observed live behavior in this demo account:
- the invoices module loaded inside an iframe/specialized report container in the browser snapshot
- the top nav remained the normal app shell
- the invoice list itself did not fully expose accessible row content in this session, so the detailed list internals here rely more heavily on official docs than the invoice preview route did

### Doc-confirmed purpose
Official HCP docs describe the Invoice List as an improved report/list surface for tracking invoices that need attention.

### Doc-confirmed statuses
The official invoice list view docs define these statuses:
- `Open`
- `Paid`
- `Pending`
- `Canceled`
- `Voided`

Status semantics from docs:
- `Open` = any invoice with outstanding balance, including partially paid invoices
- `Paid` = fully paid invoice
- `Pending` = payment initiated but not yet settled, for example ACH still processing
- `Canceled` = invoice tied to canceled or deleted jobs
- `Voided` = manually voided invoice, especially relevant to progress invoicing

### Doc-confirmed list capabilities
The invoice list view supports:
- quick filters
- filter + edit columns
- applying payments from the list
- bulk selection / bulk send behavior for batch invoicing

Doc-confirmed quick view/filter family:
- `All`
- `Unsent`
- `Due`
- `Past Due`

Developer implementation target for the list surface:
- table/grid of invoices
- quick status filters
- advanced filter drawer
- editable visible columns
- row-level actions
- bulk actions

### Recommended list columns for an analog
Blend of live customer-tab evidence plus docs:
- billingType
- invoiceNumber
- jobNumber
- customerName
- dateSent
- datePaid
- dueDate / dueTerms
- amount
- outstandingAmount
- status
- paymentState

## 7.3 Customer invoice history tab

Observed live on the customer profile:
- route pattern: `/app/customers/<customer_id>?selectedTab=Invoices`
- tab label: `Invoices`
- heading example: `0 invoices`
- table columns captured live:
  - `Billing type`
  - `Invoice #`
  - `Job #`
  - `Date sent`
  - `Date paid`
  - `Amount`
  - `Status`
- pagination footer with previous/next buttons

Doc-confirmed customer invoice history behavior matches this structure.

Implementation implication:
- customer profile should expose invoices as a customer-scoped ledger view
- this customer-level list can be simpler than the global invoice report, but should use the same core invoice records

## 7.4 Job-rooted invoice preview screen

### Primary route
Observed route:
- `/app/jobs/<job_id>/invoice`

This is the most implementation-important invoice surface because it exposes the invoice preview and all major invoice edit/send actions.

### Top action bar
Observed live at the top of the invoice preview dialog/screen:
- `Print`
- `Download PDF`
- `Send`

This means invoice preview is also the action hub for output and delivery.

### Invoice preview body
Observed live in the invoice article/preview:
- business name
- customer name
- service address
- business phone
- business email
- invoice number
- service date
- payment terms, observed example: `Upon receipt`
- amount due
- contact-us/address block for the business
- line-item table
- totals table
- terms and conditions link

Observed live line-item table columns:
- `Services`
- `qty`
- `unit price`
- `amount`

Observed live totals block:
- `Subtotal`
- `Job Total`
- `Amount Due`

Observed important rendering detail:
- service-option / job-input answers can render under a service line item as descriptive detail text on the invoice preview

Developer implication:
- the invoice preview is not merely a raw totals screen
- it is a formatted customer-facing document view composed from job, customer, business, line item, and invoice settings data

## 7.5 Invoice detail side panel / editable sections

Observed live on the invoice preview page, to the right of the preview:

### Details block
Observed fields:
- `Invoice #`
- `Invoice date`
- `Invoice due`

Observed action:
- `details-edit`

Observed current value example:
- invoice due displayed as `Upon receipt`

### Amount due
Observed block:
- heading `Amount due`
- current value shown prominently

### Attachments
Observed block:
- heading `Attachments`
- edit button

### Invoice message
Observed block:
- heading `Invoice message`
- edit button

### Payment options
Observed block:
- expandable section `Payment options`
- bank connection warning when online payments are unavailable
- CTA `connect my bank`

Implementation implication:
- payment methods are invoice-send configuration, not only global company settings
- but available online methods are constrained by payment processor/bank setup state

### Additional collapsible sections observed
- `Job and invoice`
- `Business and customer`
- `Services`
- `Materials`

Developer interpretation:
- invoice preview page is modular and section-based
- each section controls what appears on the final customer-facing invoice or how invoice metadata is configured

## 7.6 Invoice editing modals observed live

During browser exploration I directly surfaced these invoice-related modals/dialogs:
- `Edit details`
- `Send invoice`
- `Invoice due`
- `Invoice message`
- `Attach files`

This is a strong live signal that invoice editing is decomposed into narrow focused editors rather than one giant full-screen form.

### `Edit details`
Observed live fields in `Edit details` modal:
- `Info`
  - `Invoice #` textbox
  - `Invoice date` textbox with calendar picker button
- `Payment terms`
  - radio: `Upon` + adjacent combobox, observed selected value `receipt`
  - radio: `Net` + adjacent numeric/day combobox, observed disabled value `30` until selected
  - radio: `On a date` + date textbox and calendar picker, disabled until selected
- `Amount due`
  - current amount displayed prominently
- footer buttons:
  - `Cancel`
  - `Save`

Safe implementation reading:
- edits invoice metadata such as invoice number, invoice date, and due-term mode
- due-term mode is a structured enum, not freeform text

### `Invoice due`
Observed existence live as its own modal.

Safe implementation reading:
- due terms are chosen/configured in a dedicated due-rule editor
- due terms are treated as invoice metadata rather than freeform note text

Live-supported + doc-supported due-term family now strong enough to model as:
- `upon_receipt`
- `net_x_days`
- `on_specific_date`

Doc-confirmed broader defaults/settings ecosystem also mentions additional company-level due-term patterns such as:
- upon start of work
- upon completion of work

Implementation caution:
- those broader due-term choices are strongly doc-supported in invoice settings
- but in this specific live individual-invoice modal pass, I directly captured only `Upon`, `Net`, and `On a date`

### `Invoice message`
Observed existence live as its own modal.

Safe implementation reading:
- outgoing message text is customizable per invoice send flow
- this message is distinct from the structured invoice preview body

Doc-confirmed detail:
- there is also a company-level default `Message on invoices, receipts, and estimates`
- individual invoice message overrides can be edited per invoice from the invoice preview flow

### `Attach files`
Observed live modal title:
- `Attach files`

Observed live tabs in that modal:
- `Attachments`
- `Checklists`

Doc-confirmed attachment rules:
- files must already exist on the job before they can be attached to the invoice
- attachments are visible to the customer when sent
- attachments are not embedded directly into the PDF email attachment by default

Implementation implication:
- invoice attachments are references to job/customer assets, not arbitrary standalone invoice-only uploads first

## 7.7 Send invoice flow

### Trigger points
Doc-confirmed and live-consistent:
- from the job page action bar via invoice/send action
- from the invoice preview via `Send`

### Live send flow structure
Observed live:
- opening invoice send from the job surfaced a `Send invoice` dialog
- the invoice preview route also exposes a `Send` button in the top-right action bar

### Doc-confirmed send capabilities
Official docs say the send flow supports:
- email or text delivery
- editing subject line or message
- adding multiple email recipients in the `To` field
- choosing payment options
- reviewing attachments

Important doc-confirmed rule:
- invoice can be sent by **email OR text**, not both simultaneously in a single send action
- multiple email recipients are allowed
- text can only be sent to one number at a time

Developer-grade send-flow model:
1. user opens invoice preview
2. user configures visibility/payment/message/attachments/details
3. user clicks `Send`
4. send modal chooses channel and recipient(s)
5. final send action creates delivery event(s)

## 7.8 Print / download / preview logic

Observed live on preview:
- `Print`
- `Download PDF`

Doc-confirmed:
- invoice preview can be opened without sending
- invoices can be printed or downloaded as PDF from the web portal

Implementation implication:
- preview rendering should be reusable for:
  - on-screen preview
  - print layout
  - downloadable PDF generation

## 7.9 Payment logic and payment entry points

Doc-confirmed invoice list features:
- payments can be applied from the invoice list view
- payments can also be applied from invoice preview

Doc-confirmed invoice-summary actions on jobs:
- credit-card/payment action can apply payment to an invoice

Doc-confirmed payment-state nuance:
- `Pending` must be supported as distinct from `Paid`

Implementation implication:
- invoice should track both document state and payment state
- a useful minimal model includes:
  - totalAmount
  - paidAmount
  - amountDue
  - paymentStatus (`unpaid|partial|paid|pending`)
  - invoiceStatus (`open|paid|pending|canceled|voided` or equivalent)

## 7.10 Invoice reminders / automations

Doc-confirmed from official invoice reminder help:
- invoice reminders are a separate automation layer from invoice sending
- they can be turned on/off in invoice settings/automations
- reminder cadence can be configured
- reminder count can be capped
- exclusions can be defined by customer name or customer tag

Doc-confirmed send prerequisites for reminders:
- job must be finished
- invoice needs a due date
- balance must be greater than zero
- invoice must already have been sent
- reminders begin after the due date has passed and the invoice remains unpaid

Developer implication:
- reminders should not be modeled as part of the base send action alone
- they are invoice-automation rules operating on sent unpaid overdue invoices

## 7.10.1 Auto invoicing vs invoice reminders

This distinction is important for a dev bot because the names are easy to conflate.

Doc-confirmed:
- **Auto invoicing** sends invoices for newly finished unpaid jobs on a configured cadence
- **Invoice reminders** remind customers about invoices that were already sent and are now overdue

Doc-confirmed auto-invoicing properties:
- can be configured from customer profile or job details page
- applies at the customer level to unpaid invoices for that customer
- recurrence options include:
  - `Never`
  - `Daily`
  - `Weekly`
  - `Monthly`
  - `Yearly`
- supports repeat-every and repeats-on style configuration
- starts when jobs are marked finished and have due amount
- not supported for progress invoices

Developer implication:
- model `autoInvoicingRule` separately from `invoiceReminderRule`
- auto invoicing is closer to a scheduled send policy for new invoices
- reminders are a post-send delinquency follow-up policy

## 7.11 Batch invoicing

Doc-confirmed behavior:
- multiple invoices can be selected from the invoice list and bulk-sent
- filter/edit-columns assists selection
- customer profile also supports selecting multiple invoices for the same customer and batch invoicing them together

Doc-confirmed customer-profile batch actions include:
- batch invoice send
- batch payment collection

Implementation implication:
- invoice selection state should exist at list level
- bulk actions should be capable of operating across multiple invoice records

## 7.12 Progress invoicing

Doc-confirmed from HCP help:
- progress invoicing can be enabled in invoice settings
- it allows multiple staged invoices for one job
- each invoice may use percentage-based or fixed-amount billing slices
- each invoice can have its own due terms and payment options
- progress invoices can be edited partially after creation
- progress invoices can be voided

Doc-confirmed job-page behavior when progress invoicing is enabled:
- an `Invoice Summary` table appears on the job
- actions include:
  - `+ Invoice`
  - edit invoice details
  - apply payment
  - more actions: resend/send, view, print, export as PDF, void

Developer implication:
- if building an HCP analog with roadmap depth, invoice should support two operating modes:
  - single-invoice-per-job baseline
  - progress/multi-invoice-per-job advanced mode

## 7.13 Recommended invoice domain model for an analog

### Core invoice record
- invoiceId
- invoiceNumber
- jobId
- customerId
- billingType
- invoiceDate
- dueType / dueTerms
- dueDate
- status
- paymentStatus
- dateSent
- datePaid
- subtotal
- taxTotal
- discountTotal
- grandTotal
- amountPaid
- amountDue
- messageToCustomer
- sendChannelHistory[]
- attachmentRefs[]
- checklistRefs[]
- printableTermsUrl

### Invoice line item snapshot
- invoiceLineId
- sourceType (`service|material|adjustment|other`)
- sourceRefId
- displayName
- description
- qty
- unitPrice
- amount
- optionSummaryText

### Delivery event
- deliveryId
- invoiceId
- channel (`email|sms`)
- recipients[]
- subject
- message
- sentAt
- deliveryStatus

### Reminder automation state
- remindersEnabled
- reminderCadenceDays
- maxReminderCount
- remindersSentCount
- lastReminderSentAt
- excludedByCustomerRule
- excludedByTagRule

## 7.14 Confirmed vs remaining gaps for Invoice

## Confirmed well
- invoices exist as a first-class module/list at `/app/invoices`
- customer profiles expose an `Invoices` tab with invoice-history columns
- invoice preview/detail is strongly job-rooted at `/app/jobs/<job_id>/invoice`
- invoice preview includes print, PDF download, and send actions
- invoice preview has modular editable sections: details, attachments, invoice message, payment options, job/invoice, business/customer, services, materials
- attachment flow includes `Attachments` and `Checklists`
- due terms are editable as a dedicated invoice property
- exact individual-invoice `Edit details` modal structure is now captured live: invoice number, invoice date, and three due-term modes (`Upon`, `Net`, `On a date`)
- payment options are shown in the invoice preview and are constrained by payment setup state
- invoice status families and batch/list/payment/progress features are doc-confirmed
- distinction between auto invoicing and invoice reminders is doc-confirmed and now included

## Partially confirmed
- the full accessible row structure of the global `/app/invoices` table was not fully exposed in this browser session because the module rendered inside an iframe/report container
- I did not complete a full create-new-invoice mutation beyond preview/send-edit exploration on the existing test job invoice
- exact list filter labels and edit-columns UI were doc-confirmed but not fully enumerated live
- the standalone `Invoice due` modal was surfaced earlier, but after capturing `Edit details` the due-term structure was already sufficiently visible there, so I did not need to fully enumerate the separate due modal again
- exact invoice-message field structure was not fully captured from the message modal, though its existence and default-vs-per-invoice override model are now well supported by docs

## Recommended next pass only if pixel-perfect parity is required
- enumerate the live `/app/invoices` filter drawer and edit-columns controls directly from the rendered list
- capture the exact radio/select options inside the `Invoice due` modal
- capture the exact form fields inside `Edit details` and `Invoice message`
- live-test apply-payment flows from both list and invoice preview
- if progress invoicing is enabled in the test account, create multiple staged invoices on one job and record exact summary-table states

---

# 8. Workspace continuity note

During exploration I also kept a checkpoint file:
- `housecallpro_research_notes.md`

That file contains abbreviated progress notes so a future session can resume faster if needed.
