# Invoices

## Purpose
Invoices are first-class records, but the detailed invoice experience is strongly job-rooted.

## Routes and entry points
### Hard requirements
- Global invoice list route: `/app/invoices`
- Job-rooted invoice route: `/app/jobs/<job_id>/invoice`
- Customer invoice history exists on the customer `Invoices` tab

## Invoice list
### Hard requirements
- Invoice list is a first-class module.
- Source docs confirm invoice statuses:
  - Open
  - Paid
  - Pending
  - Canceled
  - Voided
- Source docs confirm quick filters:
  - All
  - Unsent
  - Due
  - Past Due
- Source docs confirm list capabilities:
  - quick filters
  - advanced filters
  - edit columns
  - row-level actions
  - apply payment from list
  - bulk selection / bulk send

## Customer invoice history
### Hard requirements
- Customer-level invoice history includes columns:
  - Billing type
  - Invoice #
  - Job #
  - Date sent
  - Date paid
  - Amount
  - Status
- Customer profile uses this as a customer-scoped ledger view.

## Invoice preview
### Hard requirements
- Job invoice preview includes top actions:
  - `Print`
  - `Download PDF`
  - `Send`
- Preview body includes:
  - business name
  - customer name
  - service address
  - business phone
  - business email
  - invoice number
  - service date
  - payment terms
  - amount due
  - contact/address block for business
  - line-item table
  - totals block
  - terms and conditions link
- Line-item table columns:
  - Services
  - qty
  - unit price
  - amount
- Totals block includes:
  - Subtotal
  - Job Total
  - Amount Due
- Service option / job input answers can render under service lines as descriptive detail.

## Invoice detail side panel
### Hard requirements
- Invoice preview page includes editable side sections:
  - Details
  - Amount due
  - Attachments
  - Invoice message
  - Payment options
  - Job and invoice
  - Business and customer
  - Services
  - Materials
- Payment options may show setup constraints and bank connection CTA when online payments are unavailable.

## Edit details
### Hard requirements
- `Edit details` modal includes:
  - `Invoice #`
  - `Invoice date`
  - payment terms selector
  - amount due display
  - `Cancel`
  - `Save`
- Due-term modes captured from source:
  - Upon receipt
  - Net X days
  - On a specific date
- Due terms are structured invoice metadata, not freeform text.

## Other invoice editing flows
### Hard requirements
- Dedicated editing flows exist for:
  - `Invoice due`
  - `Invoice message`
  - `Attach files`
- `Attach files` includes tabs:
  - Attachments
  - Checklists
- Attachment behavior from source:
  - files must already exist on the job before being attached to invoice
  - attached files are visible to the customer when sent
  - files are not embedded into the PDF by default

## Send invoice
### Hard requirements
- Invoice can be sent from invoice preview.
- Send flow supports:
  - email or text delivery
  - editing subject or message
  - multiple email recipients
  - payment option review
  - attachment review
- Single send action is either:
  - email
  - text
- Text is limited to one number at a time.

## Print and PDF
### Hard requirements
- Invoice preview rendering must support:
  - on-screen preview
  - print output
  - downloadable PDF

## Payment model
### Hard requirements
- Payment can be applied from list view and invoice preview.
- `Pending` must exist as distinct from `Paid`.
- Invoice should track both document and payment state.

## Invoice reminders
### Hard requirements
- Invoice reminders are separate from initial invoice sending.
- Reminder automation can be configured.
- Reminder cadence can be configured.
- Reminder count can be capped.
- Exclusions can exist by customer name or customer tag.
- Reminder prerequisites:
  - job is finished
  - invoice has due date
  - balance is greater than zero
  - invoice has already been sent
  - invoice is overdue and unpaid

## Auto invoicing
### Hard requirements
- Auto invoicing is separate from invoice reminders.
- Auto invoicing sends invoices for newly finished unpaid jobs on a configured cadence.
- Auto invoicing can be configured from customer profile or job details.
- Auto invoicing applies at the customer level.
- Auto invoicing recurrence options include:
  - Never
  - Daily
  - Weekly
  - Monthly
  - Yearly
- Auto invoicing is not supported for progress invoices.

## Batch invoicing
### Hard requirements
- Multiple invoices can be selected and bulk-sent from the invoice list.
- Customer profile also supports multi-invoice actions for the same customer.
- Source docs mention batch payment collection as a customer-profile action.

## Progress invoicing
### Optional / future-facing requirements
- Progress invoicing can allow multiple staged invoices for one job.
- Progress invoices may use percentage-based or fixed-amount billing slices.
- Each progress invoice may have its own due terms and payment options.
- Progress invoices can be edited partially after creation.
- Progress invoices can be voided.
- When enabled, job page includes an invoice summary table and actions like:
  - `+ Invoice`
  - edit invoice details
  - apply payment
  - resend/send
  - view
  - print
  - export PDF
  - void

## Domain requirements
### Hard requirements
Invoice should support at least:
- invoice number
- job reference
- customer reference
- billing type
- invoice date
- due type / due terms
- due date
- status
- payment status
- date sent
- date paid
- subtotal
- tax
- discount
- grand total
- amount paid
- amount due
- message to customer
- delivery history
- attachment references
- checklist references

## OPEN_QUESTION
- Exact field structure of the `Invoice message` modal is not fully captured.
- Exact live filter and column editor UI of `/app/invoices` was not fully enumerated in-browser.
- Full apply-payment interaction details were not captured live.
