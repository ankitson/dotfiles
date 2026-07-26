// bifrost-live-models.js — keep Bifrost's physical and virtual model catalog in sync.

const BIFROST_LIVE_MODELS_TIMEOUT_MS = 15000;

export const BifrostLiveModelsPlugin = async () => {
  return {
    config: async (config) => {
      const provider = config?.provider?.bifrost;
      if (!provider) return;

      const discovered = await discoverBifrostModels(provider);
      if (!discovered || Object.keys(discovered).length === 0) return;

      // Run after generic OpenAI-compatible discovery so the picker also gets
      // virtual names registered by Bifrost routing rules.
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
    const [modelsResponse, rulesResponse] = await Promise.all([
      fetch(`${baseURL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      }),
      fetch(routingRulesURL(baseURL), {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      }),
    ]);
    clearTimeout(timer);

    if (!modelsResponse.ok) {
      console.error(`[bifrost-live-models] models HTTP ${modelsResponse.status}; skipping discovery`);
      return {};
    }

    const data = await modelsResponse.json();
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

    // Rules are Bifrost's dynamic aliasing layer. Keep the virtual selector as
    // the model ID so Bifrost evaluates the rule; inherit only its primary
    // target's picker metadata.
    if (rulesResponse.ok) {
      const rules = await rulesResponse.json();
      for (const rule of rules?.rules ?? []) {
        if (!rule?.enabled || rule?.scope !== "global") continue;
        const target = rule?.targets?.[0]?.model;
        for (const id of enumerableModelNames(rule?.cel_expression)) {
          if (out[id]) continue;
          out[id] = {
            ...(target && out[target] ? out[target] : {}),
            name: prettifyModelName(id),
          };
        }
      }
    } else {
      console.error(
        `[bifrost-live-models] routing rules HTTP ${rulesResponse.status}; physical discovery only`,
      );
    }
    return out;
  } catch (err) {
    console.error(
      `[bifrost-live-models] discovery failed (${err?.message || err}); skipping discovery`,
    );
    return {};
  }
}

function routingRulesURL(baseURL) {
  const url = new URL(baseURL);
  url.pathname = "/api/governance/routing-rules";
  url.search = "from_memory=true";
  return url.toString();
}

function enumerableModelNames(expression) {
  if (typeof expression !== "string") return [];
  const ids = new Set();
  // Do not turn prefix, regex, header, budget, or request-type policies into
  // fake finite picker entries.
  for (const match of expression.matchAll(/\bmodel\s*==\s*(['"])([^'"]+)\1/g)) {
    ids.add(match[2]);
  }
  for (const match of expression.matchAll(/\bmodel\s+in\s*\[([^\]]*)\]/g)) {
    for (const entry of match[1].matchAll(/(['"])([^'"]+)\1/g)) ids.add(entry[2]);
  }
  return [...ids];
}

function prettifyModelName(id) {
  return id
    .split(/[/.:-]/)
    .map((segment) => (segment ? segment[0]?.toUpperCase() + segment.slice(1) : segment))
    .join(" ");
}

export default BifrostLiveModelsPlugin;
