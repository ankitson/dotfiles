import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  // Subagent Tool: Spawns a subagent in print mode to handle sub-tasks and return the output
  pi.registerTool({
    name: "spawn_subagent",
    label: "Spawn Subagent",
    description: "Spawn a child pi agent session in non-interactive print mode to solve a sub-task",
    parameters: Type.Object({
      prompt: Type.String({ description: "The instruction or coding sub-task for the subagent to perform" })
    }),
    execute: async (toolCallId, params) => {
      const { exec } = require("node:child_process");
      const { promisify } = require("node:util");
      const execPromise = promisify(exec);

      try {
        const execCmd = `/home/ankit/.local/bin/pi -p "${params.prompt.replace(/"/g, '\\"')}"`;
        const { stdout, stderr } = await execPromise(execCmd);
        const output = [stdout, stderr].filter(Boolean).join("\n");
        return { content: [{ type: "text", text: `Subagent response:\n${output}` }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Subagent execution error: ${err.stdout || err.stderr || err.message}` }] };
      }
    }
  });
}
