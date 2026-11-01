import { Router } from "express";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "../lib/validation";
import { requireAuth } from "../lib/session";
import { prisma } from "../lib/prisma";

export const pushRouter = Router();

pushRouter.post("/subscribe", requireAuth, async (req, res, next) => {
  try {
    const input = pushSubscribeSchema.parse(req.body);
    await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: { p256dh: input.p256dh, auth: input.auth, userId: req.user!.id },
      create: {
        userId: req.user!.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      },
    });
    res.status(201).end();
  } catch (err) {
    next(err);
  }
});

pushRouter.delete("/subscribe", requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = pushUnsubscribeSchema.parse(req.body);
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.user!.id },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
