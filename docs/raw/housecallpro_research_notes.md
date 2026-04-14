# Housecall Pro Research Notes

## Session checkpoints

- 2026-04-10: Started research for Schedule and Customer modules.
- Goal: produce exhaustive implementation-oriented documentation for Schedule and Customer in a final workspace file.

## Progress log

- Environment check started.
- Logged into Housecall Pro demo account successfully.
- Schedule module reached at `/app/calendar_new`.
- Customers list reached at `/app/customers/list`.
- Captured visual/structural notes for the empty-state schedule day view.
- Opened `Add new customer` modal and captured all visible base fields.

## Captured details

### Customers module, empty list state
- Top-level sub-tabs inside Customers module: Customers, Jobs, Estimates, Leads, Invoices.
- Empty-state CTA set includes `Add customer` and `Import customers`.

### Add new customer modal, base fields observed
- Contact info: first name, last name, mobile phone, company, display name, home phone, role, email, work phone.
- Customer type radio options: Homeowner, Business.
- Expansion actions: add additional email, add additional phone number.
- Special status: `Do not service` checkbox with warning that notifications are turned off and scheduling jobs/estimates becomes impossible.
- Address block: street, unit, city, state, zip, address notes, embedded map, add address.
- Notes/meta block: customer notes, bills-to customer lookup, customer tags, lead source.
- Referral/notifications block: referred by lookup, send notifications checkbox.
- Footer actions: Cancel, create customer.

### Schedule module, empty day view observed
- Top schedule toolbar: Today, Bulk actions, previous/next day, active date pill, 2-state view toggle, `Color by` dropdown, schedule/team filter dropdown, settings button.
- Main calendar layout is a dispatcher/resource day grid grouped by employee/team columns.
- Visible columns in demo account: Unassigned, Team 1, Team 2, Artur Pirogov.
- Left rail: mini month calendar, name/tag filter, Areas section, Team calendars checklist/legend.
- Visual cues: current-time red horizontal line, timezone label, blank grid as empty state.

### Additional observed flows after creating test data
- Created customer `Demo Research` and job `Job #1`.
- Created/saved one scheduled visit for Fri Apr 10, 2026 2:30 PM to 3:30 PM CDT.
- Confirmed visit card appears in schedule grid and opens the job detail page.
- Confirmed assignment changes move the scheduled card between resource columns.
- Confirmed `Bulk actions` mode exposes selection count, `Edit assignees`, and `Reschedule`.
- Confirmed job workflow shows `Undo Schedule` after saving a visit.
- Confirmed customer profile tabs and customer Jobs table with real record data.
- Wrote full spec file: `housecallpro_schedule_customer_detailed_spec.md`.
- Second pass: enriched the spec with recurring-job logic from Housecall Pro help docs to close gaps on edit scope, delete scope, never-ending recurrence behavior, duration changes, and monthly edge cases.
- Third pass: tightened the creation/edit model so the recurrence flow matches HCP's job-centric behavior more precisely.
- Final browser pass: directly captured Schedule view dropdown contents, `Color by` options, left-rail filter panel, date picker behavior, event creation flow, and the custom recurring-job editor structure for week/month/year.
- Key confirmed recurring rules captured in spec:
  - edit scope: `Only this job` / `This job and all future jobs`
  - delete scope: `This Occurrence` / `This and Future Occurrences`
  - never-ending recurrence auto-extends instead of creating infinite rows up front
  - daily/weekly/monthly extend 1 year ahead, yearly extends 5 years ahead
  - invalid monthly positions are skipped rather than coerced (for example 31st, 5th Friday)
  - official create flow is `New` -> `Job` -> Schedule card pencil -> `Recurrence` -> configure -> `Save Job`
  - recurring jobs are separate job records, not multi-appointment visits under one shared job
  - recurring jobs cannot include segments or multiple appointments
  - HCP explicitly advertises daily/weekly/monthly/yearly plus custom recurring jobs
  - docs warn that `Job inputs do not carry over on recurring jobs`, but that warning still needs field-by-field live verification for absolute parity
- Added an Invoice-module research pass aimed at extending the same document into a broader developer handoff spec.
- Invoice findings captured from live UI + docs:
  - invoice module/list route exists at `/app/invoices`
  - customer invoice history tab columns captured live: `Billing type`, `Invoice #`, `Job #`, `Date sent`, `Date paid`, `Amount`, `Status`
  - job-rooted invoice preview route exists at `/app/jobs/<job_id>/invoice`
  - invoice preview top actions captured live: `Print`, `Download PDF`, `Send`
  - right-side invoice sections captured live: `Details`, `Attachments`, `Invoice message`, `Payment options`, `Job and invoice`, `Business and customer`, `Services`, `Materials`
  - invoice-related modals surfaced live: `Edit details`, `Send invoice`, `Invoice due`, `Invoice message`, `Attach files`
  - final pass captured exact `Edit details` structure: invoice number, invoice date picker, and due-term modes `Upon`, `Net`, `On a date`
  - docs clarified broader due-term/default ecosystem and the distinction between Auto Invoicing vs Invoice Reminders
  - `Attach files` modal contains `Attachments` and `Checklists` tabs
  - payment-options block warns to connect bank account to offer online payments
  - invoice preview renders invoice number, service date, payment terms, amount due, services table, and totals block
  - docs confirm invoice list statuses: `Open`, `Paid`, `Pending`, `Canceled`, `Voided`
  - docs confirm batch invoicing, invoice reminders, print/download/PDF actions, and progress invoicing summary/actions
- Additional final-pass Schedule UI findings now captured:
  - view/type dropdown options: `Schedule`, `Dispatch`, `Day`, `Week`, `Monday-Friday`, `Month`
  - `View by employee` appears on `Day`, `Week`, and `Monday-Friday`
  - `Color by` options captured live: `Area`, `Employee`
  - the right-side menu button opens the active left rail with mini calendar, `Filter by name or tag`, `Areas`, and `Team calendars`
  - toolbar date button opens a month-grid date picker with previous/next month navigation
  - `Bulk actions` in month view adds selectable checkboxes to calendar items and enables `Edit assignees` / `Reschedule`
  - `New` -> `Event` opens `/app/new_event`; visible event form looked one-off rather than recurrence-based in this pass
  - created and saved event `Browser Event Final`
  - event time fields required selecting a concrete dropdown option before the save button enabled
  - `Settings` -> `Team & Permissions` -> `Team` is the live source of team members that feed schedule columns / filters
  - dev spec was further adapted into a developer-handoff document with explicit view matrix, axis definitions, resource model, and team/settings linkage
