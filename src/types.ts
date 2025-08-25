export type WaitUntil = "load" | "domcontentloaded" | "networkidle";

export interface Viewport {
  width: number;
  height: number;
}

export interface ScreenshotInput {
  url: string;
  fullPage?: boolean;
  viewport?: Viewport;
  deviceScaleFactor?: number;
  waitUntil?: WaitUntil;
  timeoutMs?: number;
  darkMode?: boolean;
}

export interface ScreenshotResult {
  dataBase64: string;
  mimeType: "image/png";
}

// 统一错误码
export const ErrorCodes = {
  INVALID_URL: "E_INVALID_URL",
  BLOCKED_DOMAIN: "E_BLOCKED_DOMAIN",
  SIZE_EXCEEDED: "E_SIZE_EXCEEDED",
  NAVIGATION_TIMEOUT: "E_NAVIGATION_TIMEOUT",
  SCREENSHOT_FAILED: "E_SCREENSHOT_FAILED",
  IO_ERROR: "E_IO_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class CodedError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = code;
    this.code = code;
  }
}