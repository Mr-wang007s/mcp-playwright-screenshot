import { chromium, Browser, BrowserContext } from "playwright";
import {
  CodedError,
  ErrorCodes,
  ScreenshotInput,
  ScreenshotResult,
  Viewport,
  WaitUntil,
} from "./types.js";
import { assertUrlAllowed } from "./security/domainGuard.js";
import {
  assertViewportWithinLimits,
  assertFullPageHeightWithinLimits,
} from "./security/sizeGuard.js";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

function applyDefaults(input: ScreenshotInput): Required<ScreenshotInput> {
  const fullPage = input.fullPage ?? true;
  const viewport: Viewport = input.viewport ?? { width: 1280, height: 800 };
  const deviceScaleFactor = input.deviceScaleFactor ?? 1;
  const waitUntil: WaitUntil = input.waitUntil ?? "networkidle";
  const timeoutMs = input.timeoutMs ?? 30000;
  const darkMode = input.darkMode ?? false;
  return {
    url: input.url,
    fullPage,
    viewport,
    deviceScaleFactor,
    waitUntil,
    timeoutMs,
    darkMode,
  };
}

function validateNumbers(viewport: Viewport, deviceScaleFactor: number, timeoutMs: number) {
  assertViewportWithinLimits(viewport);

  if (!(typeof deviceScaleFactor === "number" && deviceScaleFactor > 0 && Number.isFinite(deviceScaleFactor))) {
    throw new CodedError(ErrorCodes.SIZE_EXCEEDED, "deviceScaleFactor 必须为大于 0 的有限数字");
  }

  if (!(Number.isInteger(timeoutMs) && timeoutMs > 0)) {
    throw new CodedError(ErrorCodes.INVALID_URL, "timeoutMs 必须为正整数");
  }
}

export default async function captureScreenshot(input: ScreenshotInput): Promise<ScreenshotResult> {
  const withDefaults = applyDefaults(input);

  // URL 校验与安全限制
  const { url } = assertUrlAllowed(withDefaults.url);

  // 数字参数校验
  validateNumbers(withDefaults.viewport, withDefaults.deviceScaleFactor, withDefaults.timeoutMs);

  const browser = await getBrowser();
  let context: BrowserContext | null = null;

  try {
    context = await browser.newContext({
      viewport: {
        width: withDefaults.viewport.width,
        height: withDefaults.viewport.height,
      },
      deviceScaleFactor: withDefaults.deviceScaleFactor,
      colorScheme: withDefaults.darkMode ? "dark" : "light",
    });

    const page = await context.newPage();

    try {
      await page.goto(url.toString(), {
        waitUntil: withDefaults.waitUntil,
        timeout: withDefaults.timeoutMs,
      });
    } catch (err: any) {
      const name = typeof err?.name === "string" ? err.name : "";
      if (name.includes("TimeoutError")) {
        throw new CodedError(
          ErrorCodes.NAVIGATION_TIMEOUT,
          `页面加载超时: ${url.toString()}`
        );
      }
      throw new CodedError(
        ErrorCodes.SCREENSHOT_FAILED,
        `页面导航失败: ${err?.message ?? String(err)}`
      );
    }

    // fullPage 高度限制
    if (withDefaults.fullPage) {
      const totalHeight = await page.evaluate(() => {
        const doc = document.documentElement;
        return Math.max(
          doc.scrollHeight,
          doc.offsetHeight,
          doc.clientHeight,
          document.body?.scrollHeight ?? 0,
          document.body?.offsetHeight ?? 0,
          document.body?.clientHeight ?? 0
        );
      });
      assertFullPageHeightWithinLimits(totalHeight);
    }

    try {
      const buffer = await page.screenshot({
        fullPage: withDefaults.fullPage,
        type: "png",
      });
      const base64 = buffer.toString("base64");
      return { dataBase64: base64, mimeType: "image/png" };
    } catch (err: any) {
      throw new CodedError(
        ErrorCodes.SCREENSHOT_FAILED,
        `截图失败: ${err?.message ?? String(err)}`
      );
    }
  } finally {
    if (context) {
      try {
        await context.close();
      } catch {
        // 忽略关闭错误
      }
    }
  }
}