import { ApiClientError } from "./api";
import { errorMessage } from "./messages";

/** Human-facing Persian message for any thrown value. */
export function toPersianError(err: unknown): string {
  if (err instanceof ApiClientError) return errorMessage(err.code);
  return errorMessage("INTERNAL");
}
