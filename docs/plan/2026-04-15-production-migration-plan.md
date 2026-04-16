# 2026-04-15 Production Migration Plan

## Goal
Move the CRM from the current prototype stack to a production-ready architecture without losing the validated business logic for:
- Customers
- One-time Jobs
- Scheduler (day/week/month)
- Recurring Jobs

## Current State
### Frontend
- Vanilla JS
- Static HTML shell
- CSS in a single app stylesheet

### Backend
- Node.js
- Custom lightweight HTTP routing
- In-process services/repositories

### Data
- In-memory store only
- No persistent database
- No migrations
- No auth/audit/background job infrastructure

## Recommended Production Stack
### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend
- Fastify + TypeScript
- Prisma ORM

### Data / Infra
- PostgreSQL
- Redis
- BullMQ
- S3-compatible object storage
- Sentry
- PostHog

## Migration Strategy
Use the current repo as a **reference implementation**, not as the final production runtime.

### Rule
- Freeze prototype behavior as the source of truth for current business logic.
- Build the production stack beside it.
- Port modules in controlled slices.
- Write new modules only in the production stack once the foundation is ready.

## What To Preserve
- Existing V1 domain behavior
- Recurrence semantics already implemented and tested
- Scheduler interaction rules
- Current API/use-case expectations as migration reference
- Docs/specs/screenshots/acceptance criteria
- Existing regression tests as behavior references

## What Must Be Rebuilt
- Persistence layer
- API layer
- UI architecture
- Auth / permissions
- Background processing
- Observability
- Deployment model

## Target Data Model Baseline
### Core tables
- organizations
- users
- team_members
- customers
- customer_addresses
- customer_phones
- customer_emails
- jobs
- recurring_series
- invoices (later)
- audit_log

### Supporting tables later
- attachments
- reminders
- notifications
- webhooks
- imports
- exports

## Phased Plan

### Phase 0. Freeze the prototype
**Goal:** preserve current validated logic before migration work starts.

Deliverables:
- Push current prototype repo to GitHub
- Keep docs/specs/screenshots in repo
- Tag a "prototype reference" milestone/commit
- Exclude unfinished local WIP from the reference push

### Phase 1. Production foundation
**Goal:** create the new scalable base.

Deliverables:
- Next.js frontend app
- Fastify backend service
- PostgreSQL connection
- Prisma schema + first migrations
- Redis + BullMQ setup
- Auth skeleton
- Environment config
- Error handling/logging baseline

### Phase 2. Customers module migration
**Goal:** first persistent module.

Deliverables:
- Customer schema in Postgres
- Customer CRUD APIs
- Customer list/detail UI
- Address/phone/email persistence
- Import prototype behavior into tests

### Phase 3. Jobs module migration
**Goal:** persistent operational jobs.

Deliverables:
- One-time jobs schema
- Schedule/unschedule/assign APIs
- Team ordering and assignment rules
- Customer-to-job flows

### Phase 4. Scheduler migration
**Goal:** move calendar behavior onto the new stack.

Deliverables:
- Day/week/month APIs backed by Postgres
- New React scheduler UI
- Drag/drop on day view
- Overlap layout
- Team ordering and filtering

### Phase 5. Recurring jobs migration
**Goal:** preserve validated recurrence logic.

Deliverables:
- recurring_series persistence
- occurrence materialization strategy
- scope-aware edits (`this`, `this_and_future`)
- delete semantics
- recurrence rule validation
- background jobs for horizon extension/maintenance

### Phase 6. New modules only on production stack
**Goal:** stop investing in the prototype runtime.

Modules to add only here:
- Invoices
- Payments/integrations
- Notifications
- Reporting
- Permissions

## Proposed Build Order
1. Repo + docs freeze
2. Production foundation
3. Customers
4. Jobs
5. Teams/settings baseline
6. Scheduler
7. Recurring jobs
8. New modules only after that

## Testing Strategy
### Keep from prototype
- Business behavior reference tests
- Recurrence edge-case tests
- Scheduler ordering/date boundary tests

### Add in production stack
- DB integration tests
- API contract tests
- UI component tests
- end-to-end scheduler flows

## Key Risks
- Recurring logic drift during rewrite
- Scheduler UI parity taking longer than CRUD modules
- Hidden assumptions from in-memory behavior
- Timezone/date behavior changing when persisted in DB

## Guardrails
- Do not invent new business rules during migration
- Port module-by-module
- Keep screenshot-driven UX validation
- Preserve documented recurrence behavior exactly
- Compare production behavior against current prototype continuously

## Immediate Next Actions
1. Push the current cleaned prototype reference repo to GitHub
2. Create the new production app scaffold in a separate folder/repo area
3. Define Prisma schema for customers, team members, jobs, recurring_series
4. Port Customers first
5. Stop adding new business modules to the prototype runtime

## Open Questions
- Single repo or monorepo for frontend/backend?
- Multi-tenant now or later?
- Auth provider choice: Clerk vs Auth.js vs custom?
- Keep materialized recurring occurrences model exactly, or evolve later after parity?
- Do we want FullCalendar as a base, or a custom scheduler surface from day one?
