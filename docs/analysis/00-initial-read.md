# Initial read report: `docs/raw/full-spec.md`

## File existence
Confirmed: `/docs/raw/full-spec.md` exists.

## Estimated document size
- Approx. **67 KB** (`66,964` bytes)
- Approx. **2,038 lines**
- Scope feels like a **large handoff spec**, not a lightweight product brief

## Main modules found
1. **Global navigation context**
   - top-level app nav
   - global create flows

2. **Schedule module**
   - calendar shell and toolbar
   - day/week/work-week/month/dispatch/schedule/map views
   - left rail / filters
   - bulk actions
   - schedule modal
   - team assignment
   - recurring jobs and recurrence rules
   - events

3. **Customer module**
   - customers list and empty state
   - customer creation modal
   - customer profile tabs and sections
   - customer jobs table
   - auto-invoice settings

4. **Job detail / workflow layer**
   - job creation flow
   - workflow states
   - field tech status
   - activity feed
   - bridge behavior between customers, schedule, and invoices

5. **Invoice module**
   - global invoices list
   - customer invoice history
   - job-rooted invoice preview
   - send / print / PDF flows
   - invoice details, due terms, message, attachments, payment options
   - reminders, auto invoicing, batch invoicing, progress invoicing

6. **Data model implications**
   - customer
   - job / visit / dispatch
   - team / employee resource model
   - recurring series / generated occurrence model
   - schedule view state
   - invoice domain model

## Obvious ambiguities
- Exact semantics of some **unlabeled toolbar/icon controls** are intentionally left unresolved.
- The full live option list and ordering for some **recurrence controls** is not exhaustively proven from UI alone.
- The note **"Job inputs do not carry over on recurring jobs"** is not mapped field-by-field.
- The **`Find a time`** tab is acknowledged but not deeply documented.
- The global **`/app/invoices` list** structure is partly doc-confirmed rather than fully captured live.
- The relationship between **`Recurring Job New`** and the standard job -> recurrence path is strongly inferred, not exhaustively A/B verified.

## Consistency assessment
Overall, the file appears **largely consistent**.

Why:
- it uses confidence labels (`Observed`, `Doc-confirmed`, `Partially observed`, `Not directly confirmed`) instead of overstating certainty
- repeated themes align across sections, especially around schedule/job/invoice relationships
- the recurrence model is described in a forward-compatible, internally coherent way

Potential tension, but not a true contradiction:
- a few details come from mixed sources, where live UI capture was incomplete and docs filled the gaps
- some UI placement notes are explicitly marked as uncertain or corrected later

Bottom line: **I do not see major contradictions**, but I do see a handful of deliberate uncertainty zones that should stay unresolved until a parity pass or implementation decisions are made.

## Initial conclusion
This is a strong developer handoff spec with good coverage of:
- product structure
- operational workflows
- recurrence behavior
- invoice behavior
- domain modeling implications

It is detailed enough to guide implementation planning, but it should still be treated as a **research-backed spec with explicit open questions**, not a final source of truth for pixel-perfect parity.
