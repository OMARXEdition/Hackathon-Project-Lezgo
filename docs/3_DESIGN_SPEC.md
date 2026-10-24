# PulseMap — Design Specification

## Product identity
A welcoming, people-first neighborhood activity map, not an enterprise directory. The map and nearby activities form the primary experience; activity emoji and illustrated faces make people and plans recognizable.

## Visual system
Use expressive activity color, legible typography, clear spacing, rounded controls, and visible keyboard focus. Provide clear primary, secondary, destructive, disabled, error, and empty states. Keep explanatory text readable over the map. Category controls, age badges, capacity progress, and avatar clusters communicate eligibility at a glance.

## Map and markers
Default to Istanbul's Kadıköy area, with events around Moda, campuses, and Beşiktaş. Use https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png and OpenStreetMap/CARTO attribution. Leaflet divIcon markers are glossy white rounded floating badges with shadows, large activity emoji, and a green capacity pill or muted Full pill. Selecting a pin opens event details.

## Avatars and emoji
DiceBear URL: https://api.dicebear.com/9.x/avataaars/svg?seed=SEED. Registration offers eight distinct seeds. Attendee avatars overlap with username and age tooltips. Quick activity options: ☕, 🏐, 🏃, 🗣️, ⚽, 🎮, 📚, 🎸, 🍕, 🧘. The full emoji-picker-react picker supplements presets.

## Responsive behavior
Desktop supports map and discoverable activity list together. Mobile uses compact navigation and accessible bottom-sheet or drawer patterns for activity details, creation, and chat. A top-bar mobile/desktop preview toggle allows judging both presentations. Creation includes a clickable map location selector and editable event fields. Search and filters affect both map and list.

## Interaction feedback
Show join and leave feedback immediately after success, preserve server validation errors, and refresh attendance and permissions periodically. Hosts see an inline messaging switch on their own event; other members see Message Host only while allowed. Chat history remains readable if new incoming messages are disabled.
