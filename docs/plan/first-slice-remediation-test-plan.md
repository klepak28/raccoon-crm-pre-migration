# First Slice Remediation Test Plan

## Purpose
This test plan covers only the regression tests required for the MUST_FIX_NOW remediation pass.

## Scope
Included:
- customer partial update preservation
- scheduler day interpretation consistency

Excluded:
- broader hardening
- persistence coverage
- recurrence/invoice regression expansion
- UI fidelity improvements unrelated to the two MUST_FIX_NOW issues

---

## Test strategy
Add tests at the narrowest layers that catch the current bugs without broadening the slice:
- focused unit/service tests for customer PATCH merge behavior
- focused unit/helper tests for day-boundary logic
- focused integration tests proving HTTP/API behavior and scheduler consistency end to end

Do not add unrelated new coverage in this remediation pass.

---

## Remediation test group 1: Customer PATCH preservation

### Goal
Prove that partial customer updates do not erase omitted existing data.

### Unit/service tests to add first
- patching `displayName` only preserves existing addresses, phones, emails, tags, and notes
- patching `customerNotes` only preserves existing identity and contact/address subrecords
- patching tags only preserves existing addresses, phones, and emails
- patching one contact-related field changes only that field and leaves other collections intact
- effective post-merge customer identity remains valid after patch

### Integration tests to add
- create customer with address + phone + email + tags, patch one scalar field, fetch detail, verify omitted data remains
- create customer with notes and tags, patch only `sendNotifications` or `doNotService`, fetch detail, verify no unrelated data loss

### Failure tests to add
- patch that would produce invalid effective identity is rejected
- patching unknown customer id still returns not found

### Acceptance signal
These tests should fail against the current implementation and pass after the fix.

---

## Remediation test group 2: Scheduler day interpretation consistency

### Goal
Prove that schedule input, day filtering, and displayed schedule interpretation use one consistent V1 rule.

### Unit/helper tests to add first
- day-intersection helper includes a near-midnight job on the expected selected day according to the chosen V1 rule
- day-intersection helper excludes the same job from the non-intersecting selected day according to that same rule

### Integration tests to add
- create customer and job, schedule near midnight using the same payload shape the UI sends, fetch selected day schedule, verify expected inclusion
- fetch adjacent day schedule and verify expected exclusion or inclusion according to the clarified rule
- verify job detail schedule summary and selected day schedule agree on the same near-boundary example

### UI-adjacent verification to add if lightweight
- if a pure unit test is available for UI conversion helpers, verify schedule input conversion does not introduce a second conflicting day interpretation

### Acceptance signal
These tests should expose the current UTC/local mismatch before the fix and pass after alignment.

---

## Existing tests that must continue to pass
The remediation pass must not break these already-approved behaviors:
- unschedule clears schedule fields and preserves assignee
- new one-time job starts unscheduled and unassigned
- invalid assignee is rejected
- scheduled job appears in correct scheduler lane
- unsupported V1 future fields are explicitly rejected
- customer identity minimum remains `displayName` or `firstName`

---

## Regression risks to watch while testing

### Customer PATCH risks
- accidentally changing PATCH into full replacement again
- preserving omitted fields but losing explicit empty-value updates
- validating the patch fragment instead of the effective merged customer

### Scheduler day risks
- making backend filtering consistent but leaving UI display inconsistent
- changing display formatting without fixing filter semantics
- encoding an undocumented timezone rule that tests do not explain clearly

---

## Test execution order
1. add customer PATCH preservation tests
2. confirm they fail against current code
3. implement customer PATCH fix
4. rerun targeted customer tests
5. add scheduler day-consistency tests
6. confirm they fail against current code
7. implement scheduler day-consistency fix
8. rerun targeted scheduler tests
9. run full `npm test`

---

## Completion criteria
This remediation test plan is satisfied when:
- customer PATCH preservation regression tests pass
- scheduler day-consistency regression tests pass
- the pre-existing V1 regression suite still passes
- no new tests were added for out-of-scope SHOULD_FIX_SOON or CAN_DEFER items
