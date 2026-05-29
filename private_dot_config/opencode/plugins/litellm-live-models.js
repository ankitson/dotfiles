// litellm-live-models.js — opencode plugin that fetches /v1/models from the
// LiteLLM gateway at startup and populates the `litellm` provider's model
// list. Replaces the hardcoded models map in opencode.jsonc, so adding/
// removing models in LiteLLM's config.yaml shows up here without re-rendering.
//
// Disable temporarily by deleting this file or setting
// LITELLM_LIVE_MODELS_DISABLE=1.
//
// API contract: plugin returns a Hooks object; `provider.models(provider,
// ctx)` is invoked by opencode for the matching provider id and must return
// a Record<string, ModelV2>. See @opencode-ai/plugin/dist/index.d.ts.

const LITELLM_TIMEOUT_MS = 4000;

export const LiteLLMLiveModelsPlugin = async () => {
  return {
    provider: {
      id: "litellm",
      models: async (provider /*, ctx */) => {
        if (process.env.LITELLM_LIVE_MODELS_DISABLE) return {};

        const baseURL = provider?.options?.baseURL;
        const apiKey = provider?.options?.apiKey;
        if (!baseURL || !apiKey) {
          console.error(
            "[litellm-live-models] provider has no baseURL/apiKey; skipping discovery",
          );
          return {};
        }

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), LITELLM_TIMEOUT_MS);
          const res = await fetch(`${baseURL}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const out = {};
          for (const m of data?.data ?? []) {
            out[m.id] = { name: prettify(m.id) };
          }
          return out;
        } catch (err) {
          console.error(
            `[litellm-live-models] discovery failed (${err.message}); falling back to static config`,
          );
          return {};
        }
      },
    },
  };
};

function prettify(id) {
  return id
    .split(/[-/_]/)
    .map((p) => (/^v?\d/.test(p) ? p.toUpperCase() : (p[0]?.toUpperCase() ?? "") + p.slice(1)))
    .join(" ");
}
