# Domain Model

## Scope
This model is derived from `/docs/spec` only.

## Modeling principles
- Scheduling is **job-centric**.
- Invoicing is **job-rooted**.
- Recurrence is a **series rule plus generated concrete jobs**, not one job with many dates.
- Invoice data must remain a **snapshot**, even when upstream job/customer data later changes.
- Any field below marked `PROPOSED_FIELD` is implied by the spec but not explicitly guaranteed.

---

## 1. Customer
### Purpose
System of record for CRM identity, communication preferences, customer-scoped notes, and customer-level billing context.

### Source of truth / ownership
- Owned by the **Customers** domain.
- Referenced by Jobs, Invoices, and customer-level automations.

### Main fields
- customerId
- firstName
- lastName
- displayName
- companyName
- role
- customerType (`homeowner|business`)
- subcontractorFlag
- doNotService
- sendNotifications
- communicationPreferences
- marketingConsent
- leadSource
- referredBy
- billsToCustomerId
- customerNotes
- tags[]
- portalInviteState
- createdAt
- lifetimeValue
- outstandingBalance

### Child records
- phones[]
- emails[]
- addresses[]
- customer activity / notes

---

## 2. Address
### Purpose
Reusable customer address record used for profile display and job/invoice addressing.

### Source of truth / ownership
- Owned by **Customer**.
- Referenced by Job and invoice snapshot data.

### Main fields
- addressId
- customerId
- street
- unit
- city
- state
- zip
- notes
- PROPOSED_FIELD: displayLabel
- PROPOSED_FIELD: addressType

### Notes
- The spec confirms multiple addresses are possible.
- `OPEN_QUESTION`: priority/default-address behavior is not defined.

---

## 3. CustomerPhone
### Source of truth / ownership
- Owned by **Customer**.

### Main fields
- phoneId
- customerId
- value
- PROPOSED_FIELD: phoneType (`mobile|home|work|additional`)
- note
- PROPOSED_FIELD: isPrimary

---

## 4. CustomerEmail
### Source of truth / ownership
- Owned by **Customer**.

### Main fields
- emailId
- customerId
- value
- PROPOSED_FIELD: isPrimary

---

## 5. TeamMember
### Purpose
Assignable resource for scheduling and dispatch.

### Source of truth / ownership
- Source of truth is **Team & Permissions settings**.
- Consumed by Scheduler and Job assignment flows.

### Main fields
- teamMemberId
- displayName
- initials
- PROPOSED_FIELD: role
- PROPOSED_FIELD: color
- PROPOSED_FIELD: activeOnSchedule
- PROPOSED_FIELD: tags[]

### Notes
- `Unassigned` is not a TeamMember record. It is a pseudo-resource bucket.

---

## 6. Job
### Purpose
Primary operational record connecting customer, scheduling, assignment, recurrence, activity, and invoicing.

### Source of truth / ownership
- Owned by the **Jobs / operational workflow** domain.
- Scheduler mutates scheduling fields.
- Invoice reads from Job but must snapshot invoice-facing data.

### Main fields
- jobId
- jobNumber
- customerId
- PROPOSED_FIELD: addressId
- status (`Unscheduled`, `Scheduled`, plus workflow states implied by OMW/Start/Finish)
- scheduledStart
- scheduledEnd
- anytime
- arrivalWindow
- assigneeIds[]
- serviceSummary
- subtotal
- privateNotes
- jobTags[]
- leadSource
- createdAt
- PROPOSED_FIELD: completedAt

### Notes
- The source spec consistently treats the scheduled visit as job-rooted.
- `OPEN_QUESTION`: whether schedule data should remain embedded in Job or split into a separate Appointment aggregate is not explicitly specified. Based on the spec, Job remains the safer primary aggregate.

---

## 7. RecurringSeries
### Purpose
Defines the rule that generates recurring job occurrences.

### Source of truth / ownership
- Owned by the **Scheduler / recurring jobs** domain.
- Drives generation of future occurrence Jobs.

### Main fields
- recurringSeriesId
- sourceJobId
- recurrenceEnabled
- recurrenceFrequency (`daily|weekly|monthly|yearly`)
- recurrenceInterval
- PROPOSED_FIELD: repeatEveryWeekday
- recurrenceEndMode (`never|after_n_occurrences|on_date`)
- PROPOSED_FIELD: recurrenceOccurrenceCount
- recurrenceEndDate
- PROPOSED_FIELD: recurrenceDayOfWeek[]
- PROPOSED_FIELD: recurrenceDayOfMonth
- PROPOSED_FIELD: recurrenceOrdinal
- PROPOSED_FIELD: recurrenceMonthOfYear
- PROPOSED_FIELD: recurrenceRuleVersion
- PROPOSED_FIELD: materializationHorizonUntil
- PROPOSED_FIELD: lastExtendedAt

