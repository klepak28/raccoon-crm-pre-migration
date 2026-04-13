# Business Rules

## Evidence policy
### Hard requirements
- Use only source-backed behavior.
- If behavior is not fully established, record it as `OPEN_QUESTION`.
- Do not infer pixel-perfect UI details from partially observed controls.

## Customer rules
### Hard requirements
- `Do not service` means:
  - notifications are turned off
  - jobs and estimates cannot be scheduled
- Business customer type reveals subcontractor-related option.
- Tags are entered as text and stored as chips.

## Team and assignment rules
### Hard requirements
- Team members / employees are configured in settings and reused across schedule and assignment flows.
- `Unassigned` is a valid scheduling state.
- Assignment changes schedule placement.
- Assignment changes are recorded in the job activity feed.

## Scheduling rules
### Hard requirements
- Scheduling is job-centric.
- A job can be scheduled before assignment.
- Saving a schedule moves a job from `Unscheduled` to `Scheduled`.
- Schedule view changes must preserve current schedule context.
- Empty schedule dates still render the operational calendar shell.
- Bulk actions are disabled when zero items are selected.

## Notification rules
### Hard requirements
- Schedule modal includes `Notify customer`.
- When notify is enabled and schedule is saved, notification activity is recorded.

## Recurrence rules
### Hard requirements
- Recurrence applies to jobs only.
- Recurrence is not supported for:
  - segments
  - estimates
  - jobs with more than one appointment
- Recurring jobs generate separate job records for each occurrence.
- Current job can become the first occurrence in a recurring series.
- Recurrence supports interval-based rules.
- Monthly recurrence supports:
  - day-of-month
  - ordinal weekday
- Yearly recurrence supports:
  - specific date pattern
  - ordinal weekday + month pattern
- Never-ending recurrence is materialized only within a forward horizon.
- Forward horizon from source:
  - daily, weekly, monthly: 1 year
  - yearly: 5 years
- Recurring edit scope options:
  - `Only this job`
  - `This job and all future jobs`
- Recurring delete scope options:
  - `This Occurrence`
  - `This and Future Occurrences`
- Forward-looking recurrence changes do not recompute history.
- If recurrence duration changes by number of occurrences, the new count applies moving forward only.
- If recurrence end date is moved into the past, future recurrences after that date are deleted.
- Monthly invalid-date behavior skips missing dates rather than coercing them.

## Recurrence propagation rules
### Hard requirements
- Source docs explicitly say these changes can apply to current and future jobs:
  - date
  - time
  - assigned technician / assignee
  - arrival window
- If recurrence rule changes, the new rule begins with the current job.
- If job duration changes, the reset begins with the current job.

## Event rules
### Hard requirements
- Events are created via a separate composer.
- Source spec supports one-off event creation.
- Source spec does not establish recurring event behavior.

## Invoice rules
### Hard requirements
- Invoice detail is job-rooted.
- Invoice reminders apply only after initial invoice send and only when overdue/unpaid.
- Auto invoicing and invoice reminders are different systems.
- Auto invoicing applies to newly finished unpaid jobs.
- Auto invoicing is not available for progress invoices.
- Payment state must distinguish at least unpaid / partial / pending / paid behavior.

## OPEN_QUESTION
- Exact field-by-field meaning of `Job inputs do not carry over on recurring jobs` is not defined in source.
- Exact unschedule side effects are not confirmed.
