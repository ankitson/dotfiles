const MODELS_DEV_URL = 'https://models.dev/models.json'

function addCandidate(candidates, value) {
  if (!value) return
  candidates.add(value)
}

function toLowerCandidates(modelId) {
  const normalized = typeof modelId === 'string' ? modelId.toLowerCase() : ''
  const candidates = new Set()

  addCandidate(candidates, normalized)

  // OpenRouter provider routing prefixes are embedded in Bifrost model ids
  // (for example `openrouter/openai/gpt-5`), while models.dev entries often
  // omit that top-level `openrouter/` segment.
  let trimmedPrefix = normalized
  while (trimmedPrefix.includes('/')) {
    addCandidate(candidates, trimmedPrefix)
    trimmedPrefix = trimmedPrefix.slice(trimmedPrefix.indexOf('/') + 1)
  }

  // Remove policy/suffixes such as `:free`, `:thinking`, etc., and apply the
  // same stripping process to find metadata for variant base models.
  let base = normalized
  while (base.includes(':')) {
    base = base.replace(/:[^:]+$/, '')
    addCandidate(candidates, base)

    let cursor = base
    while (cursor.includes('/')) {
      addCandidate(candidates, cursor)
      cursor = cursor.slice(cursor.indexOf('/') + 1)
    }
  }

  return [...candidates]
}

async function fetchModelsDevMetadata() {
  const response = await fetch(MODELS_DEV_URL)
  if (!response.ok) {
    return new Map()
  }

  const payload = await response.json()
  if (!payload || typeof payload !== 'object') {
    return new Map()
  }

  // models.dev exposes a single JSON object keyed by model id.
  const map = new Map()
  for (const [key, value] of Object.entries(payload)) {
    if (!value || typeof value !== 'object') continue
    map.set(key.toLowerCase(), value)
  }
  return map
}

function normalizeModelConfig(modelConfig, info) {
  if (!info || !modelConfig || typeof modelConfig !== 'object') return

  if (typeof info.limit?.context === 'number' && info.limit.context > 0) {
    modelConfig.limit = {
      ...modelConfig.limit,
      context: info.limit.context,
    }
  }

  if (typeof info.limit?.input === 'number' && info.limit.input > 0) {
    modelConfig.limit = {
      ...modelConfig.limit,
      input: info.limit.input,
    }
  }

  if (typeof info.limit?.output === 'number' && info.limit.output > 0) {
    modelConfig.limit = {
      ...modelConfig.limit,
      output: info.limit.output,
    }
  }

  if (typeof info.attachment === 'boolean') {
    modelConfig.attachment = info.attachment
  }

  if (typeof info.reasoning === 'boolean') {
    modelConfig.reasoning = info.reasoning
  }

  if (!modelConfig.capabilities) {
    modelConfig.capabilities = {}
  }

  if (typeof info.attachment === 'boolean') {
    modelConfig.capabilities.attachment = info.attachment
  }

  if (typeof info.reasoning === 'boolean') {
    modelConfig.capabilities.reasoning = info.reasoning
  }

  if (typeof info.tool_call === 'boolean') {
    modelConfig.tool_call = info.tool_call
    modelConfig.capabilities.toolcall = info.tool_call
  }

  if (typeof info.structured_output === 'boolean') {
    modelConfig.structured_output = info.structured_output
  }

  if (typeof info.temperature === 'boolean') {
    modelConfig.temperature = info.temperature
  }

  if (
    Array.isArray(info.modalities?.input) ||
    Array.isArray(info.modalities?.output)
  ) {
    const input = {
      text: info.modalities?.input?.includes('text') ?? false,
      audio: info.modalities?.input?.includes('audio') ?? false,
      image: info.modalities?.input?.includes('image') ?? false,
      video: info.modalities?.input?.includes('video') ?? false,
      pdf: info.modalities?.input?.includes('pdf') ?? false,
    }

    const output = {
      text: info.modalities?.output?.includes('text') ?? false,
      audio: info.modalities?.output?.includes('audio') ?? false,
      image: info.modalities?.output?.includes('image') ?? false,
      video: info.modalities?.output?.includes('video') ?? false,
      pdf: info.modalities?.output?.includes('pdf') ?? false,
    }

    modelConfig.modalities = {
      ...(Array.isArray(info.modalities.input)
        ? { input: info.modalities.input }
        : {}),
      ...(Array.isArray(info.modalities.output)
        ? { output: info.modalities.output }
        : {}),
    }

    modelConfig.capabilities.input = input
    modelConfig.capabilities.output = output
  }

  if (typeof info.name === 'string') {
    modelConfig.name = modelConfig.name || info.name
  }
}

async function enrichBifrostModels(provider) {
  const models = provider?.models
  if (!models || typeof models !== 'object') {
    return
  }

  const modelsDev = await fetchModelsDevMetadata()
  if (!modelsDev.size) {
    return
  }

  let totalModels = 0
  let enrichedCount = 0

  for (const [modelId, modelConfig] of Object.entries(models)) {
    totalModels++
    if (!modelConfig || typeof modelConfig !== 'object') continue

    const candidates = toLowerCandidates(modelId)
    let metadata
    for (const candidate of candidates) {
      if (modelsDev.has(candidate)) {
        metadata = modelsDev.get(candidate)
        break
      }
    }

    if (!metadata) {
      continue
    }

    normalizeModelConfig(modelConfig, metadata)
    enrichedCount++
  }

  return {
    enrichedCount,
    totalModels,
  }
}

export const BifrostModelsDevEnricherPlugin = async () => ({
  config: async (config) => {
    const provider = config?.provider?.bifrost
    if (!provider) return

    try {
      await enrichBifrostModels(provider)
    } catch (error) {
      console.error('[bifrost-models-dev-enrichment] failed', error?.message || error)
    }
  },
})

export default BifrostModelsDevEnricherPlugin
