# PulseMap — Architecture

## Stack
React and TypeScript with Tailwind for the responsive web client; React Leaflet and Leaflet with free CartoDB Voyager tiles; emoji-picker-react for activity selection; DiceBear avataaars v9 for illustrated avatars. Node/Express exposes a contract-first JSON API. PostgreSQL is the project database (SQLite is an alternative for independent local forks, not used by this deployment).

## Four-table domain schema
- **users**: id, unique username, salted password hash, age, avatar seed, demo flag.
- **events**: id, host user id, title, description, category, location name, latitude, longitude, start timestamp, maximum people, minimum age, maximum age, emoji, allow messages.
- **event_attendees**: event id, user id, joined timestamp; unique composite event/user key.
- **messages**: id, event id, sender id, recipient id, text, created timestamp, read timestamp.

Foreign keys maintain referential integrity. The creator is an attendee. A transactional event-row lock serializes join and leave capacity decisions. Message send and privacy changes use the same event lock to ensure a disabled setting cannot be bypassed by a racing message request.

## API and identity
The OpenAPI specification defines auth, demo switching, current user, events, attendance, privacy settings, conversations, and messages. Generated React Query hooks and Zod schemas share the contract. Passwords use Node crypto scrypt with independent random salts. Signed expiring HTTP-only session cookies authenticate users without adding a fifth domain table. Authentication and participant authorization are enforced server-side. The server validates all submitted data. Local username/password authentication is intentional, as explicitly requested.

## Refresh and deployment
Map availability is checked server-side with a cached tile HEAD request. A watermark response (which may have HTTP 200) or provider failure explicitly selects OpenStreetMap tiles and displays a notice; Voyager remains preferred when its public endpoint is available.

React Query invalidation immediately updates local actions; periodic refresh keeps other users' attendance, messaging permissions, and inbox counts current. API and frontend run as separate managed services behind the project's shared path router. External tiles and avatars require internet access and retain their provider attribution. Demo seed runs idempotently. Secrets stay in environment configuration.
