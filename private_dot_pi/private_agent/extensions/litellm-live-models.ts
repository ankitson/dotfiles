// litellm-live-models.ts — async extension factory that registers the LIVE
// LiteLLM gateway catalog at startup by fetching /v1/models. Replaces the
// previously-hardcoded `litellm` provider/models block in models.json.tmpl, so
// pi picks up whatever LiteLLM's config.yaml currently exposes without a
// chezmoi re-render.
//
// Mirrors opencode-live-models.ts. API key is read from ~/.pi/agent/auth.json
// (chezmoi-rendered from 1Password) — falls back to $LITELLM_API_KEY env var.
//
// To disable temporarily: --no-extensions or LITELLM_LIVE_MODELS_DISABLE=1.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const LITELLM_BASE = "https://litellm.home.ankitson.com/v1";
const FETCH_TIMEOUT_MS = 4000;

type ModelEntry = { id: string; owned_by?: string };
type ModelList = { object: "list"; data: ModelEntry[] };

export default async function (pi: ExtensionAPI) {
  if (process.env.LITELLM_LIVE_MODELS_DISABLE) return;

  // Prefer env (for cases where the user wants to swap keys without re-rendering);
  // otherwise read the chezmoi-rendered auth.json.
  let apiKey: string | undefined = process.env.LITELLM_API_KEY;
  if (!apiKey) {
    try {
      const authPath = join(homedir(), ".pi/agent/auth.json");
      const auth = JSON.parse(readFileSync(authPath, "utf8")) as Record<
        string,
        { key?: string }
      >;
      apiKey = auth.litellm?.key;
    } catch {
      /* handled below */
    }
  }
  if (!apiKey) {
    console.error(
      "[litellm-live-models] no api key (auth.json missing litellm entry, and $LITELLM_API_KEY not set); skipping",
    );
    return;
  }

  let list: ModelList;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`${LITELLM_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    list = (await res.json()) as ModelList;
  } catch (err) {
    console.error(
      `[litellm-live-models] discovery failed (${(err as Error).message}); litellm provider not registered this run`,
    );
    return;
  }

  // registerProvider with `models` populated REPLACES the provider's model
  // list (same contract as opencode-live-models.ts).
  pi.registerProvider("litellm", {
    baseUrl: LITELLM_BASE,
    apiKey,
    api: "openai-completions",
    models: list.data.map((m) => ({
      id: m.id,
      name: prettifyName(m.id),
      reasoning: looksLikeReasoning(m.id),
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 200000,
      maxTokens: 128000,
    })),
  });
}

function prettifyName(id: string): string {
  // "claude-sonnet-4-5" -> "Claude Sonnet 4 5"; "gpt-4.1" -> "GPT-4.1"
  return id
    .split(/[-/_]/)
    .map((p) => (/^v?\d/.test(p) ? p.toUpperCase() : p[0]?.toUpperCase() + p.slice(1)))
    .join(" ");
}

function looksLikeReasoning(id: string): boolean {
  // Best-effort heuristic for the thinking-style UX gate.
  return /nemotron|reasoner|reasoning|thinking|o1|o3|deep/i.test(id);
}
