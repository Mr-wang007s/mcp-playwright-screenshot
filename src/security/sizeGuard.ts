import { CodedError, ErrorCodes, Viewport } from "../types.js";

export const MAX_WIDTH = 12000;
export const MAX_HEIGHT = 100000;

function isPositiveFiniteInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

/**
 * 校验视口尺寸是否在限制内（用于 fullPage 与非 fullPage 的公共前置校验）
 */
export function assertViewportWithinLimits(viewport: Viewport) {
  const { width, height } = viewport;
  if (!isPositiveFiniteInt(width) || !isPositiveFiniteInt(height)) {
    throw new CodedError(ErrorCodes.SIZE_EXCEEDED, "viewport 宽高必须为正整数");
  }
  if (width > MAX_WIDTH) {
    throw new CodedError(
      ErrorCodes.SIZE_EXCEEDED,
      `截图宽度超出上限: width=${width} > ${MAX_WIDTH}`
    );
  }
  if (height > MAX_HEIGHT) {
    throw new CodedError(
      ErrorCodes.SIZE_EXCEEDED,
      `截图高度超出上限: height=${height} > ${MAX_HEIGHT}`
    );
  }
}

/**
 * 在 fullPage 模式下，校验页面总高度是否超限
 */
export function assertFullPageHeightWithinLimits(totalHeight: number) {
  if (!Number.isFinite(totalHeight) || totalHeight <= 0) {
    throw new CodedError(ErrorCodes.SCREENSHOT_FAILED, "无法获取页面总高度");
  }
  if (totalHeight > MAX_HEIGHT) {
    throw new CodedError(
      ErrorCodes.SIZE_EXCEEDED,
      `页面总高度超出上限: height=${totalHeight} > ${MAX_HEIGHT}`
    );
  }
}