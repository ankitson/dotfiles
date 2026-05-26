import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

// NOTE: This extension is intentionally NOT in the auto-discovered
// `~/.pi/agent/extensions/` directory, so it does not load by default.
// pi already ships a built-in `bash` tool that covers this, and inside the
// devbox container there is no isolation benefit. Kept here as reference;
// to enable it, copy/symlink this file into `~/.pi/agent/extensions/`.
export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "code_execute",
    label: "Code Execution",
    description: "Execute arbitrary commands or scripts in the local environment",
    parameters: Type.Object({
      command: Type.String({ description: "Command to execute" }),
      code: Type.Optional(
        Type.String({
          description: "Optional code content to execute. If provided, written to a temp file and executed.",
        }),
      ),
      extension: Type.Optional(
        Type.String({ description: "Optional file extension for the code file (e.g. 'py', 'js', 'sh'). Defaults to 'py'." }),
      ),
    }),
    execute: async (_toolCallId, params) => {
      const { exec } = require("node:child_process");
      const { promisify } = require("node:util");
      const execPromise = promisify(exec);
      const fs = require("node:fs/promises");
      const os = require("node:os");
      const path = require("node:path");

      try {
        let cmd = params.command;
        if (params.code) {
          const ext = params.extension || "py";
          const filename = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const filePath = path.join(os.tmpdir(), filename);
          await fs.writeFile(filePath, params.code);

          if (ext === "py") {
            cmd = `python3 ${filePath}`;
          } else if (ext === "js" || ext === "ts") {
            cmd = `node ${filePath}`;
          } else {
            cmd = `bash ${filePath}`;
          }
        }

        const { stdout, stderr } = await execPromise(cmd);
        const output = [stdout, stderr].filter(Boolean).join("\n");
        return { content: [{ type: "text", text: output || "(No output)" }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.stdout || err.stderr || err.message}` }] };
      }
    },
  });
}
