import { CodedError, ErrorCodes } from "../types.js";
import { domainToASCII } from "node:url";
import { isIP } from "node:net";

/**
 * 规范化主机名：小写 + punycode
 */
export function normalizeHostname(host: string): string {
  const lower = host.trim().toLowerCase();
  const ascii = domainToASCII(lower);
  return ascii || lower;
}

/**
 * 是否 http/https
 */
function isHttpOrHttps(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * 是否本机/内网地址（不做 DNS 解析，仅检查字面量）
 * - localhost
 * - IPv4: 127/8、10/8、172.16-31/12、192.168/16
 * - IPv6: ::1、fc00::/7（含 fd00::/8）、fe80::/10
 */
export function isLocalhostOrPrivateIP(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (h === "localhost") return true;

  const ipVer = isIP(h);
  if (ipVer === 4) {
    const parts = h.split(".").map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
    const [a, b] = parts;
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0 - 172.31.255.255
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    return false;
  } else if (ipVer === 6) {
    // 简化判断常见前缀
    if (h === "::1") return true; // loopback
    if (h.startsWith("fc") || h.startsWith("fd")) return true; // fc00::/7 (Unique local)
    if (h.startsWith("fe80:")) return true; // fe80::/10 (Link-local)
    return false;
  }
  return false;
}

/**
 * 是否政府类域名：
 * - 末级 TLD 为 .gov
 * - 倒数第二级为 gov（如 *.gov.cn、*.gov.uk 等）
 * 注：仅对域名判断，字面量 IP 不属于政府域名判断范围
 */
export function isGovernmentHost(host: string): boolean {
  const ipVer = isIP(host);
  if (ipVer) return false;

  const labels = host.split(".").filter(Boolean);
  if (labels.length === 0) return false;

  const last = labels[labels.length - 1];
  const secondLast = labels.length >= 2 ? labels[labels.length - 2] : "";

  if (last === "gov") return true; // *.gov
  if (secondLast === "gov") return true; // *.gov.<tld>
  return false;
}

/**
 * URL 校验 + 访问限制
 * - 仅允许 http/https
 * - 禁止政府类域名
 * - 禁止本机/内网地址
 * 通过则返回标准化 URL 与 ASCII host
 */
export function assertUrlAllowed(urlStr: string): { url: URL; asciiHost: string } {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new CodedError(ErrorCodes.INVALID_URL, "URL 无效");
  }

  if (!isHttpOrHttps(url)) {
    throw new CodedError(ErrorCodes.INVALID_URL, "仅允许 http/https 协议");
  }

  const asciiHost = normalizeHostname(url.hostname);

  if (isGovernmentHost(asciiHost)) {
    throw new CodedError(
      ErrorCodes.BLOCKED_DOMAIN,
      `禁止访问政府类站点: ${asciiHost}`
    );
  }

  if (isLocalhostOrPrivateIP(asciiHost)) {
    throw new CodedError(
      ErrorCodes.BLOCKED_DOMAIN,
      `禁止访问内网/本机地址: ${asciiHost}`
    );
  }

  return { url, asciiHost };
}