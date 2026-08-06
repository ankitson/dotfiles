// Cache-first Bifrost catalog. Pi loads its persisted provider catalog before
// session startup, then this extension refreshes stale data in the background.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BIFROST_BASE = "https://bifrost.dev.ankitson.com/openai/v1";
// Native bifrost list-models endpoint. Unlike the OpenAI-compat
// /openai/v1/models (which lossily converts to the OpenAI wire format and
// only emits id/object/owned_by/created/context_window), this returns the
// full bifrost model: supported_parameters, architecture, pricing, etc.
const BIFROST_MODELS_URL = "https://bifrost.dev.ankitson.com/v1/models";
// The control-plane API exposes the live routing rules. It is the source of
// truth for virtual model names such as `email-triage/main`; those names do
// not exist in any physical provider's /v1/models response.
const BIFROST_ROUTING_RULES_URL = "https://bifrost.dev.ankitson.com/api/governance/routing-rules?from_memory=true";
const BIFROST_API_KEY = "sk-bifrost-local";
const FETCH_TIMEOUT_MS = 15000;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_CONTEXT_WINDOW = 128000;
const FALLBACK_MODEL_ID = "opencode-zen/deepseek-v4-flash-free";

// Subset of bifrost's schemas.Model (see /v1/models). Everything optional —
// thin providers (nanogpt, lmstudio) only return id/owned_by/created.
type ModelEntry = {
  id: string;
  owned_by?: string;
  context_length?: number;
  context_window?: number;
  supported_parameters?: string[];
  architecture?: { input_modalities?: string[] };
  reasoning?: { supported_efforts?: string[] };
};
type ModelList = { data: ModelEntry[] };
type RoutingRule = {
  enabled?: boolean;
  // A virtual model is enumerable only when it is explicitly named by the
  // rule. Arbitrary CEL conditions (for example, header-based routing) do not
  // define a model name that Pi can safely offer in its picker.
  cel_expression?: string;
  scope?: string;
  targets?: Array<{ model?: string }>;
};
type RoutingRuleList = { rules?: RoutingRule[] };

type ThinkingLevel = "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
type ThinkingLevelMap = Partial<Record<ThinkingLevel, string | null>>;

