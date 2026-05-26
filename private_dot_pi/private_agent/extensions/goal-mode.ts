import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  let activeGoal: string | null = null;

  // Update Goal Tool
  pi.registerTool({
    name: "update_goal",
    label: "Update Goal",
    description: "Mark the active persistent goal as complete or report progress",
    parameters: Type.Object({
      status: Type.String({ description: "The status of the goal (e.g., 'completed', 'blocked', 'in_progress')" }),
      message: Type.Optional(Type.String({ description: "A summary message of the outcome" }))
    }),
    execute: async (toolCallId, params) => {
      if (params.status === "completed") {
        activeGoal = null;
        try {
          if (typeof (pi as any).setLabel === "function") {
            (pi as any).setLabel("🔋 pi active");
          }
        } catch {}
        return { content: [{ type: "text", text: `Goal marked as completed! ${params.message || ""}` }] };
      }
      return { content: [{ type: "text", text: `Goal status updated to: ${params.status}. ${params.message || ""}` }] };
    }
  });

  // Goal Command: Sets or manages session-level persistent goals
  pi.registerCommand("goal", {
    description: "Set or manage a persistent goal for this session",
    handler: async (args, ctx) => {
      const objective = args || "";
      if (!objective.trim()) {
        const statusMsg = activeGoal ? `Active Goal: ${activeGoal}` : "No active goal set. Usage: /goal <objective>";
        if (ctx && ctx.ui && typeof ctx.ui.notify === "function") {
          ctx.ui.notify(statusMsg);
        } else {
          console.log(statusMsg);
        }
        return;
      }

      if (objective === "clear" || objective === "none") {
        activeGoal = null;
        if (ctx && ctx.ui && typeof ctx.ui.notify === "function") {
          ctx.ui.notify("Goal cleared.");
        } else {
          console.log("Goal cleared.");
        }
        try {
          if (typeof (pi as any).setLabel === "function") {
            (pi as any).setLabel("🔋 pi active");
          }
        } catch {}
        return;
      }

      activeGoal = objective;
      if (ctx && ctx.ui && typeof ctx.ui.notify === "function") {
        ctx.ui.notify(`Goal set: ${activeGoal}`);
      } else {
        console.log(`Goal set: ${activeGoal}`);
      }
      
      try {
        if (typeof (pi as any).setLabel === "function") {
          (pi as any).setLabel(`🎯 Goal: ${activeGoal.substring(0, 30)}...`);
        }
      } catch {}
      
      await pi.sendMessage(`[SYSTEM] New persistent goal has been set: "${activeGoal}". Please outline your plan and begin working towards it using your available tools. Repeat tool calls as needed until you verify the goal is complete.`);
    }
  });

  // System Reminder Injector
  pi.on("message_sent" as any, (event: any) => {
    if (activeGoal && event?.message) {
      event.message += `\n\n[SYSTEM REMINDER] Active goal: "${activeGoal}". Continue working towards this goal until it is verified complete. Use the update_goal tool when done.`;
    }
  });
}
