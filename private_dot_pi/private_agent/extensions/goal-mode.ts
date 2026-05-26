import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

// Persistent "goal" mode: set a session goal, and pi re-injects it into the
// system prompt on every prompt until you complete or clear it.
export default function (pi: ExtensionAPI) {
  let activeGoal: string | null = null;
  const STATUS_ID = "goal";

  const reminder = (goal: string) =>
    `[ACTIVE GOAL] You are working toward a persistent goal: "${goal}". ` +
    `Keep going until it is verified complete, then call the update_goal tool with status "completed". ` +
    `If you get stuck, call update_goal with status "blocked" and explain why.`;

  const notify = (ctx: any, msg: string) => {
    if (ctx && ctx.ui && typeof ctx.ui.notify === "function") ctx.ui.notify(msg, "info");
    else console.log(msg);
  };

  const setGoalStatus = (ctx: any) => {
    if (!ctx || !ctx.ui || typeof ctx.ui.setStatus !== "function") return;
    ctx.ui.setStatus(STATUS_ID, activeGoal ? `🎯 ${activeGoal.slice(0, 40)}` : undefined);
  };

  // Tool the model calls to report progress / completion. ctx is the 5th arg.
  pi.registerTool({
    name: "update_goal",
    label: "Update Goal",
    description: "Report progress on the active persistent goal, or mark it complete/blocked",
    parameters: Type.Object({
      status: Type.String({ description: "'completed', 'blocked', or 'in_progress'" }),
      message: Type.Optional(Type.String({ description: "A summary of the outcome or progress" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (params.status === "completed") {
        activeGoal = null;
        setGoalStatus(ctx);
        return { content: [{ type: "text", text: `✅ Goal completed. ${params.message || ""}`.trim() }] };
      }
      return { content: [{ type: "text", text: `Goal status: ${params.status}. ${params.message || ""}`.trim() }] };
    },
  });

  // /goal <objective> | /goal clear
  pi.registerCommand("goal", {
    description: "Set or manage a persistent goal for this session",
    handler: async (args, ctx) => {
      const objective = (args || "").trim();

      if (!objective) {
        notify(ctx, activeGoal ? `Active goal: ${activeGoal}` : "No active goal. Usage: /goal <objective>  (or /goal clear)");
        return;
      }

      if (objective === "clear" || objective === "none") {
        activeGoal = null;
        setGoalStatus(ctx);
        notify(ctx, "Goal cleared.");
        return;
      }

      activeGoal = objective;
      setGoalStatus(ctx);
      notify(ctx, `Goal set: ${activeGoal}`);

      // Kick off an autonomous turn toward the goal (agent is idle here).
      await pi.sendUserMessage(
        `New persistent goal: "${activeGoal}". Outline a brief plan, then start working toward it using your tools. Call update_goal when complete or blocked.`,
      );
    },
  });

  // Fires once per user prompt, before the agent loop. The documented hook for
  // injecting context (the old `message_sent` event does not exist).
  pi.on("before_agent_start", async (event: any, ctx: any) => {
    setGoalStatus(ctx);
    if (!activeGoal) return;
    return { systemPrompt: `${event.systemPrompt}\n\n${reminder(activeGoal)}` };
  });
}
