import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import captureScreenshot from "./screenshot.js";
import { ErrorCodes } from "./types.js";

const server = new Server(
  {
    name: "mcp-playwright-screenshot",
    version: "0.1.0",
  },
  { capabilities: { tools: {} } }
);

const viewportSchema = z.object({
  width: z.number().int().positive().describe("视口宽度，正整数"),
  height: z.number().int().positive().describe("视口高度，正整数"),
});

const inputSchema = z.object({
  url: z.string().url().describe("目标页面 URL，仅 http/https"),
  fullPage: z.boolean().optional().default(true).describe("整页截图"),
  viewport: viewportSchema.optional().describe("视口宽高，默认 1280x800"),
  deviceScaleFactor: z.number().positive().optional().default(1).describe("设备像素比，>0"),
  waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).optional().default("networkidle")
    .describe("等待策略"),
  timeoutMs: z.number().int().positive().optional().default(30000).describe("加载超时毫秒"),
  darkMode: z.boolean().optional().default(false).describe("是否启用深色模式"),
});

// tools/list: 公布工具元数据
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "screenshot",
        description:
          "使用 Playwright 对指定 URL 截图并返回 PNG 的 base64 图片内容。包含政府网站与内网访问限制、尺寸上限校验。",
        input_schema: inputSchema,
      },
    ],
  };
});

// tools/call: 调用工具
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;

  if (name !== "screenshot") {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `E_TOOL_NOT_FOUND: 未知工具 ${name}`,
        },
      ],
    };
  }

  try {
    const parsed = inputSchema.parse(rawArgs ?? {});
    const result = await captureScreenshot(parsed);
    return {
      content: [
        {
          type: "image",
          data: result.dataBase64,
          mimeType: result.mimeType,
        },
      ],
    };
  } catch (err: any) {
    const message = err?.message ?? "未知错误";
    const knownCodes = new Set<string>(Object.values(ErrorCodes));
    const code =
      typeof err?.code === "string" && knownCodes.has(err.code) ? err.code : "E_SCREENSHOT_FAILED";

    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `${code}: ${message}`,
        },
      ],
    };
  }
});

// 通过 stdio 提供服务
await server.connect(new StdioServerTransport());
