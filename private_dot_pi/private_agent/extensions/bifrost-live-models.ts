// bifrost-live-models.ts — async extension factory that registers the LIVE
// Bifrost gateway catalog at startup by fetching /openai/v1/models. Bifrost
// is the default model gateway for pi (see modify_settings.json.py.tmpl); this
// keeps the model list in sync with whatever Bifrost currently exposes
// (1000+ models across providers) instead of hardcoding a static list.
//
// Mirrors opencode-live-models.ts. baseURL/apiKey match the values
// previously hardcoded in models.json.tmpl's static "bifrost" provider
// entry — sk-bifrost-local is a fixed local-gateway token, not a per-user
// secret, so it's fine to inline here same as before.
//
// To disable temporarily: --no-extensions or BIFROST_LIVE_MODELS_DISABLE=1.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BIFROST_BASE = "https://bifrost.dev.ankitson.com/openai/v1";
const BIFROST_API_KEY = "sk-bifrost-local";
const FETCH_TIMEOUT_MS = 15000;
const DEFAULT_CONTEXT_WINDOW = 128000;

type ModelEntry = { id: string; owned_by?: string; context_window?: number };
type ModelList = { object: "list"; data: ModelEntry[] };

export default async function (pi: ExtensionAPI) {
  if (process.env.BIFROST_LIVE_MODELS_DISABLE) return;

  let list: ModelList;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`${BIFROST_BASE}/models`, {
      headers: { Authorization: `Bearer ${BIFROST_API_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    list = (await res.json()) as ModelList;
  } catch (err) {
    console.error(
      `[bifrost-live-models] discovery failed (${(err as Error).message}); bifrost provider not registered this run`,
    );
    return;
  }

  // registerProvider with `models` populated REPLACES the provider's model
  // list (same contract as opencode-live-models.ts).
  pi.registerProvider("bifrost", {
    baseUrl: BIFROST_BASE,
    apiKey: BIFROST_API_KEY,
    api: "openai-completions",
    models: list.data
      .map((m) => ({
        id: m.id,
        name: prettifyName(m.id),
        reasoning: looksLikeReasoning(m.id),
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: m.context_window ?? DEFAULT_CONTEXT_WINDOW,
        maxTokens: Math.min(m.context_window ?? DEFAULT_CONTEXT_WINDOW, 128000),
      }))
      // Sort so LM Studio models surface first in pi's /model picker. The
      // picker (model-selector.js) orders by provider only and preserves
      // registration order within a provider (V8 stable sort), so this is the
      // one lever we have. rank() returns 0 for lmstudio/*, 1 otherwise;
      // Array.prototype.sort is stable in Node ≥12, so relative order within
      // each group is unchanged from the gateway catalog.
      .sort((a, b) => rank(a.id) - rank(b.id)),
  });
}

// 0 for ids that should float to the top of the picker (lmstudio/*), 1
// otherwise. Keep this a numeric comparator so Array.sort stays stable.
function rank(id: string): number {
  return id.startsWith("lmstudio/") ? 0 : 1;
}

function prettifyName(id: string): string {
  // "deepseek/deepseek-v4-flash" -> "Deepseek/Deepseek V4 Flash"
  return id
    .split(/[-_]/)
    .map((p) => (/^v?\d/.test(p) ? p.toUpperCase() : p[0]?.toUpperCase() + p.slice(1)))
    .join(" ");
}

function looksLikeReasoning(id: string): boolean {
  // Best-effort heuristic for the thinking-style UX gate. Deliberately does
  // NOT match a bare "deep" — that false-positives on "deepseek" (the
  // non-reasoning deepseek-v* chat models) and causes pi to send an
  // OpenAI-reasoning-style `developer` role message that most
  // openai-completions passthroughs (including bifrost's deepseek route)
  // reject with a 400.
  return /nemotron|reasoner|reasoning|thinking|deepseek-r\d|\bo1\b|\bo3\b/i.test(id);
}
