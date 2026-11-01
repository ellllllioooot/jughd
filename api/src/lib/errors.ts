import { NextFunction, Request, Response } from "express";
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
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "internal error" } });
}