export default function (pi: ExtensionAPI) {
  if (process.env.BIFROST_LIVE_MODELS_DISABLE) return;

  pi.registerProvider("bifrost", {
    baseUrl: BIFROST_BASE,
    apiKey: BIFROST_API_KEY,
    api: "openai-completions",
    // A fallback keeps the provider selectable if its catalog was never
    // cached. Normal startup immediately replaces this from context.stored.
    models: [toModel({ id: FALLBACK_MODEL_ID })],
    refreshModels: async (context) => {
      const cached = context.stored;
      const cachedModels = cached?.models.filter((model) => model.provider === "bifrost") ?? [];
      const fallback = cachedModels.length > 0 ? cachedModels : [toModel({ id: FALLBACK_MODEL_ID })];
      const stale = !cached?.checkedAt || Date.now() - cached.checkedAt >= CACHE_TTL_MS;

      if (!context.allowNetwork || context.signal?.aborted || (!context.force && !stale)) {
        return fallback;
      }

      try {
        const models = await fetchModels(context.signal);
        if (context.signal?.aborted || models.length === 0) return fallback;
        await context.publish({ persist: { models, checkedAt: Date.now() } });
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
    const res = await fetch(BIFROST_MODELS_URL, {
      headers: { Authorization: `Bearer ${BIFROST_API_KEY}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = (await res.json()) as ModelList;
    const physicalModels = list.data;
    // Rule discovery is additive. A transient control-plane failure must not
    // hide physical models from the picker.
    const virtualModels = await fetchVirtualModels(signal).catch(() => []);
    return mergeVirtualModels(physicalModels, virtualModels)
      .map(toModel)
      .sort((a, b) => rank(a.id) - rank(b.id));
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

async function fetchVirtualModels(signal?: AbortSignal): Promise<Array<{ id: string; targetModel?: string }>> {
  const res = await fetch(BIFROST_ROUTING_RULES_URL, {
    headers: { Authorization: `Bearer ${BIFROST_API_KEY}` },
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const list = (await res.json()) as RoutingRuleList;
  return (list.rules ?? []).flatMap(rule => advertisedModelsForRule(rule));
}

function advertisedModelsForRule(rule: RoutingRule): Array<{ id: string; targetModel?: string }> {
  // Pi has no virtual-key or request-header context while constructing its
  // picker. Global rules are the only rules unconditionally applicable to the
  // local Bifrost provider. Scoped rules stay hidden rather than leaking or
  // advertising a model that this client cannot route to.
  if (!rule.enabled || rule.scope !== "global" || !rule.cel_expression) return [];

  const ids = enumerableModelNames(rule.cel_expression);
  if (ids.length === 0) return [];
  const targetModel = rule.targets?.[0]?.model;
  return ids.map(id => ({ id, targetModel }));
}

function enumerableModelNames(expression: string): string[] {
  // Handle the two CEL forms that explicitly enumerate a model selector:
  //   model == 'email-triage/main'
  //   model in ['austin/main', 'emo/main']
  // Intentionally do not try to interpret prefix, regex, header, budget, or
  // request-type predicates: those are policies, not advertised model names.
  const ids = new Set<string>();
  for (const match of expression.matchAll(/\bmodel\s*==\s*(['"])([^'"]+)\1/g)) {
    ids.add(match[2]);
  }
  for (const match of expression.matchAll(/\bmodel\s+in\s*\[([^\]]*)\]/g)) {
    for (const entry of match[1].matchAll(/(['"])([^'"]+)\1/g)) ids.add(entry[2]);
  }
  return [...ids];
}

function mergeVirtualModels(
  physicalModels: ModelEntry[],
  virtualModels: Array<{ id: string; targetModel?: string }>,
): ModelEntry[] {
  const byID = new Map(physicalModels.map(model => [model.id, model]));
  for (const virtual of virtualModels) {
    if (byID.has(virtual.id)) continue;
    // Inherit capability metadata from the rule's primary target. The model
    // name remains the virtual selector so Bifrost evaluates the rule first.
    const target = virtual.targetModel ? byID.get(virtual.targetModel) : undefined;
    byID.set(virtual.id, { ...target, id: virtual.id });
  }
  return [...byID.values()];
}

function toModel(m: ModelEntry) {
  const contextWindow = m.context_length ?? m.context_window ?? DEFAULT_CONTEXT_WINDOW;
  const reasoning = supportsReasoning(m);
  return {
    id: m.id,
    name: prettifyName(m.id),
    provider: "bifrost",
    baseUrl: BIFROST_BASE,
    api: "openai-completions" as const,
    reasoning,
    // Level map for effort-based models. Identity for every advertised effort
    // — including max, which pi defaults to when thinking is enabled and which
    // is a genuine upstream effort level. If an upstream provider rejects an
    // advertised level, the 400 surfaces honestly instead of being silently
    // downgraded.
    ...(reasoning ? { thinkingLevelMap: inferThinkingLevels(m) } : {}),
    input: supportsImages(m) ? (["text", "image"] as const) : (["text"] as const),
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

function supportsReasoning(m: ModelEntry): boolean {
  // Structured signal first: the native endpoint mirrors OpenRouter's
  // supported_parameters ("reasoning"/"reasoning_effort") and, for some
  // providers, a reasoning block with supported_efforts.
  const params = m.supported_parameters ?? [];
  if (m.reasoning || params.includes("reasoning_effort") || params.includes("reasoning")) {
    return true;
  }
  // Thin providers (nanogpt, lmstudio, …) carry no capability fields, so
  // fall back to the name heuristic. Deliberately does NOT match a bare
  // "deep" — that false-positives on "deepseek" (the non-reasoning
  // deepseek-v* chat models) and causes pi to send an OpenAI-reasoning-style
  // `developer` role message that most openai-completions passthroughs
  // (including bifrost's deepseek route) reject with a 400.
  if (m.id.startsWith("codex/")) return true;
  return /nemotron|reasoner|reasoning|thinking|deepseek-r\d|\bo1\b|\bo3\b/i.test(m.id);
}

// Maps pi thinking levels to upstream effort strings. Structured effort list
// wins (null hides levels the model doesn't advertise); otherwise default to
// the OpenAI low/medium/high convention used by openai-completions providers.
function inferThinkingLevels(m: ModelEntry): ThinkingLevelMap {
  const efforts = m.reasoning?.supported_efforts;
  if (efforts && efforts.length > 0) {
    const available = new Set(efforts);
    const map: ThinkingLevelMap = {};
    for (const level of ["minimal", "low", "medium", "high", "xhigh", "max"] as const) {
      map[level] = available.has(level) ? level : null;
    }
    return map;
  }
  return { minimal: "minimal", low: "low", medium: "medium", high: "high" };
}

function supportsImages(m: ModelEntry): boolean {
  return m.architecture?.input_modalities?.includes("image") ?? false;
}
