import { Router } from "express";
import { verdictSchema } from "../lib/validation";
import { requireAuth } from "../lib/session";
import { publicAlert, setVerdict } from "../services/feedback-service";

export const alertsRouter = Router();

alertsRouter.patch("/:id/verdict", requireAuth, async (req, res, next) => {
  try {
    const { verdict } = verdictSchema.parse(req.body);
    const alert = await setVerdict(req.user!.id, req.params.id, verdict);
    res.json({ alert: publicAlert(alert) });
  } catch (err) {
    next(err);
  }
});
