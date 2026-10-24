---
name: Public map tile availability
description: Why public tile availability must be checked beyond HTTP status.
---
Do not treat a successful tile HTTP status as proof of a usable map.

**Why:** During the initial build, the exact requested CARTO Voyager public URL returned HTTP 200 PNG images with “API KEY REQUIRED” watermarks. Several CARTO public style variants behaved the same way; the ETag started with `wm-`.

**How to apply:** Follow the current tile-provider requirements in replit.md rather than restoring the historical fallback behavior. Inspect actual tile imagery or watermark metadata when diagnosing a provider issue.
