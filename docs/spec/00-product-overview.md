# Product Overview

## Purpose
Build a Housecall Pro-like product surface centered on:
- Schedule
- Customers
- Invoices

The source spec describes observed and doc-confirmed behavior from a live Housecall Pro demo account.

## Primary product surfaces
- **Schedule**: operational calendar, dispatch, assignment, recurrence, events
- **Customers**: CRM-style customer records with profile, jobs, invoices, and metadata
- **Invoices**: job-rooted invoice preview, sending, tracking, reminders, and list views
- **Job detail**: bridge layer connecting customer, schedule, dispatch, and invoicing workflows

## Global navigation and creation
### Hard requirements
- Top-level desktop navigation includes:
  - Get started
  - Home
  - Inbox
  - Schedule
  - Customers
  - My money
  - Payroll
  - More
- Global header includes:
  - search
  - `New` button
  - notifications
  - app/integrations launcher
  - settings/company icon
  - account avatar/menu
- `New` menu supports creating:
  - Job
  - Recurring Job
  - Estimate
  - Event
  - Customer
  - Lead

## Core product model
### Hard requirements
- Scheduling is **job-centric**, not a detached calendar-only system.
- Invoice preview and send flows are also **job-rooted**.
- Customers act as a hub for related operational records.
- Team members / employees are first-class resources and drive schedule assignment and visible schedule columns.
- `Unassigned` is a special pseudo-resource bucket in scheduling.

## High-level object model
### Hard requirements
- Customer
- Job
- Team member / employee resource
- Scheduled visit / appointment state on a job
- Recurring job series and generated occurrences
- Event
- Invoice
- Delivery / reminder automation state

## Cross-module workflow summary
### Hard requirements
- User can create a customer.
- User can create a job from customer context.
- User can schedule the job.
- User can leave a job unassigned or assign it to a team member.
- Assigned state changes schedule placement.
- Job workflow progresses through scheduling and invoicing actions.
- Invoice can be previewed, edited, sent, printed, and downloaded.

## Design constraints from source spec
### Hard requirements
- Extract certainty carefully from source labels: observed, doc-confirmed, partially observed, not directly confirmed.
- Preserve explicit uncertainty instead of filling gaps.
- Treat recurrence as a first-class rule system, not a simple checkbox.

## Optional / future-facing ideas mentioned in source
- Map view as a schedule renderer
- Progress invoicing
- Batch invoicing
- Auto invoicing and invoice reminders

## OPEN_QUESTION
- Exact product boundaries outside Schedule, Customers, Jobs, and Invoices are not specified beyond navigation labels.
