import { Router } from "express";
import { globalStats } from "../services/aggregate-service";

export const statsRouter = Router();

statsRouter.get("/global", async (_req, res, next) => {
  try {
    res.json(await globalStats());
  } catch (err) {
    next(err);
  }
});
