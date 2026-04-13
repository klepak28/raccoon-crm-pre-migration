# First Slice Remediation Plan

## Purpose
This plan converts the `MUST_FIX_NOW` findings from the first-slice audit into a tight, fix-only remediation plan.

## Scope
Included in this remediation pass:
1. customer partial update must not erase omitted fields
2. scheduler day behavior must use one explicit and consistent V1 day interpretation
3. missing tests for both issues

Explicitly excluded from this pass:
- persistence work
- recurrence
- invoicing
- broader UI redesign
- scheduler fidelity improvements beyond what is required to make day interpretation consistent
- any `SHOULD_FIX_SOON` or `CAN_DEFER` items unless required for correctness of the fixes above

---

## Recommended fix order
1. **Add failing tests first** for customer partial update preservation
2. **Fix customer PATCH semantics**
3. **Add failing tests first** for scheduler day interpretation consistency
4. **Fix scheduler/UI day interpretation to one explicit V1 rule**
5. **Update docs/API contract wording** only where needed to reflect the corrected behavior

Why this order:
- the customer PATCH bug is the sharpest live correctness issue
- it is isolated and should be fixed before touching time/day behavior
- locking tests first reduces risk of accidental behavior drift

---

## V1 day interpretation to adopt for remediation
### Chosen clarification
For this V1 implementation, the selected scheduler day must be interpreted using the **same local day basis as the browser UI inputs**.

Practical meaning for the current slice:
- `datetime-local` input from the UI
- day filter selected by the UI date picker
- schedule display formatting shown in the UI

must all agree on the same day interpretation for the running user session.

### Why this clarification is the narrowest safe fix
- it does not introduce timezones as a new product feature
- it does not redesign scheduling
- it directly removes the current mismatch between local UI input and UTC-only backend filtering

### Contract note
This is a V1 runtime-consistency clarification, not a new product capability.

---

## Remediation item 1: Customer partial update must not erase omitted fields

### 1. Problem summary
`PATCH /api/customers/:customerId` currently accepts partial input but can erase omitted fields and nested subrecords.

### 2. Root cause in the current implementation
- `validateCustomerInput(..., { partial: true })` returns a normalized object with empty/default values for omitted fields
- `customer.repository.update()` treats that normalized object like a full replacement payload
- arrays such as `addresses`, `phones`, and `emails` are rebuilt from the partial payload, so omitted collections become empty

### 3. Exact behavior that must change
- `PATCH /api/customers/:customerId` must behave as a real V1 partial update for supported customer fields
- omitted scalar fields must remain unchanged
- omitted collections (`addresses`, `phones`, `emails`, `tags`) must remain unchanged
- only fields explicitly present in the PATCH payload may be changed
- identity validation must still hold after applying the patch result

### 4. Files likely to change
- `src/api/routes.js`
- `src/validation/customers/customer-input.validator.js`
- `src/services/customers/services.js`
- `src/domain/customers/customer.repository.js`
- possibly a small helper under `src/lib/` if patch merging is extracted cleanly

### 5. Tests that must be added first or alongside the fix
#### Unit/service tests
- patching one scalar field preserves omitted phones/emails/addresses/tags
- patching tags preserves omitted addresses/phones/emails
- patching a customer without supplying identity fields does not erase existing display identity
- patch that would leave customer without valid identity is rejected only if the effective merged record would violate the rule

#### Integration tests
- create customer with address + phone + email, patch one field, fetch detail, verify omitted subrecords remain
- patch customer notes or tags only, verify all contact/address data remains intact

### 6. Regression risks
- accidentally converting PATCH into full replace again through normalization
- identity validation becoming too weak or too strict after merge
- replacing subrecords when only scalar fields were intended to change

### 7. Acceptance criteria
- customer PATCH preserves every omitted field and subrecord
- only explicitly provided fields mutate
- existing tests still pass
- new preservation tests pass
- customer identity invariants remain valid after patch application

---

## Remediation item 2: Scheduler day behavior must use one explicit and consistent day interpretation for V1

### 1. Problem summary
Scheduler day filtering currently uses UTC day boundaries in backend logic while UI scheduling input and display use local browser time behavior.

