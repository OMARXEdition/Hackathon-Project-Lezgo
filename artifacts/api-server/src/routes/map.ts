import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const voyager = {
  url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  fallback: false, notice: "", maxZoom: 20,
};
const osm = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  fallback: true,
  notice: "OpenStreetMap · Voyager is currently unavailable without an API key",
  maxZoom: 19,
};
let cached: { value: typeof voyager; expires: number } | null = null;
let pending: Promise<typeof voyager> | null = null;
async function provider() {
  if (cached && cached.expires > Date.now()) return cached.value;
  if (pending) return pending;
  pending = (async () => {
    let value = voyager;
    try {
      const response = await fetch("https://a.basemaps.cartocdn.com/rastertiles/voyager/12/2378/1538.png", {
        method: "HEAD", signal: AbortSignal.timeout(3500),
      });
      // CARTO can return 200 with a watermark instead of real tiles.
      if (!response.ok || (response.headers.get("etag") ?? "").includes("wm-")) value = osm;
    } catch { value = osm; }
    if (value.fallback) logger.warn("Voyager unavailable; serving explicit no-key OpenStreetMap fallback configuration");
    cached = { value, expires: Date.now() + 5 * 60000 };
    return value;
  })();
  try { return await pending; } finally { pending = null; }
}
router.get("/map-config", async (_req, res): Promise<void> => { res.json(await provider()); });
export default router;
