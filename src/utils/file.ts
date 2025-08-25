import { mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_DIR = "screenshots";

export function getDefaultDir(): string {
  return path.resolve(process.cwd(), DEFAULT_DIR);
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await access(dirPath, constants.F_OK);
  } catch {
    await mkdir(dirPath, { recursive: true });
  }
}

export function buildFileName(host: string, ext: string = ".png"): string {
  const safeHost = host.replace(/[^a-z0-9.-]/gi, "_");
  const now = new Date();
  const ts = [
    now.getFullYear().toString().padStart(4, "0"),
    (now.getMonth() + 1).toString().padStart(2, "0"),
    now.getDate().toString().padStart(2, "0"),
  ].join("") + "_" + [
    now.getHours().toString().padStart(2, "0"),
    now.getMinutes().toString().padStart(2, "0"),
    now.getSeconds().toString().padStart(2, "0"),
  ].join("");
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${safeHost}_${ts}_${rand}${ext}`;
}

export function ensurePngExtension(p: string): string {
  const ext = path.extname(p).toLowerCase();
  if (ext === ".png") return p;
  return `${p}.png`;
}

export function resolvePath(p: string): string {
  if (path.isAbsolute(p)) return path.normalize(p);
  return path.resolve(process.cwd(), p);
}

export function filePathToFileUrl(p: string): string {
  return pathToFileURL(p).toString();
}