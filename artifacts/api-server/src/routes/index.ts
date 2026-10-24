import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eventsRouter from "./events";
import messagesRouter from "./messages";
import mapRouter from "./map";
import requestsRouter from "./requests";
import groupsRouter from "./groups";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(messagesRouter);
router.use(mapRouter);
router.use(requestsRouter);
router.use(groupsRouter);

export default router;
