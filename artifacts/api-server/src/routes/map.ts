import { Router, type IRouter } from "express";

const router: IRouter = Router();
const osm = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "&copy; OpenStreetMap contributors",
  fallback: false,
  notice: "",
  maxZoom: 19,
};
router.get("/map-config", (_req, res): void => { res.json(osm); });
export default router;
