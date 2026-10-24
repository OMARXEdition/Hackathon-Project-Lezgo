import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eventsRouter from "./events";
import messagesRouter from "./messages";
import mapRouter from "./map";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(messagesRouter);
router.use(mapRouter);

export default router;
