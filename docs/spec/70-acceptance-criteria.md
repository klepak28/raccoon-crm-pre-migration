# Acceptance Criteria

## Product overview
- Structured spec set exists for overview, customers, scheduler, invoices, business rules, edge cases, open questions, and acceptance criteria.
- All requirements are sourced from `docs/raw/full-spec.md` only.
- Ambiguities are labeled `OPEN_QUESTION` instead of being resolved by assumption.
- Repetition from the source handoff is reduced.

## Customers
- Customer creation spec lists all observed core fields and dynamic behaviors.
- Customer detail spec includes profile sections, tabs, actions, jobs view, invoices view, and auto-invoice configuration.
- `Do not service` meaning is captured exactly as stated in the source.

## Scheduler
- Shared schedule shell, toolbar behavior, and view types are captured.
- Resource-based day layout and `Unassigned` bucket behavior are captured.
- Left rail behavior and filtering are captured.
- Scheduling flow, assignment flow, bulk actions, and post-save behavior are captured.
- Recurring job model, scope rules, and materialization behavior are captured.
- Event creation behavior is captured separately from recurring jobs.

## Invoices
- Invoice list, customer invoice history, and job-rooted invoice preview are captured.
- Invoice edit flows, send flows, attachment rules, due-term rules, and reminder/auto-invoice distinctions are captured.
- Progress invoicing is separated as optional/future-facing.

## Business rules and edge cases
- Business rules summarize only source-backed behavioral rules.
- Edge cases capture skip behavior, scope behavior, and unsupported recurrence cases.
- Known unknowns are not converted into requirements.

## Quality bar for this normalization pass
- No implementation code is introduced.
- No new product behavior is invented.
- Optional ideas are clearly separated from hard requirements.
- Files are concise, readable, and suitable as a cleaner downstream build spec.
