import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

// Self-contained browser screenshot tool.
// pi already runs inside the devbox container, which ships Playwright
// (global npm package, Chromium under PLAYWRIGHT_BROWSERS_PATH). So we drive
// it locally — no nested container, no pre-placed helper script.
export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "browser_screenshot",
    label: "Browser Screenshot",
    description:
      "Navigate to a URL with a headless Chromium browser and capture a screenshot. Runs locally using the container's bundled Playwright.",
    parameters: Type.Object({
      url: Type.String({ description: "The URL to navigate to" }),
      fullPage: Type.Optional(
        Type.Boolean({ description: "Capture the full scrollable page (default true)" }),
      ),
    }),
    execute: async (_toolCallId, params) => {
      const { exec } = require("node:child_process");
      const { promisify } = require("node:util");
      const execPromise = promisify(exec);
      const fs = require("node:fs/promises");
      const os = require("node:os");
      const path = require("node:path");

      const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const scriptPath = path.join(os.tmpdir(), `pi_shot_${stamp}.js`);
      const outPath = path.join(os.tmpdir(), `pi_shot_${stamp}.png`);
      const fullPage = params.fullPage !== false;

      // url/outPath are embedded as JS string literals (JSON.stringify), so the
      // script needs no arguments and we avoid all shell-escaping concerns.
      const script = `
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(${JSON.stringify(params.url)}, { waitUntil: "networkidle", timeout: 30000 });
    await page.screenshot({ path: ${JSON.stringify(outPath)}, fullPage: ${fullPage} });
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e && e.message ? e.message : String(e)); process.exit(1); });
`;

      try {
        await fs.writeFile(scriptPath, script);
        await execPromise(`node ${JSON.stringify(scriptPath)}`, {
          env: {
            ...process.env,
            PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/playwright-browsers",
          },
        });
        return {
          content: [
            { type: "text", text: `Screenshot of ${params.url} saved to ${outPath}` },
            { type: "image", imagePath: outPath },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            { type: "text", text: `Error capturing screenshot: ${err.stderr || err.stdout || err.message}` },
          ],
        };
      } finally {
        fs.unlink(scriptPath).catch(() => {});
      }
    },
  });
}
