import express from "express";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./lib/errors";
import { authRouter } from "./routes/auth";
import { baselinesRouter } from "./routes/baselines";
import { sessionsRouter } from "./routes/sessions";
import { alertsRouter } from "./routes/alerts";
import { dashboardRouter } from "./routes/dashboard";
import { quotaRouter } from "./routes/quota";
import { pushRouter } from "./routes/push";
import { statsRouter } from "./routes/stats";
import { startSessionSweep } from "./services/session-service";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "256kb" }));

  app.get("/healthz", (_req, res) => res.json({ ok: true }));

  const v1 = express.Router();
  v1.use("/auth", authRouter);
  v1.use("/baselines", baselinesRouter);
  v1.use("/sessions", sessionsRouter);
  v1.use("/alerts", alertsRouter);
  v1.use("/dashboard", dashboardRouter);
  v1.use("/quota", quotaRouter);
  v1.use("/push", pushRouter);
  v1.use("/stats", statsRouter);
  app.use("/api/v1", v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  startSessionSweep();
  return app;
}
