# Normalization Summary

## What was extracted
The source handoff spec was normalized into a smaller structured spec set covering:
- product overview and shared model assumptions
- customer creation, profile, jobs, invoices, and auto-invoice behavior
- scheduler shell, views, resource model, assignment, scheduling flow, events, and recurrence
- invoice list, customer invoice history, invoice preview, edit flows, send flows, reminders, and auto invoicing
- cross-cutting business rules
- source-backed edge cases
- explicit open questions
- acceptance criteria for the normalized spec set itself

The normalization removed repeated explanatory prose and converted narrative sections into:
- hard requirements
- optional / future-facing items
- `OPEN_QUESTION` markers

## Conflicts found
No major product-logic contradictions were found in the source.

A few soft conflicts / uncertainty zones remain:
- schedule rail trigger placement was observed with some UI-placement ambiguity, but panel contents and behavior were consistent
- some recurrence details were stronger in documentation than in direct UI capture
- the global invoice list was less fully observed live than the job-rooted invoice preview

These were treated as uncertainty, not contradictions.

## What is still unclear
The main unresolved areas are:
- exact meaning of some unlabeled scheduler controls
- full `Find a time` behavior
- full field-level meaning of `Job inputs do not carry over on recurring jobs`
- whether `Undo Schedule` also clears assignment
- exact live field structures for some invoice modals and payment flows
- exact parity between `Recurring Job New` and the normal job -> recurrence path
- exact role/permission effects on the observed workflows

## Result
The normalized spec set is cleaner and easier to implement from, but it should still be treated as a source-faithful requirements pass, not a final parity-certified product spec.
