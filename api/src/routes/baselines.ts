import { Router } from "express";
import { baselineSchema } from "../lib/validation";
import { requireAuth } from "../lib/session";
import {
  createBaseline,
  getCurrentBaseline,
  publicBaseline,
} from "../services/baseline-service";

export const baselinesRouter = Router();

baselinesRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const input = baselineSchema.parse(req.body);
    const baseline = await createBaseline(req.user!.id, input);
    res.status(201).json({ baseline: publicBaseline(baseline) });
  } catch (err) {
    next(err);
  }
});

baselinesRouter.get("/current", requireAuth, async (req, res, next) => {
  try {
    const baseline = await getCurrentBaseline(req.user!.id);
    res.json({ baseline: publicBaseline(baseline) });
  } catch (err) {
    next(err);
  }
});