### 2. Root cause in the current implementation
- `src/lib/time.js` computes day intersection using `YYYY-MM-DDT00:00:00.000Z`
- UI schedule input uses `datetime-local`
- UI converts local input to ISO timestamps with `new Date(localDateTime).toISOString()`
- UI display uses local `toLocaleString()`

This creates mixed interpretation rules inside one slice.

### 3. Exact behavior that must change
- scheduler date filtering, UI schedule input conversion, and displayed schedule summaries must align to one explicit V1 interpretation
- the same job must appear on the day the user would reasonably expect based on the date they selected in the current UI
- near-midnight jobs must not shift to a different selected day solely because backend filtering uses UTC boundaries while UI uses local interpretation

### 4. Files likely to change
- `src/lib/time.js`
- `src/services/scheduler/services.js`
- `src/ui/static/app.js`
- possibly schedule-related tests only, if helper extraction is needed

### 5. Tests that must be added first or alongside the fix
#### Unit tests
- day-intersection helper uses the chosen V1 interpretation consistently
- near-midnight intervals are included/excluded according to the clarified rule

#### Integration tests
- schedule a job near local midnight through the same input path shape the UI uses, fetch selected day schedule, verify expected inclusion
- verify job detail schedule summary and day schedule selection agree for a near-boundary case

### 6. Regression risks
- fixing backend filtering without matching UI conversion/display
- fixing UI display only while leaving backend filter unchanged
- introducing a new hidden timezone rule not documented anywhere

### 7. Acceptance criteria
- one documented V1 day interpretation is used consistently across input, filtering, and display
- near-boundary schedule tests pass
- existing schedule tests still pass
- no recurrence or broader timezone feature work is introduced

---

## Remediation item 3: Missing test coverage for both MUST_FIX_NOW issues

### 1. Problem summary
The current suite did not catch the customer PATCH data-loss bug or the day-interpretation mismatch.

### 2. Root cause in the current implementation
- no regression tests existed for customer PATCH preservation semantics
- no regression tests existed for near-boundary day filtering using the actual UI input path assumptions

### 3. Exact behavior that must change
- the test suite must fail before the fix and pass after it for both MUST_FIX_NOW issues
- tests must live at the same layers where the bugs manifested: service/repository and HTTP/integration, with minimal helper coverage as needed

### 4. Files likely to change
- `tests/unit/customers/*.test.js`
- `tests/unit/scheduler/*.test.js`
- `tests/integration/customers-jobs-scheduler/*.test.js`
- possibly shared test helpers if needed

### 5. Tests that must be added first or alongside the fix
#### Customer PATCH regression tests
- preserve omitted collections on partial patch
- preserve omitted scalar fields on partial patch

#### Scheduler day regression tests
- near-midnight inclusion test
- job detail/day schedule agreement for chosen selected day

### 6. Regression risks
- writing tests against current buggy behavior by mistake
- testing only helper functions and missing the end-to-end contract path

### 7. Acceptance criteria
- both bug classes are covered by automated regression tests
- tests clearly encode the corrected contract behavior
- tests remain limited to the approved slice

---

## API behavior contracts that must be clarified

### Customer PATCH
Clarify that `PATCH /api/customers/:customerId` is a **partial update** route, not replacement:
- omitted fields are preserved
- omitted collections are preserved
- only provided fields change

### Scheduler day filtering
Clarify the V1 rule that the selected scheduler date uses one consistent runtime day interpretation across:
- schedule input
- scheduler filtering
- displayed summaries

No broader timezone product behavior needs to be added, but the current mixed interpretation must be removed.

---

## Doc updates needed
These updates are small clarifications only, after the fixes are made:
- `/docs/plan/first-slice-test-plan.md`
  - add explicit regression bullets for customer PATCH preservation and near-midnight day behavior
- `/docs/plan/first-slice-execution-plan.md`
  - clarify customer PATCH semantics and chosen V1 day interpretation if the implementation contract changes visibly
- optionally `/docs/analysis/first-slice-audit.md`
  - note the MUST_FIX_NOW items as resolved once fixed

No spec expansion is needed.

---

## Completion condition for this remediation pass
This pass is complete when:
- customer partial PATCH no longer erases omitted fields
- scheduler day behavior has one explicit and consistent V1 interpretation
- both fixes are protected by automated regression tests
- no persistence, recurrence, invoice, or broader redesign work is introduced
