# Lezgo — Architecture

## Stack
React and TypeScript with Tailwind for the responsive web client; React Leaflet and Leaflet with standard free OpenStreetMap tiles; emoji-picker-react for activity selection; DiceBear avataaars v9 for illustrated avatars. Node/Express exposes a contract-first JSON API. PostgreSQL is the project database (SQLite is an alternative for independent local forks, not used by this deployment).

## Domain schema
- **users**: id, unique username, salted password hash, age, avatar seed, demo flag.
- **events**: id, host user id, title, description, category, location name, latitude, longitude, start timestamp, maximum people, minimum age, maximum age, emoji, allow messages.
- **event_attendees**: event id, user id, joined timestamp; unique composite event/user key.
- **messages**: id, event id, sender id, recipient id, text, created timestamp, read timestamp.
- **join_requests**: unique event/user application, snapshot question/answer pairs, pending/accepted/declined/withdrawn status, creation time.
- **group_messages**: event, sender, body, system-announcement flag, timestamp.
- **notifications**: recipient, event, type, exact notification text, read/creation timestamps.

Events additionally store private/paid booleans independently, price/cost details, language arrays, dynamic screening questions, status, and cancellation explanation. Attendance includes a per-member group read receipt. Seven domain tables deliberately replace the original four-table scope to support the requested approval, group, and notification persistence without overloading private-message semantics.

Foreign keys maintain referential integrity. The creator is an attendee. A transactional event-row lock serializes join and leave capacity decisions. Message send and privacy changes use the same event lock to ensure a disabled setting cannot be bypassed by a racing message request.

Requests, approvals, edits, cancellation, group sends, and group read authorization acquire that same event lock. Concurrent approvals cannot exceed capacity. A cancellation transaction updates the event, closes pending applications, inserts recipient notifications, and posts the group announcement together; it cannot partially broadcast. Private event listings are intentionally discoverable, while request answers and group history are server-authorized. Existing accepted memberships remain valid if the host changes visibility or price.

## API and identity
The OpenAPI specification defines auth, demo switching, current user, events/editing/cancellation, attendance, applications and host decisions, private messaging preferences, conversations, groups, notifications and messages. Generated React Query hooks and Zod schemas share the contract. Passwords use Node crypto scrypt with independent random salts. Signed expiring HTTP-only session cookies authenticate users without a session table. Authentication and participant authorization are enforced server-side. The server validates all submitted data. Local username/password authentication is intentional, as explicitly requested.

## Refresh and deployment
Both the main map and location picker load standard OpenStreetMap tiles directly, without a provider probe or fallback notice.

React Query invalidation immediately updates local actions; periodic refresh keeps other users' attendance, messaging permissions, and inbox counts current. API and frontend run as separate managed services behind the project's shared path router. External tiles and avatars require internet access and retain their provider attribution. Demo seed runs idempotently. Secrets stay in environment configuration.
