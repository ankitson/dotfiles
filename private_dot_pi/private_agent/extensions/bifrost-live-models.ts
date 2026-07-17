// Cache-first Bifrost catalog. Pi loads its persisted provider catalog before
// session startup, then this extension refreshes stale data in the background.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BIFROST_BASE = "https://bifrost.dev.ankitson.com/openai/v1";
const BIFROST_API_KEY = "sk-bifrost-local";
const FETCH_TIMEOUT_MS = 15000;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_CONTEXT_WINDOW = 128000;
const FALLBACK_MODEL_ID = "opencode-zen/deepseek-v4-flash-free";

type ModelEntry = { id: string; owned_by?: string; context_window?: number };
type ModelList = { object: "list"; data: ModelEntry[] };

export default function (pi: ExtensionAPI) {
  if (process.env.BIFROST_LIVE_MODELS_DISABLE) return;

  pi.registerProvider("bifrost", {
    baseUrl: BIFROST_BASE,
    apiKey: BIFROST_API_KEY,
    api: "openai-completions",
    // A fallback keeps the provider selectable if its catalog was never
    // cached. Normal startup immediately replaces this from context.store.
    models: [toModel({ id: FALLBACK_MODEL_ID })],
    refreshModels: async (context) => {
      const cached = await context.store.read();
      const cachedModels = cached?.models.filter((model) => model.provider === "bifrost") ?? [];
      const fallback = cachedModels.length > 0 ? cachedModels : [toModel({ id: FALLBACK_MODEL_ID })];
      const stale = !cached?.checkedAt || Date.now() - cached.checkedAt >= CACHE_TTL_MS;

      if (!context.allowNetwork || context.signal?.aborted || (!context.force && !stale)) {
        return fallback;
      }

      try {
        const models = await fetchModels(context.signal);
        if (context.signal?.aborted || models.length === 0) return fallback;
        await context.store.write({ models, checkedAt: Date.now() });
        return models;
      } catch {
        // Keep the last verified catalog; a transient gateway failure must not
        // make the provider disappear or replace it with an empty list.
        return fallback;
      }
    },
  });

  // Pi starts from the cached snapshot. Refresh without awaiting so catalog
  // discovery cannot hold up the prompt; /model also performs a refresh.
  pi.on("session_start", (_event, ctx) => {
    void ctx.modelRegistry.refresh().catch(() => {});
  });
}

async function fetchModels(signal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${BIFROST_BASE}/models`, {
      headers: { Authorization: `Bearer ${BIFROST_API_KEY}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = (await res.json()) as ModelList;
    return list.data.map(toModel).sort((a, b) => rank(a.id) - rank(b.id));
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

function toModel(m: ModelEntry) {
  const contextWindow = m.context_window ?? DEFAULT_CONTEXT_WINDOW;
  return {
    id: m.id,
    name: prettifyName(m.id),
    provider: "bifrost",
    baseUrl: BIFROST_BASE,
    api: "openai-completions" as const,
    reasoning: looksLikeReasoning(m.id),
    input: ["text"] as const,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow,
    maxTokens: Math.min(contextWindow, 128000),
  };
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
