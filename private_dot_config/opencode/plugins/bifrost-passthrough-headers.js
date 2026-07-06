// Always ask Bifrost to preserve provider-specific extra params for Bifrost
// traffic. This does not force ZDR by itself; ZDR/provider pinning should be
// done with OpenRouter presets unless OpenCode gains raw body passthrough.

export default async function BifrostPassthroughHeadersPlugin() {
  return {
    "chat.headers": async (input, output) => {
      if (input?.provider?.info?.id !== "bifrost" && input?.model?.providerID !== "bifrost") return;

      output.headers["x-bf-passthrough-extra-params"] = "true";
    },
  };
}
