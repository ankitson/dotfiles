// bifrost-live-models.js — keep Bifrost model list in sync with live catalog.

const BIFROST_LIVE_MODELS_TIMEOUT_MS = 15000;

export const BifrostLiveModelsPlugin = async () => {
  return {
    config: async (config) => {
      const provider = config?.provider?.bifrost;
      if (!provider) return;

      const discovered = await discoverBifrostModels(provider);
      if (!discovered || Object.keys(discovered).length === 0) return;

      // Replace the static list so model selector uses live catalog.
      provider.models = discovered;
    },
  };
};

async function discoverBifrostModels(provider) {
  if (process.env.BIFROST_LIVE_MODELS_DISABLE) return {};

  const baseURL = provider?.options?.baseURL;
  const apiKey = provider?.options?.apiKey;
  if (!baseURL || !apiKey) {
    console.error(
      "[bifrost-live-models] provider missing baseURL/apiKey; skipping discovery",
    );
    return {};
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BIFROST_LIVE_MODELS_TIMEOUT_MS);
    const res = await fetch(`${baseURL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`[bifrost-live-models] HTTP ${res.status}; skipping discovery`);
      return {};
    }

    const data = await res.json();
    const out = {};
    for (const m of data?.data ?? []) {
      if (!m?.id) continue;
      const context = m?.context_length ?? m?.contextLength;
      out[m.id] = {
        name: prettifyModelName(m.id),
        ...(context
          ? {
            limit: {
              context,
              output: m?.max_completion_tokens ?? undefined,
            },
          }
          : {}),
      };
    }
    return out;
  } catch (err) {
    console.error(
      `[bifrost-live-models] discovery failed (${err?.message || err}); skipping discovery`,
    );
    return {};
  }
}

function prettifyModelName(id) {
  return id
    .split(/[/.:-]/)
    .map((segment) => (segment ? segment[0]?.toUpperCase() + segment.slice(1) : segment))
    .join(" ");
}

export default BifrostLiveModelsPlugin;
