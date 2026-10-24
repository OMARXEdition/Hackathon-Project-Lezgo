---
name: Public map tile availability
description: Why public tile availability must be checked beyond HTTP status.
---
Do not treat a successful tile HTTP status as proof of a usable map.

**Why:** During the initial build, the exact requested CARTO Voyager public URL returned HTTP 200 PNG images with “API KEY REQUIRED” watermarks. Several CARTO public style variants behaved the same way; the ETag started with `wm-`.

**How to apply:** Prefer the requested Voyager provider when usable, but retain an explicitly labeled no-key OpenStreetMap fallback. Do not silently substitute providers or request paid credentials merely to restore the map. Inspect actual tile imagery or watermark metadata when diagnosing a blank map.
