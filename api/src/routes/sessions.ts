import { Router } from "express";
import {
  alertsBatchSchema,
  endSessionSchema,
  listSessionsSchema,
} from "../lib/validation";
import { requireAuth } from "../lib/session";
import { z } from "zod";
import { createSession, endSession, publicSession } from "../services/session-service";
import { addAlerts, publicAlert } from "../services/feedback-service";
import { getSessionWithAlerts, listSessions } from "../services/session-query";

export const sessionsRouter = Router();

const createSchema = z.object({ baselineId: z.string().uuid() });

sessionsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const { baselineId } = createSchema.parse(req.body);
    const session = await createSession(req.user!.id, baselineId);
    res.status(201).json({ session: publicSession(session) });
  } catch (err) {
    next(err);
  }
});

sessionsRouter.patch("/:id/end", requireAuth, async (req, res, next) => {
  try {
    const input = endSessionSchema.parse(req.body);
    const session = await endSession(req.user!.id, req.params.id, input);
    res.json({ session: publicSession(session) });
  } catch (err) {
    next(err);
  }
});

sessionsRouter.post("/:id/alerts", requireAuth, async (req, res, next) => {
  try {
    const { alerts } = alertsBatchSchema.parse(req.body);
    const result = await addAlerts(req.user!.id, req.params.id, alerts);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

sessionsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const { cursor, limit } = listSessionsSchema.parse(req.query);
    const { items, nextCursor } = await listSessions(req.user!.id, cursor, limit);
    res.json({ items: items.map(publicSession), nextCursor });
  } catch (err) {
    next(err);
  }
});

sessionsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const session = await getSessionWithAlerts(req.user!.id, req.params.id);
    res.json({
      session: publicSession(session),
      alerts: session.alerts.map(publicAlert),
    });
  } catch (err) {
    next(err);
  }
});
