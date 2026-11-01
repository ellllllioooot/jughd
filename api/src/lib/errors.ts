import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "EMAIL_TAKEN"
  | "USERNAME_TAKEN"
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "NO_BASELINE"
  | "QUOTA_EXHAUSTED"
  | "ALREADY_VERIFIED"
  | "RATE_LIMITED"
  | "INTERNAL";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string
  ) {
    super(message);
  }
}

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "not found" } });
};

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      },
    });
    return;
  }
  // malformed ids (e.g. /alerts/not-a-uuid) reach Prisma before any lookup —
  // they must be typed 4xx, never a 500 (found by T056 live validation)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "not found" } });
    return;
  }
  if (
    err instanceof Prisma.PrismaClientValidationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2023")
  ) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "invalid id" } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "internal error" } });
}
