# Scheduler Polish Pass Acceptance Criteria

## Purpose
Define when the scheduler feels materially more polished and usable within the existing V1 scope.

## Scope
Only:
- one-time jobs
- existing day / week / month views
- existing scheduler-to-job/customer integration
- existing assign / reassign / unassign / unschedule / reschedule flows

## Acceptance criteria

### 1. Interaction quality
- scheduler actions are easier to discover from cards and day/day-range views
- moving from scheduler to job detail and back preserves context clearly enough to feel intentional
- success and error feedback from scheduler actions is more visible and coherent
- drill-in from month/week into day or job detail feels natural

### 2. Visual clarity
- selected date/date-range context is more obvious
- unassigned work is visually distinct and easy to understand
- empty states feel like product states, not placeholders
- job cards have clearer hierarchy and labels

### 3. Week and month usefulness
- week view is easier to scan across days
- month view is easier to read when days are dense
- dense days summarize overflow in a useful way
- users can quickly drill into a specific day when needed

### 4. Card quality
- cards show status, time, customer, and service information more clearly
- primary click targets are obvious
- quick actions are present but do not overwhelm the card

### 5. Scope safety
- no recurrence, invoicing, billing, persistence, or bulk actions are added
- no fake future controls appear
- backend/domain scope remains unchanged or only minimally touched for UX clarity
