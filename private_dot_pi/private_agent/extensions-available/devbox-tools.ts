import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  // Code Execution Tool: Executes arbitrary shell commands or scripts inside the agent-devbox container
  pi.registerTool({
    name: "devbox_code_execute",
    label: "Code Execution",
    description: "Execute arbitrary commands or scripts inside the secure agent-devbox container",
    parameters: Type.Object({
      command: Type.String({ description: "Command to execute inside the container" }),
      code: Type.Optional(Type.String({ description: "Optional code content to execute. If provided, will be written to a temp file and executed." })),
      extension: Type.Optional(Type.String({ description: "Optional file extension for the code file (e.g., 'py', 'js', 'sh'). Defaults to 'py'." }))
    }),
    execute: async (toolCallId, params) => {
      const { exec } = require("node:child_process");
      const { promisify } = require("node:util");
      const execPromise = promisify(exec);
      const fs = require("node:fs/promises");
      const path = require("node:path");

      try {
        let cmd = params.command;
        if (params.code) {
          const ext = params.extension || "py";
          const filename = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const hostPath = path.join("/projects", filename);
          const containerPath = path.join("/projects", filename);
          await fs.writeFile(hostPath, params.code);

          if (ext === "py") {
            cmd = `python3 ${containerPath}`;
          } else if (ext === "js" || ext === "ts") {
            cmd = `node ${containerPath}`;
          } else {
            cmd = `bash ${containerPath}`;
          }
        }

        const safeCmd = cmd.replace(/'/g, "'\\''");
        const execCmd = `docker exec -w /projects -i agent-devbox bash -c '${safeCmd}'`;
        const { stdout, stderr } = await execPromise(execCmd);
        const output = [stdout, stderr].filter(Boolean).join("\n");
        return { content: [{ type: "text", text: output || "(No output)" }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.stdout || err.stderr || err.message}` }] };
      }
    }
  });

  // Browser Screenshot Tool: Drives Playwright inside agent-devbox to capture full pages
  pi.registerTool({
    name: "devbox_browser_screenshot",
    label: "Browser Screenshot",
    description: "Navigate to a URL using a real headless browser inside agent-devbox and capture a screenshot",
    parameters: Type.Object({
      url: Type.String({ description: "The URL to navigate to" })
    }),
    execute: async (toolCallId, params) => {
      const { exec } = require("node:child_process");
      const { promisify } = require("node:util");
      const execPromise = promisify(exec);

      try {
        const filename = `screenshot_${Date.now()}.png`;
        const hostPath = `/projects/${filename}`;
        const containerPath = `/projects/${filename}`;

        const execCmd = `docker exec -i agent-devbox python3 /projects/pi_screenshot.py "${params.url}" "${containerPath}"`;
        await execPromise(execCmd);

        return {
          content: [
            { type: "text", text: `Screenshot captured successfully and saved to ${hostPath}` },
            { type: "image", imagePath: hostPath }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error capturing screenshot: ${err.stdout || err.stderr || err.message}` }] };
      }
    }
  });
}
