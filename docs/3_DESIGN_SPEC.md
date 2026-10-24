# Lezgo — Design Specification

## Product identity
A bold, energetic, people-first neighborhood activity map, not an enterprise directory. Lezgo uses the supplied winking purple map-pin face logo in navigation, authentication, and the browser favicon. The map and nearby activities form the primary experience; activity emoji and illustrated faces make people and plans recognizable.

## Visual system
Use electric purple (#A855F7), purple-to-violet primary gradients, soft purple glows, pure-white cards, lavender borders, pill-shaped buttons, rounded modern typography, and visible keyboard focus. Apply the purple treatment to active filters, checkboxes, capacity progress, and primary actions. Provide clear primary, secondary, destructive, disabled, error, and empty states. Keep explanatory text readable over the map. Category controls, age badges, capacity progress, and avatar clusters communicate eligibility at a glance.

## Map and markers
Default to Istanbul's Kadıköy area, with events around Moda, campuses, and Beşiktaş. Use https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png and only &copy; OpenStreetMap contributors attribution. Leaflet divIcon markers use the privacy colors specified below, large activity emoji, and a purple capacity pill or muted Full pill. Selecting a pin opens event details.

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
