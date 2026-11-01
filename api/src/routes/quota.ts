import { Router } from "express";
import { requireAuth } from "../lib/session";
import { getQuota, quotaView } from "../services/quota-service";

export const quotaRouter = Router();

quotaRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    res.json(quotaView(await getQuota(req.user!.id)));
  } catch (err) {
    next(err);
  }
});
