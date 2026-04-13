# Edge Cases

## Schedule UI edge cases
### Hard requirements
- Empty schedule dates still show the full calendar shell.
- Month view supports bulk selection, but `View by employee` is not exposed there the same way as in day/week/work-week.
- Schedule menu / rail placement had conflicting visual cues in observation, so behavior matters more than icon placement.

## Assignment edge cases
### Hard requirements
- Jobs may exist in a scheduled but unassigned state.
- Reassigning a job moves its card between schedule columns.

## Event entry edge cases
### Hard requirements
- Typing a time string alone may not satisfy validation until a normalized dropdown option is selected.

## Recurrence edge cases
### Hard requirements
- Recurrence is blocked for:
  - segments
  - estimates
  - jobs with multiple appointments
- Recurring jobs are separate jobs, not multiple dates under one record.
- Changing occurrence count on a later occurrence updates future generation from that point, not from series start.
- Moving recurrence end date backward deletes future occurrences after that date.
- Monthly `31st` pattern skips months without a 31st.
- Monthly `5th weekday` pattern skips months without that weekday position.
- Source recommends `last weekday` patterns when monthly continuity is expected.
- Never-ending recurrence must not generate infinite records upfront.

## Invoice edge cases
### Hard requirements
- `Pending` payment/invoice behavior must remain distinct from `Paid`.
- `Canceled` and `Voided` are different invoice states.
- Attachments on invoices must come from existing job files.
- Text sending is limited to one number at a time.
- Progress invoices are excluded from auto invoicing.

## Customer edge cases
### Hard requirements
- Business customer type reveals extra subcontractor-related option that does not appear for homeowner.
- Invalid phone values can warn without necessarily blocking completion once required fields are satisfied.

## OPEN_QUESTION
- Source does not define edge-case handling for daylight saving transitions, timezone edits, or overlapping appointments.
- Source does not define how conflicting assignee availability should be treated.