### Notes
- These fields are justified by the scheduler and business-rules specs, especially interval rules, monthly/yearly variants, and forward materialization.
- The exact field names are proposed, not canonical.

---

## 8. Occurrence
### Purpose
Concrete generated occurrence within a recurring series.

### Source of truth / ownership
- Owned by **RecurringSeries**, but materialized as a real operational record.
- Implemented most naturally as a Job with recurrence linkage.

### Main fields
- occurrenceJobId
- recurringSeriesId
- occurrenceIndex
- PROPOSED_FIELD: generatedFromRuleVersion
- PROPOSED_FIELD: isExceptionInstance
- PROPOSED_FIELD: deletedFromSeriesAt
- PROPOSED_FIELD: truncatedBySeriesChange

### Notes
- Each occurrence must have its own job page, schedule, invoice, and job number.
- The spec supports treating occurrence identity as a concrete job, not just a virtual event.

---

## 9. OccurrenceException
### Purpose
Captures one-off deviation from series behavior when editing only the current occurrence.

### Source of truth / ownership
- Owned by the recurring scheduling domain.

### Main fields
- PROPOSED_FIELD: occurrenceExceptionId
- occurrenceJobId
- recurringSeriesId
- PROPOSED_FIELD: overriddenScheduleFields
- PROPOSED_FIELD: overriddenAssigneeFields
- PROPOSED_FIELD: reason

### Notes
- Exception handling is required by the documented `Only this job` edit scope.
- Exact persistence shape is not specified, so this is modeled as an explicit proposed concept.

---

## 10. Invoice
### Purpose
Customer-facing financial document rooted in a job, with independent lifecycle and payment state.

### Source of truth / ownership
- Owned by the **Invoices** domain.
- Created from job/customer/business data, but becomes its own record.

### Main fields
- invoiceId
- invoiceNumber
- jobId
- customerId
- billingType
- invoiceDate
- dueType
- dueDate
- status (`Open|Paid|Pending|Canceled|Voided`)
- paymentStatus
- dateSent
- datePaid
- subtotal
- taxTotal
- discountTotal
- grandTotal
- amountPaid
- amountDue
- messageToCustomer
- attachmentRefs[]
- checklistRefs[]
- deliveryHistory[]

### Snapshot fields
- PROPOSED_FIELD: snapshotCustomerName
- PROPOSED_FIELD: snapshotServiceAddress
- PROPOSED_FIELD: snapshotBusinessName
- PROPOSED_FIELD: snapshotBusinessPhone
- PROPOSED_FIELD: snapshotBusinessEmail
- PROPOSED_FIELD: snapshotPaymentTermsLabel

### Notes
- Snapshot fields are justified because invoice preview is customer-facing and printable, and must not drift when mutable source records change.

---

## 11. InvoiceLineItemSnapshot
### Purpose
Immutable billing line captured on the invoice at invoice-generation time.

### Source of truth / ownership
- Owned by **Invoice**.
- Derived from job services/materials at snapshot time.

### Main fields
- invoiceLineItemId
- invoiceId
- sourceType
- PROPOSED_FIELD: sourceRefId
- displayName
- description
- qty
- unitPrice
- amount
- optionSummaryText

---

## 12. DeliveryEvent
### Purpose
Tracks invoice send attempts and channel history.

### Source of truth / ownership
- Owned by **Invoice**.

### Main fields
- deliveryEventId
- invoiceId
- channel (`email|sms`)
- recipients[]
- subject
- message
- sentAt
- PROPOSED_FIELD: deliveryStatus

---

## 13. AutoInvoiceRule
### Purpose
Customer-level automation for sending invoices for newly finished unpaid jobs.

### Source of truth / ownership
- Owned at **Customer scope**.

### Main fields
- autoInvoiceRuleId
- customerId
- enabledFrequency (`never|daily|weekly|monthly|yearly`)
- repeatEvery
- PROPOSED_FIELD: repeatOn

---

## 14. InvoiceReminderRule
### Purpose
Automation for following up on already-sent overdue invoices.

### Source of truth / ownership
- Owned by the **Invoices** domain, likely company/account scoped, but exact scope is unclear.

### Main fields
- PROPOSED_FIELD: invoiceReminderRuleId
- remindersEnabled
- reminderCadenceDays
- maxReminderCount
- PROPOSED_FIELD: excludedCustomerNames[]
- PROPOSED_FIELD: excludedCustomerTags[]

### Notes
- `OPEN_QUESTION`: the exact ownership scope of reminder rules is not fully defined by the spec set.

---

## Mutable vs immutable boundaries
### Mutable operational data
- Customer contact data
- Customer addresses
- Job schedule
- Job assignees
- Job arrival window
- Recurring series rule

### Immutable or snapshot-oriented financial data
- Invoice header snapshot
- Invoice line item snapshots
- Sent delivery history
- Printed/PDF invoice representation

### Invariant
- Once an invoice exists, later edits to Job or Customer must not silently rewrite the already-issued invoice snapshot.
