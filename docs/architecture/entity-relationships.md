# Entity Relationships

## Primary ownership graph
- **Customer** owns:
  - Address[]
  - CustomerPhone[]
  - CustomerEmail[]
  - customer-level notes/activity
  - AutoInvoiceRule
- **Team settings** own:
  - TeamMember[]
- **Job domain** owns:
  - Job
- **Recurring scheduler** owns:
  - RecurringSeries
  - OccurrenceException (PROPOSED_FIELD-backed concept)
- **Invoice domain** owns:
  - Invoice
  - InvoiceLineItemSnapshot[]
  - DeliveryEvent[]
  - InvoiceReminderRule

## Core relationships

### Customer -> Address
- One Customer to many Addresses.
- Address source of truth is Customer.
- Jobs and invoices reference or snapshot address data from Customer.

### Customer -> Job
- One Customer to many Jobs.
- Customer is the CRM root for job creation.
- Job detail is the operational root after creation.

### Customer -> Invoice
- One Customer to many Invoices.
- Customer invoice history is a ledger projection, not the invoice source of truth.

### Customer -> AutoInvoiceRule
- One Customer to zero or one active AutoInvoiceRule.
- Auto-invoicing is customer-level behavior.

### TeamMember -> Job
- Many TeamMembers can be assignable to many Jobs.
- Current spec only guarantees assignment selection and schedule placement, not broader staffing semantics.
- `OPEN_QUESTION`: whether assignment is truly many-to-many in persisted operational behavior or constrained in practice.

### Job -> RecurringSeries
- A non-recurring Job has no RecurringSeries.
- A recurring setup creates one RecurringSeries rooted in a Job.
- Current job may become occurrence 1 of that series.

### RecurringSeries -> Occurrence(Job)
- One RecurringSeries to many Occurrence Jobs.
- Each occurrence is a real Job record with:
  - its own job number
  - its own schedule
  - its own invoice
  - its own detail page

### Occurrence(Job) -> Invoice
- One occurrence Job to zero or many Invoices.
- Baseline flow implies one main invoice per job.
- Progress invoicing introduces multiple invoices per job as an optional/future-facing mode.

### Invoice -> InvoiceLineItemSnapshot
- One Invoice to many InvoiceLineItemSnapshot records.
- These are invoice-owned snapshots, not live pointers for rendering.

### Invoice -> DeliveryEvent
- One Invoice to many DeliveryEvents.
- Delivery history must preserve channel and recipient context.

---

## Relationship table

| From | Relation | To | Notes |
|---|---|---|---|
| Customer | 1:N | Address | Multiple addresses supported |
| Customer | 1:N | CustomerPhone | Multiple phone rows supported |
| Customer | 1:N | CustomerEmail | Multiple email rows supported |
| Customer | 1:N | Job | Customer is CRM root |
| Customer | 1:N | Invoice | Exposed in customer invoice history |
| Customer | 0:1 | AutoInvoiceRule | Customer-scoped automation |
| TeamMember | N:M | Job | Assignment semantics partially observed |
| Job | 0:1 | RecurringSeries | Only when recurrence enabled |
| RecurringSeries | 1:N | Occurrence(Job) | Generated concrete jobs |
| Occurrence(Job) | 0:N | Invoice | Baseline 0:1, progress invoicing may increase cardinality |
| Invoice | 1:N | InvoiceLineItemSnapshot | Financial snapshot lines |
| Invoice | 1:N | DeliveryEvent | Send history |

---

## Source-of-truth boundaries

### Customer domain is source of truth for
- customer identity
- customer contact methods
- customer addresses
- customer tags
- customer communication preferences
- customer-level auto-invoice rule

### Team settings are source of truth for
- assignable resources visible in schedule
- schedule column/resource roster

### Job domain is source of truth for
- current operational status
- current schedule state
- current assignees
- current arrival window
- current operational notes/tags

### Recurring scheduler is source of truth for
- recurrence rule
- series scope operations
- future occurrence generation
- exception-vs-series behavior

### Invoice domain is source of truth for
- invoice header values
- invoice totals
- invoice line snapshots
- send history
- payment-facing document state

---

## Recurring scheduler focus

### Recommended aggregate boundary
- **RecurringSeries** should be its own aggregate.
- **Occurrence** should be a concrete Job linked back to the series.
- Exception handling should be stored separately from the base rule or materialized into occurrence job overrides.

### Why
- The spec requires:
  - `Only this job` edits
  - `This job and all future jobs` edits
  - `This Occurrence` deletion
  - `This and Future Occurrences` deletion
  - forward-only changes without rewriting history

This is difficult to model safely if recurrence is only a boolean on Job.

---

## Invoice snapshot focus

### Boundary
Invoice must snapshot from mutable upstream records at issuance or invoice-generation time.

### Snapshot inputs
- customer-facing name
- service address
- business contact block
- line items
- totals
- due-term presentation
- service option / job input summaries shown under line items

### Why
- Job, Customer, and Address remain mutable.
- Invoice must support preview, send, print, and PDF consistently over time.

---

## Key invariants
- A recurring series must never be represented as one job with many dates.
- Every generated occurrence must be a concrete job.
- `Unassigned` must not be stored as a fake TeamMember row unless intentionally modeled as a pseudo-resource outside team settings.
- Invoice preview rendering must come from invoice-owned snapshot data, not live joins alone.
- Future recurrence edits must not rewrite historical occurrences.
- Monthly invalid-date recurrence must skip unsupported months rather than coercing dates.

## OPEN_QUESTION
- Exact ownership scope for invoice reminder rules is not explicit in the normalized spec.
- Exact relationship between job schedule state and a separate appointment record, if any, remains unclear from source.
