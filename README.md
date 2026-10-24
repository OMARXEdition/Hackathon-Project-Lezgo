# Lezgo

Open-source, map-first hyper-local activities for people, not companies.

## Documentation-first development
The product brief, architecture, and design specification were created before implementation:
- [Product requirements](docs/1_PRD.md)
- [Architecture](docs/2_ARCHITECTURE.md)
- [Design specification](docs/3_DESIGN_SPEC.md)

## Development
Use Node.js 24 and pnpm. Run `pnpm install`, configure `DATABASE_URL` and `SESSION_SECRET` through environment secrets, then start the API and Lezgo managed workflows. The API uses `/api`; the frontend uses its configured artifact base path. The existing `@workspace/pulsemap` package/directory name remains stable for deployment compatibility.

`pnpm --filter @workspace/api-spec run codegen` regenerates API bindings.
`pnpm run typecheck` checks the workspace.

The database is seeded idempotently with five clearly labeled demo accounts and six Istanbul activities. Use the in-app demo switcher to explore different ages and roles. Demo switching intentionally grants access to demo identities and should be disabled for a non-demo production rollout.

## Event access and communication
- Public events use white map pins; private events use glowing purple pins. Only a top-right `$` badge indicates a paid event.
- Free public events allow immediate joining. Private or paid events require a request and host approval; private events can include any number of custom screening questions.
- Host-entered prices are in USD with an exact cost explanation. No online payment or checkout is collected.
- Invite links use `/?invite=EVENT_ID`; guests authenticate before automatically opening the invited event.
- Hosts and joined/accepted attendees have an automatic group chat alongside existing private messages.
- Cancellation requires a reason and atomically records the cancellation, broadcasts inbox notifications, and posts the explanation to the group. Canceled groups retain read-only history.
- Category and language filters support multiple selections (OR within each dropdown, AND across filters). Nearby uses Haversine distance within 15km of the map center, or a user-selected current location. Sort by soonest, nearest, or capacity.

## Regression checks
With the API running, `node scripts/lezgo-smoke.mjs` checks approval/capacity races, screening, authorization, groups, editing, and cancellation broadcasts using newly created verification events. It prints fixture IDs for explicit cleanup; it never deletes existing user data.
`pnpm --filter @workspace/scripts exec tsx --test ../artifacts/pulsemap/src/lib/pulse.test.ts` checks Haversine distances, the 15km boundary, multi-select combinations, group-size thresholds, sorting, and admission rules without a server.

## Privacy and safety
Adults only in this MVP; self-reported ages are not identity verification. Meet in public places. Passwords are hashed; event chats are private to participants. No email or phone is required.

Maps use the standard free OpenStreetMap tiles with © OpenStreetMap contributors attribution. Avatars provided by DiceBear. Internet access is needed for tiles and avatars.

## License
MIT — see [LICENSE](LICENSE).

## Admin Account
to switch between Web and Mobile Versions 
- Admin user Name : Admin 
- Admin Password : hackathon 
