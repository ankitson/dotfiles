import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Tools Command: Displays a beautifully formatted list of all available tools and descriptions
  pi.registerCommand("tools", {
    description: "List all available tools and descriptions",
    handler: async (args, ctx) => {
      const toolList = `
🛠️ Available Tools in Pi:

Built-in:
• read: Read file contents (supports offset/limit, text & images)
• bash: Execute shell commands in the local directory (last 2000 lines)
• edit: String replacement editing with exact matching
• write: Create or overwrite files (creates parent folders)

Custom (extensions):
• web_search: Search using SearXNG (local), Brave, or Exa
• web_fetch: Fetch URL contents as clean text (strips HTML tags)
• browser_screenshot: Headless Chromium screenshot via the local Playwright
• spawn_subagent: Spawn child pi sessions autonomously
• update_goal: Mark active persistent goal as complete / report progress

Commands: /goal <objective>, /env, /tools
`;
      if (ctx && ctx.ui && typeof ctx.ui.notify === "function") {
        ctx.ui.notify(toolList);
      } else {
        console.log(toolList);
      }
    }
  });
}
