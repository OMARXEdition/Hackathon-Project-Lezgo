# PulseMap — Product Requirements

## Problem and audience
Students and neighborhood or compound residents need an easy way to find nearby people for casual activities, without business listings, phone numbers, or public contact details.

## Core user stories
- As a resident, I can browse Istanbul events on a map and instantly search and filter the map and event list together.
- As a member, I can register with a unique username, password, age, and illustrated avatar; no email or phone is collected.
- As a host, I can select an exact map location, time, emoji, capacity, age range, and messaging preference when creating an event.
- As an attendee, I can join eligible events, see my avatar appear, and leave to free a spot.
- As a host or attendee, I can exchange private event-linked messages and read my inbox.
- As a host, I can disable incoming messages at any time; the server enforces this immediately.
- As a judge, I can switch among five seeded demo accounts and compare mobile and desktop layouts.

## Guardrails and privacy
The MVP supports adults aged 18 and above; age is self-reported and not verified. Each event has an inclusive minimum and maximum age. Server-side checks reject ineligible, duplicate, or over-capacity joins, including concurrent attempts. Hosts count toward capacity and cannot leave their own event. Passwords are salted and hashed, never returned in APIs. Sessions use signed, HTTP-only cookies. Public profiles expose only username, age, and avatar seed. Messages are accessible only to their two participants; disabling messaging blocks new incoming messages, including existing threads, while retaining history. No phone numbers, email addresses, exact home addresses, or background location tracking are needed. Users should choose public meeting places. Demo switching is explicitly a demonstration capability, not an identity verification mechanism.

## Acceptance criteria
All six seeded activities have map coordinates, realistic attendance, and event details. Search and category, age, and open-spots filters affect pins and list together. Create, join, leave, privacy changes, and messages persist in the database. Desktop and mobile layouts support the same actions. Empty states, validation errors, full events, and age restrictions are visible and understandable.
