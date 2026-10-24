# PulseMap

An open-source, map-first community app for students and neighborhood residents in Istanbul to host and join nearby activities.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/pulsemap run dev` — run the web client through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `docs/1_PRD.md`, `docs/2_ARCHITECTURE.md`, `docs/3_DESIGN_SPEC.md` — documentation created before implementation
- `lib/db/src/schema/` — four domain tables
- `lib/api-spec/openapi.yaml` — API contract; run codegen after changes
- `artifacts/api-server/src/routes/` — accounts, events, messages
- `artifacts/pulsemap/` — React web app

## Architecture decisions

- Custom username/password authentication is explicitly requested: do not replace it with email, Clerk, or Replit SSO without asking.
- The MVP is for adults 18+ with self-reported ages, not verified identities.
- Hosts count toward event capacity. Their age must be within their event's range.
- Messaging OFF blocks all incoming member messages, including existing threads; history stays readable and the host may reply.
- Demo switching is intentionally available for judges; it grants access only to labeled demo identities. Disable before a non-demo rollout.

## Product

Map and activity discovery, shared instant search and filters, map-picked event creation, capacity and age-controlled attendance, illustrated avatars, event-linked private chat, live host privacy controls, demo identities, and responsive mobile/desktop preview.

## User preferences

- For people, not companies.
- Follow documentation-first AI-native SDLC: maintain PRD, architecture, design spec, README and MIT license.
- Use free CartoDB Voyager map tiles, DiceBear avatars, and activity emoji with a full emoji picker.
- No email address or phone number in account creation.

## Gotchas

- Run the managed artifact workflows, not a root dev command; they provide service ports and base paths.
- Database schema changes belong in development; production schema is applied by the Publish flow, never startup DDL.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
