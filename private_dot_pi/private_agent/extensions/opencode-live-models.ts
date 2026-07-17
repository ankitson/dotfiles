// Cache-first OpenCode Zen catalog. Persisted models load before session
// startup; the live endpoint is refreshed in the background when stale.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const ZEN_URL = "https://opencode.ai/zen/v1/models";
const FETCH_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const FALLBACK_MODEL_ID = "deepseek-v4-flash-free";

type ZenModel = { id: string; created?: number; owned_by?: string };
type ZenList = { object: "list"; data: ZenModel[] };

export default function (pi: ExtensionAPI) {
  if (process.env.OPENCODE_LIVE_MODELS_DISABLE) return;

  pi.registerProvider("opencode", {
    baseUrl: "https://opencode.ai/zen/v1",
    apiKey: "OPENCODE_API_KEY",
    api: "openai-completions",
    models: [toModel({ id: FALLBACK_MODEL_ID })],
    refreshModels: async (context) => {
      const cached = await context.store.read();
      const cachedModels = cached?.models.filter((model) => model.provider === "opencode") ?? [];
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
        return fallback;
      }
    },
  });

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
    const res = await fetch(ZEN_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = (await res.json()) as ZenList;
    return list.data.map(toModel);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

function toModel(m: ZenModel) {
  return {
    id: m.id,
    name: prettifyName(m.id),
    provider: "opencode",
    baseUrl: "https://opencode.ai/zen/v1",
    api: "openai-completions" as const,
    reasoning: looksLikeReasoning(m.id),
    input: ["text"] as const,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 204800,
    maxTokens: 128000,
  };
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
