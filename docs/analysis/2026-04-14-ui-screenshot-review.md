# UI Screenshot Review, 2026-04-14

## Purpose
Capture detailed, screenshot-derived UI observations for the target Customers / Jobs / Scheduler experience without inventing behavior that is not visible.

## Source images
- `docs/pictures/new job creation.png`
- `docs/pictures/new job creation2.png`
- `docs/pictures/scheduler day view.png`
- `docs/pictures/scheduler day view create new job.png`
- `docs/pictures/scheduler month view.png`

---

## 1. `new job creation.png`

### Visible page shell
- Title `New job`
- close icon at top left
- dropdown caret next to title
- top-right controls:
  - `Job Template`
  - help icon
  - `Save job`, disabled in the captured state

### Overall layout
- two-column create screen
- left column is narrow and form-heavy
- right column is wider and pricing/details-heavy

### Left column, Customer
- section title `Customer`
- search field placeholder truncated as `Name, email, phone, or addre...`
- clear icon inside the field
- inline action `+ New customer`

### Left column, Schedule
- section title `Schedule`
- action icons include undo/back-like control and edit/pencil control
- visible fields:
  - `From`
  - `To`
  - date value observed as `Tue, Apr 14 2026`
  - time values observed as `9:15am` and `10:15am`
  - timezone label `Timezone: CDT`
  - `Anytime`
  - `Edit team`
  - selected team chip `Team 1`
  - `Notify customer`

### Left column, lower expandable rows
- `Checklists`
- `Attachments`
- `Fields`

### Right column, notes and pricing
- `Private notes`
- scope toggle:
  - `This job`
  - `Customer`
- note textarea with placeholder `Add a private note here`
- `Line items`
- section `Services`
- section `Materials`
- money summary rows:
  - `Subtotal`
  - `Tax rate`
  - `Total`

### Observed service row
- service name `Home Cleaning`
- `Total price`
- service edit/delete controls
- `Add service`
- `Service Price Book`

### Observed materials row
- `Add material`
- `Material Price Book`

### OPEN_QUESTION
- exact semantics of the two line-item view toggle icons are not visible
- exact launch behavior of `+ New customer` is not visible
- exact persistence semantics of `This job` vs `Customer` notes are not visible

---

## 2. `new job creation2.png`

### Visible page shell
- title `Schedule a time for Job`
- close icon at top left
- header actions:
  - `Notify customer`
  - `Save`

### Layout
- left scheduling form rail
- right live day scheduler grid

### Left scheduling rail
- top date input observed as `04/14/26`
- top time input observed as `2:00pm`
- `Anytime`
- `Edit team`
- selected team chip `Team 1`
- `Arrival window`
- helper text below arrival window, referencing scheduled arrival for Team 1
- `Repeats`
- `Repeats every`
- numeric interval `1`
- repeat unit `Week`
- `Repeats on`
- weekday bubble buttons visible
- `Ends`
- end choices:
  - `Never`
  - `After`
  - `On`
- collapsed/expandable `Job` section at the bottom of the captured viewport

### Right live grid
- scheduler toolbar still visible while placing the job
- employee/resource columns visible:
  - `Unassigned`
  - `Team 1`
  - `Team 2`
  - `Artur P.`
- red current-time line around `1pm`
- blue card `New Job` placed in `Team 1`
- gray card `Demo Research` visible in `Unassigned`

### OPEN_QUESTION
- only one date/time pair is visible in the screenshot crop, so full start/end arrangement is not fully confirmed here
- exact weekday selection state in `Repeats on` is not fully legible

---

## 3. `scheduler day view.png`

### Global shell
- promo banner at top with `Upgrade now`
- app top nav includes:
  - `Home`
  - `Inbox`
  - `Schedule`
  - `Customers`
- top-right global controls include:
  - `Search`
  - `New`
  - notifications/settings/avatar controls

### Scheduler toolbar
- menu/rail toggle icon
- `Today`
- `Bulk actions`
- previous / next arrows
- date label `Tue, April 14, 2026`
- calendar icon button
- map pin icon button
- `Color by: Employee`
- view dropdown `Schedule`
- gear icon

### Left rail
- mini month calendar for `April 2026`
- `Filter by name or tag`
- `Areas`
- `Employees`
- checklist items:
  - `Unassigned`
  - `Team 1`
  - `Team 2`
  - `Artur Pirogov`

### Main day grid
- timezone label `GMT-05`
- visible hour labels roughly `7am` through `5pm`
- columns:
  - `Unassigned`
  - `Team 1`
  - `Team 2`
  - `Artur P.`
- red horizontal current-time style line
- visible unassigned card `Demo Research`

### OPEN_QUESTION
- exact meaning of the calendar vs map icon buttons is not explicitly labeled
- exact meaning of the floating blue action button is not visible

---

## 4. `scheduler day view create new job.png`

### Confirmed create entry point from scheduler
- scheduler is visible in day view
- global `New` menu is open
- menu items are:
  - `Job`
  - `Recurring job`
  - `Estimate`
  - `Event`

### Other visible elements
- same left rail and day-grid structure as normal day view
- time grid and employee columns remain visible under the open create menu

### OPEN_QUESTION
- screenshot does not show whether `Job` from this menu opens the same `New job` screen or a different create flow, though it strongly suggests a linked workflow

---

## 5. `scheduler month view.png`

### Toolbar
- scheduler toolbar retains:
  - `Today`
  - arrows
  - month label `April 2026`
  - calendar/map buttons
  - `Color by: Employee`
  - view dropdown `Month`

### Left rail
- mini calendar remains present in month view
- employee filters remain present in month view

### Month grid
- weekday headers `SUN` through `SAT`
- selected/current day `14` highlighted
- stacked compact events inside day cells
- visible labels include:
  - `Demo Research`
  - `Event - Browser Event Final`

### OPEN_QUESTION
- exact semantics of gray/red/beige event colors are not confirmed by the screenshot alone

---

## Cross-screen implementation implications

### Scheduler
- keep a persistent left rail in both day and month views
- keep employee filtering visually integrated into the scheduler shell
- preserve `Unassigned` as a first-class visible lane
- preserve board-style day layout instead of collapsing day scheduling into a plain list

### Job creation
- treat job creation as a real workspace, not a tiny modal
- keep customer lookup and `+ New customer` inside the create flow
- keep scheduling and line items visible as separate concerns

### Scheduling flow
- scheduling should feel anchored to the live board
- team selection and repeat settings belong beside the board, not hidden elsewhere

### Customers
- current screenshot set is insufficient to redefine customer list/detail layout directly
- customer-specific work should continue to rely mainly on `docs/spec/10-customers.md` until customer screenshots are added
