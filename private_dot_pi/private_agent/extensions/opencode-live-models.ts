// opencode-live-models.ts — async extension factory that registers the LIVE
// OpenCode Zen catalog at startup by fetching /v1/models. This works around the
// staleness of the bundled @earendil-works/pi-ai static catalog (which is also
// what OpenClaw uses; this extension only affects pi).
//
// Per pi's docs (packages/coding-agent/docs/custom-provider.md), an async
// factory runs before startup completes, so the discovered models are
// available to `pi --list-models` and in interactive sessions.
//
// Pi auto-discovers anything dropped under ~/.pi/agent/extensions/. The
// canonical copy lives in chezmoi at private_dot_pi/private_agent/extensions/
// — chezmoi apply lays it down on each machine.
//
// To disable temporarily: pass --no-extensions or set
// OPENCODE_LIVE_MODELS_DISABLE=1 in the env.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const ZEN_URL = "https://opencode.ai/zen/v1/models";
const FETCH_TIMEOUT_MS = 4000;

type ZenModel = { id: string; created?: number; owned_by?: string };
type ZenList = { object: "list"; data: ZenModel[] };

export default async function (pi: ExtensionAPI) {
  if (process.env.OPENCODE_LIVE_MODELS_DISABLE) return;

  let list: ZenList;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(ZEN_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    list = (await res.json()) as ZenList;
  } catch (err) {
    // Fail open: leave pi's bundled opencode provider alone if discovery fails.
    console.error(
      `[opencode-live-models] discovery failed (${(err as Error).message}); keeping bundled catalog`,
    );
    return;
  }

  // Per the doc: when `models` is supplied, it REPLACES all existing models
  // for that provider — so we mirror the live list verbatim.
  pi.registerProvider("opencode", {
    baseUrl: "https://opencode.ai/zen/v1",
    apiKey: "OPENCODE_API_KEY",
    api: "openai-completions",
    models: list.data.map((m) => ({
      id: m.id,
      name: prettifyName(m.id),
      reasoning: looksLikeReasoning(m.id),
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 204800,
      maxTokens: 128000,
    })),
  });
}

function prettifyName(id: string): string {
  // "mimo-v2.5-free" -> "MiMo V2.5 Free"
  return id
    .split("-")
    .map((p) => (/^v?\d/.test(p) ? p.toUpperCase() : p[0]?.toUpperCase() + p.slice(1)))
    .join(" ");
}

function looksLikeReasoning(id: string): boolean {
  // Best-effort heuristic; pi only uses this to gate thinking-style UX.
  return /nemotron|reasoner|reasoning|thinking|deep/i.test(id);
}
