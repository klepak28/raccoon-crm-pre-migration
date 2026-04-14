# Customers

## Purpose
Customer records store contact, address, operational, and billing context, and act as a hub for jobs, invoices, estimates, notes, and attachments.

## Routes and surfaces
### Hard requirements
- Customer list route: `/app/customers/list`
- Customer detail includes tabs:
  - Profile
  - Leads
  - Estimates
  - Jobs
  - Invoices
  - Attachments
  - Notes

## Customers list
### Hard requirements
- Empty state includes:
  - heading `Manage your customers`
  - action `Add customer`
  - action `Import customers`

## Create customer
### Hard requirements
- Customer creation opens in an `Add new customer` modal.
- Contact fields include:
  - First name
  - Last name
  - Mobile phone
  - Company
  - Display name
  - Home phone
  - Role
  - Email
  - Work phone
- Customer type options:
  - Homeowner
  - Business
- When `Business` is selected, show:
  - `We subcontract for this general contractor`
- Additional contact controls:
  - `Add additional email`
  - `Add additional phone number`
- Additional rows support:
  - extra email
  - extra phone
  - phone note
  - row deletion
- Status flag:
  - `Mark as Do not service`
- `Do not service` helper meaning:
  - notifications will be turned off
  - jobs and estimates cannot be scheduled
- Address fields include:
  - Street
  - Unit
  - City
  - State
  - Zip
  - Address Notes
- Address UI includes:
  - embedded map preview
  - `Add Address`
- Notes and metadata fields include:
  - Customer notes
  - `This customer bills to`
  - Customer tags
  - Lead source
  - `Referred by`
  - `Send notifications`
- Footer actions:
  - `Cancel`
  - `create customer`

## Screenshot addendum, 2026-04-14
### Observed coverage note
- The screenshot set currently in `docs/pictures` does **not** include a direct customer-list, customer-detail, or add-customer screen.
- Customer-related evidence from the screenshot set is limited to customer selection and note scoping inside job creation / scheduling flows.

### Hard requirements
- New job creation includes a customer search field with placeholder text truncated as:
  - `Name, email, phone, or addre...`
- New job creation exposes an inline customer creation entry point:
  - `+ New customer`
- Job private notes UI visibly separates note scope with a segmented toggle:
  - `This job`
  - `Customer`

### Implementation notes
- Customer lookup inside job creation should be treated as a broad search surface, not a narrow id-only selector.
- The observed lookup affordance suggests search by at least:
  - name
  - email
  - phone
  - address
- The `+ New customer` affordance should remain available from job creation so dispatch/sales workflows do not require leaving the job flow.

## OPEN_QUESTION
- No direct screenshot evidence currently confirms the exact customer list layout, detail layout, or add-customer modal composition for the source UI set in `docs/pictures`.
- The exact behavior of `+ New customer` from the job flow is not visible, it may open a modal, drawer, or dedicated create screen.
- The exact persistence semantics of the `This job` vs `Customer` private-note toggle are not visible from the screenshot alone.

## Validation and behavior
### Hard requirements
- Tags are entered via text and converted into chips.
- Invalid phone input can show a warning.
- State dropdown includes US state abbreviations.

## Customer detail, Profile tab
### Hard requirements
- Profile includes sections:
  - Summary
  - Contact info
  - Payment method
  - Communication preferences
  - Customer tags
  - Attachments
  - Lead source
  - Auto invoice
  - Tasks
- Summary displays:
  - Created date
  - Lifetime value
  - Outstanding balance
- Contact info displays:
  - contact person and role
  - company
  - primary phone numbers
  - additional phone section with note
  - emails
  - customer portal area with `SEND INVITE`
- Payment method section can be empty/incomplete and may show a bank connection CTA.
- Communication preferences includes:
  - notifications enabled status
  - email marketing consent
  - `Opt-out` action
- Address area includes:
  - embedded map
  - address count
  - address search
  - address row with full address and note
- Private notes area includes:
  - `Add customer note`
  - filters `All`, `Customer`, `Estimates`, `Jobs`
  - `View all`
- Separate activity feed exists below notes.

## Customer actions
### Hard requirements
- Top action buttons on customer detail include:
  - Job
  - Estimate
  - Lead
  - Service Plan
  - Ask AI
  - overflow actions

## Customer Jobs tab
### Hard requirements
- Jobs tab includes:
  - job count
  - `View advanced sorting and filtering`
  - selection checkbox column
  - filter/sort/display controls
- Visible jobs table columns:
  - #
  - Job created date
  - Job scheduled for
  - Job completed date
  - Customer
  - Address
  - Description
  - Lead source
  - Amount

## Customer Invoices tab
### Hard requirements
- Invoices tab exists on customer detail.
- Columns captured from source:
  - Billing type
  - Invoice #
  - Job #
  - Date sent
  - Date paid
  - Amount
  - Status
- Pagination footer supports previous/next.

## Auto invoice
### Hard requirements
- Customer profile includes `Auto Invoice` configuration.
- Auto invoice dialog supports recurrence options:
  - Never
  - Daily
  - Weekly
  - Monthly
  - Yearly
- Recurrence editor includes at least:
  - `Repeat every` numeric input
  - unit display
  - `Repeat on` choices
  - month/day or ordinal-style controls depending on mode
- Dialog actions:
  - `cancel`
  - `save`

## Domain requirements
### Hard requirements
Customer should support at least:
- names and display name
- company and role
- customer type
- subcontractor flag
- do-not-service flag
- notifications preference
- phones with optional note
- emails
- addresses with notes
- customer notes
- tags
- lead source
- referred by
- bills-to relationship
- communication preferences
- marketing consent
- portal invite state
- created date
- lifetime value
- outstanding balance

## OPEN_QUESTION
- Exact permissions and downstream restrictions triggered by `Do not service` beyond the scheduling statement are not specified.
- Exact multi-address behavior beyond the observed single-address example is not described.
- Service Plan behavior is not specified.
