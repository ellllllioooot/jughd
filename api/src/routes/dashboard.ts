import { Router } from "express";
import { requireAuth } from "../lib/session";
import { dashboardSummary } from "../services/aggregate-service";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", requireAuth, async (req, res, next) => {
  try {
    res.json(await dashboardSummary(req.user!.id));
  } catch (err) {
    next(err);
  }
});
