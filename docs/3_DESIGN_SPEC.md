# Lezgo — Design Specification

## Product identity
A bold, energetic, people-first neighborhood activity map, not an enterprise directory. Lezgo uses a custom winking map-pin SVG with a purple (#A855F7), coral pink (#FF5E7E), and sunny orange (#FF9F43) gradient, a white face, and an adjacent bouncy multicolor wordmark in navigation and authentication. The map and nearby activities form the primary experience; activity emoji and illustrated faces make people and plans recognizable.

## Visual system
Mix joyful category colors rather than using purple everywhere: mint teal for sports/running, sunny amber for coffee/language talks, coral rose for games/social, and sky blue for study/tech. Time and distance badges use fresh emerald. Give the navbar and floating controls translucent glass surfaces and a subtle purple/pink/orange/teal top strip. Use pill-shaped controls, rounded modern typography, visible keyboard focus, and category-themed card/modal headers. Event cards have rounded-3xl corners and a light upward bounce on hover. Create Event uses a fuchsia/pink/orange sunset gradient and glow. Capacity progress uses emerald-to-teal, and overlapping avatars alternate pink, teal, and amber rings. Respect reduced-motion preferences. Provide clear destructive, disabled, error, and empty states, and keep explanatory text readable over the map.

## Map and markers
Default to Istanbul's Kadıköy area, with events around Moda, campuses, and Beşiktaş. Use https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png and only &copy; OpenStreetMap contributors attribution. Leaflet divIcon markers use the privacy colors specified below, large activity emoji, and a gradient capacity pill or muted Full pill. Selecting a pin opens event details.

## Avatars and emoji
DiceBear URL: https://api.dicebear.com/9.x/avataaars/svg?seed=SEED. Registration offers eight distinct seeds. Attendee avatars overlap with username and age tooltips. Quick activity options: ☕, 🏐, 🏃, 🗣️, ⚽, 🎮, 📚, 🎸, 🍕, 🧘. The full emoji-picker-react picker supplements presets.

## Responsive behavior
Desktop supports map and discoverable activity list together. Mobile uses compact navigation and accessible bottom-sheet or drawer patterns for activity details, creation, and chat. Only the signed-in user whose username is exactly `Admin` sees the top-bar mobile/desktop preview toggle; everyone retains normal responsive layouts. Creation includes a clickable map location selector and editable event fields. Search and filters affect both map and list.

## Interaction feedback
Show join and leave feedback immediately after success, preserve server validation errors, and refresh attendance and permissions periodically. Hosts see an inline messaging switch on their own event; other members see Message Host only while allowed. Chat history remains readable if new incoming messages are disabled.

## Strict map pin semantics
Pin background means privacy ONLY: public is crisp white with slate-900 text; private is purple-600 with white text, purple-300 border, and `0 0 16px #a855f7` neon shadow. Payment means ONLY a `$` badge at the top-right, independent of the background. Maintain all four public/private × free/paid combinations. A paid event detail shows its exact price and host cost explanation.

## Upgraded controls and workflows
Replace category pills with a multi-checkbox Categories popover and add a matching Languages popover. Retain text, age and open-spots filters, with distance, group-size and sorting controls in desktop and mobile. A host's create/edit form includes visibility, paid price/cost, languages, and unlimited dynamic screening rows. Request forms require every screening answer. Host review shows each applicant's face, username, age, and answer pairs with Accept/Decline. Inbox tabs distinguish Group Chats, Private Messages, Notifications / Requests. Cancellation opens a reason-required confirmation dialog and shows the exact reason on the canceled event and announcement.
