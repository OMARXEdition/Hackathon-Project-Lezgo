import express, { type Express, type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sameOrigin } from "./lib/auth";
import { HttpError } from "./lib/errors";

const app: Express = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sameOrigin);
app.use("/api", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

app.use("/api", router);
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
  if (err instanceof SyntaxError && "body" in err) { res.status(400).json({ error: "Invalid JSON request" }); return; }
  req.log.error({ err }, "Request failed");
  res.status(500).json({ error: "Something went wrong. Please try again." });
};
app.use(errorHandler);

export default app;
