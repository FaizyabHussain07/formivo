/**
 * Structured application errors (Master Prompt §52, PRD §47).
 * User-facing messages, never stack traces or internals.
 */

export type ErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "FORM_INACTIVE"
  | "INTERNAL_ERROR";

const HTTP_STATUS: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  QUOTA_EXCEEDED: 402,
  FORM_INACTIVE: 409,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = HTTP_STATUS[code];
  }
}

export function toPublicErrorBody(err: unknown): {
  code: ErrorCode;
  message: string;
  status: number;
} {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message, status: err.status };
  }
  // Log the real error server-side; return a generic body to the caller.
  console.error("[app-error]", err);
  return {
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again.",
    status: 500,
  };
}
