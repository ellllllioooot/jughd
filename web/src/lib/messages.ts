import type { ApiErrorCode } from "./api";

/** Error codes → Persian copy (contracts/api.md: web client renders Persian). */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: "اطلاعات واردشده معتبر نیست.",
  EMAIL_TAKEN: "این ایمیل قبلاً ثبت شده است.",
  USERNAME_TAKEN: "این نام کاربری قبلاً گرفته شده است.",
  INVALID_CREDENTIALS: "ایمیل/نام کاربری یا رمز عبور نادرست است.",
  UNAUTHORIZED: "لطفاً ابتدا وارد حساب خود شوید.",
  NOT_FOUND: "موردی یافت نشد.",
  NO_BASELINE: "هنوز وضعیت اولیه شما ثبت نشده است.",
  QUOTA_EXHAUSTED: "سهمیه مانیتورینگ ماهانه شما تمام شده است.",
  ALREADY_VERIFIED: "این هشدار قبلاً تأیید یا رد شده است.",
  RATE_LIMITED: "تلاش بیش از حد؛ کمی بعد دوباره امتحان کنید.",
  INTERNAL: "خطای داخلی رخ داد. دوباره تلاش کنید.",
};

export function errorMessage(code: string | undefined): string {
  return ERROR_MESSAGES[code as ApiErrorCode] ?? ERROR_MESSAGES.INTERNAL;
}
