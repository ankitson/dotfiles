import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Tools Command: Displays a beautifully formatted list of all available tools and descriptions
  pi.registerCommand("tools", {
    description: "List all available tools and descriptions",
    handler: async (args, ctx) => {
      const toolList = `
🛠️ Available Tools in Pi:

• read: Read file contents (supports offset/limit, text & images)
• bash: Execute shell commands in the local directory (last 2000 lines)
• edit: String replacement editing with exact matching
• write: Create or overwrite files (creates parent folders)
• web_search: Search using SearXNG (local), Brave, or Exa
• web_fetch: Fetch URL contents as clean text (strips HTML tags)
• code_execute: Execute scripts/commands inside secure container environment
• browser_screenshot: Drive Playwright inside secure container for full page screenshot
• spawn_subagent: Spawn child pi sessions autonomously
• update_goal: Mark active persistent goal as complete / report progress
`;
      if (ctx && ctx.ui && typeof ctx.ui.notify === "function") {
        ctx.ui.notify(toolList);
      } else {
        console.log(toolList);
      }
    }
  });
}
